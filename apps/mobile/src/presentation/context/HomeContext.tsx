import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppRepository } from '@domain/ports';
import type {
  OutboxEventItem,
  Pack,
  ProductDetail,
  ProductListItem,
  ZoneItem,
} from '@domain/types';
import {
  ensurePack,
  initApp,
  loadOutboxEvents,
  loadPendingOutboxEvents,
  loadProductDetail,
  loadProducts,
  loadStores,
  loadStoreCount,
  loadTableCounts,
  loadZones,
  recordOutboxEvent,
  resetWithPack,
} from '@domain/usecases';
import type { PackDelta, SyncEvent } from '@shared/sync';
import { API_BASE_URL, DEFAULT_STORE_ID } from '@app/config';
import { createTranslator, isLanguage, type Language, type TFunction } from '@presentation/i18n';

const fallbackStoreId = (pack: Pack) => pack.stores[0]?.id ?? DEFAULT_STORE_ID;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hasDeltaChanges = (delta: PackDelta) =>
  delta.stores.upserts.length > 0 ||
  delta.stores.deletes.length > 0 ||
  delta.zones.upserts.length > 0 ||
  delta.zones.deletes.length > 0 ||
  delta.products.upserts.length > 0 ||
  delta.products.deletes.length > 0 ||
  delta.product_locations.upserts.length > 0 ||
  delta.product_locations.deletes.length > 0;

async function fetchPackDelta(storeId: number, since?: string | null) {
  const query = since ? `&since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`${API_BASE_URL}/pack?storeId=${storeId}${query}`);
  if (!res.ok) throw new Error('Failed to fetch pack');
  return res.json();
}

async function postEvents(events: SyncEvent[]) {
  if (events.length === 0) return 0;
  const res = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) throw new Error('Failed to post events');
  const data = await res.json();
  return data.accepted ?? 0;
}

type HomeContextValue = {
  t: TFunction;
  language: Language;
  setLanguage: (language: Language) => void;
  statusText: string;
  stores: { id: number; name: string }[];
  activeStoreId: number | null;
  setActiveStoreId: (storeId: number) => void;
  storeCount: number | null;
  products: ProductListItem[];
  search: string;
  setSearch: (value: string) => void;
  zones: ZoneItem[];
  selectedZoneId: number | null;
  setSelectedZoneId: (zoneId: number) => void;
  tableCounts: Record<string, number>;
  outboxPending: OutboxEventItem[];
  outboxSent: OutboxEventItem[];
  lastSyncStats: Record<string, string> | null;
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'idle' | 'ok' | 'failed';
  lastSyncError: string | null;
  refreshDevData: () => Promise<void>;
  handleReset: () => Promise<void>;
  handleSync: () => Promise<void>;
  loadDetail: (productId: number) => Promise<ProductDetail | null>;
  recordEvent: (detail: ProductDetail, type: 'FOUND' | 'NOT_FOUND') => Promise<void>;
};

type ProviderProps = {
  repo: AppRepository;
  pack: Pack;
  children: ReactNode;
};

const HomeContext = createContext<HomeContextValue | null>(null);

export const useHome = () => {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error('HomeContext not available');
  return ctx;
};

export const HomeProvider = ({ repo, pack, children }: ProviderProps) => {
  const [statusKey, setStatusKey] = useState('status.initializing');
  const [statusParams, setStatusParams] = useState<Record<string, string | number>>({});
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearchValue] = useState('');
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [outboxPending, setOutboxPending] = useState<OutboxEventItem[]>([]);
  const [outboxSent, setOutboxSent] = useState<OutboxEventItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'ok' | 'failed'>('idle');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<Record<string, string> | null>(null);
  const [language, setLanguage] = useState<Language>('es');
  const [isReady, setIsReady] = useState(false);
  const t = useMemo(() => createTranslator(language), [language]);
  const statusText = t(statusKey, statusParams);

  const refreshDevData = useCallback(async () => {
    const counts = await loadTableCounts(repo);
    const [pending, allEvents] = await Promise.all([
      loadPendingOutboxEvents(repo, 20),
      loadOutboxEvents(repo, 50),
    ]);
    const sent = allEvents.filter((eventItem) => eventItem.sent_at);
    setTableCounts(counts);
    setOutboxPending(pending);
    setOutboxSent(sent.slice(0, 20));
  }, [repo]);

  const refreshSyncMeta = useCallback(async () => {
    const [at, status, error] = await Promise.all([
      repo.getMetaValue('sync_last_at'),
      repo.getMetaValue('sync_last_status'),
      repo.getMetaValue('sync_last_error'),
    ]);
    setLastSyncAt(at);
    if (status === 'ok' || status === 'failed') {
      setLastSyncStatus(status);
    } else {
      setLastSyncStatus('idle');
    }
    setLastSyncError(error && error.trim().length > 0 ? error : null);
  }, [repo]);

  const refreshListData = useCallback(
    async (value = search, storeId = activeStoreId) => {
      if (!storeId) return;
      const rows = await loadProducts(repo, value, storeId);
      setProducts(rows);
    },
    [activeStoreId, repo, search]
  );

  const refreshZones = useCallback(
    async (storeId = activeStoreId) => {
      if (!storeId) return;
      const rows = await loadZones(repo, storeId);
      setZones(rows);
    },
    [activeStoreId, repo]
  );

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        await initApp(repo);
        await ensurePack(repo, pack);
        const [count, storedLanguage, storedActiveStoreId] = await Promise.all([
          loadStoreCount(repo),
          repo.getMetaValue('language'),
          repo.getMetaValue('active_store_id'),
        ]);
        const storeRows = await loadStores(repo);
        const parsedStoreId = storedActiveStoreId ? Number(storedActiveStoreId) : null;
        const availableStoreIds = new Set(storeRows.map((store) => store.id));
        const nextStoreId =
          (parsedStoreId && availableStoreIds.has(parsedStoreId) && parsedStoreId) ||
          storeRows[0]?.id ||
          fallbackStoreId(pack);
        if (mounted) {
          setStoreCount(count);
          setStores(storeRows);
          setActiveStoreIdState(nextStoreId);
          if (isLanguage(storedLanguage)) {
            setLanguage(storedLanguage);
          }
          if (nextStoreId) {
            repo.setMetaValue('active_store_id', `${nextStoreId}`).catch((error) => {
              console.error('Failed to persist active store', error);
            });
          }
          setStatusKey('status.sqliteReady');
          setStatusParams({});
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setStatusKey('status.sqliteInitFailed');
          setStatusParams({});
        }
        console.error('SQLite init failed', err);
      }
    };
    setup();
    return () => {
      mounted = false;
    };
  }, [pack, repo]);

  useEffect(() => {
    if (isReady) {
      refreshListData();
      refreshZones();
      refreshDevData();
      refreshSyncMeta();
    }
  }, [isReady, refreshDevData, refreshListData, refreshSyncMeta, refreshZones]);

  useEffect(() => {
    if (isReady) {
      refreshListData();
      refreshZones();
    }
  }, [activeStoreId, isReady, refreshListData, refreshZones]);

  useEffect(() => {
    if (isReady) {
      repo.setMetaValue('language', language).catch((error) => {
        console.error('Failed to persist language', error);
      });
    }
  }, [isReady, language, repo]);

  const setSearch = useCallback(
    async (value: string) => {
      setSearchValue(value);
      await refreshListData(value);
    },
    [refreshListData]
  );

  const setActiveStoreId = useCallback(
    async (storeId: number) => {
      setActiveStoreIdState(storeId);
      await repo.setMetaValue('active_store_id', `${storeId}`);
      await refreshListData(search, storeId);
      await refreshZones(storeId);
    },
    [refreshListData, refreshZones, repo, search]
  );

  const handleReset = useCallback(async () => {
    await resetWithPack(repo, pack);
    await refreshListData();
    await refreshZones();
    await refreshDevData();
    setStatusKey('status.resetPack');
    setStatusParams({});
  }, [pack, refreshDevData, refreshListData, refreshZones, repo]);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      setStatusKey('status.syncing');
      setStatusParams({});
      await repo.setMetaValue('sync_last_attempt', new Date().toISOString());
      const storeId = activeStoreId ?? fallbackStoreId(pack);
      let accepted = 0;
      let hasChanges = false;
      const syncStartedAt = Date.now();
      const pendingBefore = await repo.listPendingOutboxEvents(100);
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const since = await repo.getPackVersion();
          const delta = (await fetchPackDelta(storeId, since)) as PackDelta;
          hasChanges = hasDeltaChanges(delta);
          await repo.applyPackDelta(delta);

          const pending = await repo.listPendingOutboxEvents(100);
          const events = pending.map((eventItem) => {
            const payload = JSON.parse(eventItem.payload_json) as Record<string, unknown>;
            if (!payload.storeId) {
              payload.storeId = storeId;
            }
            return {
              id: eventItem.id,
              type: eventItem.type,
              created_at: eventItem.created_at,
              payload,
            };
          }) as SyncEvent[];
          accepted = await postEvents(events);
          if (accepted > 0) {
            await repo.markOutboxEventsSent(pending.slice(0, accepted).map((item) => item.id));
          }
          if (pending.length > 0) {
            hasChanges = true;
          }
          const pendingAfter = await repo.listPendingOutboxEvents(100);
          const durationMs = Date.now() - syncStartedAt;
          setLastSyncStats({
            accepted: `${accepted}`,
            pending_before: `${pendingBefore.length}`,
            pending_after: `${pendingAfter.length}`,
            delta_stores: `${delta.stores.upserts.length}/${delta.stores.deletes.length}`,
            delta_zones: `${delta.zones.upserts.length}/${delta.zones.deletes.length}`,
            delta_products: `${delta.products.upserts.length}/${delta.products.deletes.length}`,
            delta_locations: `${delta.product_locations.upserts.length}/${delta.product_locations.deletes.length}`,
            duration_ms: `${durationMs}`,
          });
          break;
        } catch (error) {
          if (attempt >= maxAttempts) {
            throw error;
          }
          const backoff = 400 * attempt;
          setStatusKey('status.syncRetry');
          setStatusParams({ attempt, max: maxAttempts });
          await sleep(backoff);
        }
      }

      await refreshListData();
      await refreshZones();
      await refreshDevData();
      const now = new Date().toISOString();
      await repo.setMetaValue('sync_last_at', now);
      await repo.setMetaValue('sync_last_status', 'ok');
      await repo.setMetaValue('sync_last_error', '');
      setLastSyncAt(now);
      setLastSyncStatus('ok');
      setLastSyncError(null);
      if (!hasChanges) {
        setStatusKey('status.syncOkNoChanges');
        setStatusParams({});
      } else {
        setStatusKey('status.syncOkEvents');
        setStatusParams({ accepted });
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setStatusKey('status.syncFailed');
      setStatusParams({ message });
      const now = new Date().toISOString();
      await repo.setMetaValue('sync_last_at', now);
      await repo.setMetaValue('sync_last_status', 'failed');
      await repo.setMetaValue('sync_last_error', message);
      setLastSyncAt(now);
      setLastSyncStatus('failed');
      setLastSyncError(message);
      await refreshDevData();
      await refreshSyncMeta();
      setLastSyncStats(null);
    } finally {
      setIsSyncing(false);
    }
  }, [
    activeStoreId,
    isSyncing,
    pack,
    refreshDevData,
    refreshListData,
    refreshSyncMeta,
    refreshZones,
    repo,
  ]);

  const loadDetail = useCallback(
    async (productId: number) => {
      const storeId = activeStoreId ?? fallbackStoreId(pack);
      return loadProductDetail(repo, productId, storeId);
    },
    [activeStoreId, pack, repo]
  );

  const recordEvent = useCallback(
    async (detail: ProductDetail, type: 'FOUND' | 'NOT_FOUND') => {
      const storeId = activeStoreId ?? fallbackStoreId(pack);
      await recordOutboxEvent(repo, type, {
        productId: detail.id,
        storeId,
        zoneId: detail.zoneId ?? null,
      });
      setStatusKey('status.eventSaved');
      setStatusParams({ type: t(`eventType.${type}`) });
      refreshDevData();
    },
    [activeStoreId, pack, refreshDevData, repo, t]
  );

  const value = useMemo<HomeContextValue>(
    () => ({
      t,
      language,
      setLanguage,
      statusText,
      stores,
      activeStoreId,
      setActiveStoreId,
      storeCount,
      products,
      search,
      setSearch,
      zones,
      selectedZoneId,
      setSelectedZoneId,
      tableCounts,
      outboxPending,
      outboxSent,
      lastSyncStats,
      isSyncing,
      lastSyncAt,
      lastSyncStatus,
      lastSyncError,
      refreshDevData,
      handleReset,
      handleSync,
      loadDetail,
      recordEvent,
    }),
    [
      handleReset,
      handleSync,
      isSyncing,
      language,
      lastSyncAt,
      lastSyncError,
      lastSyncStats,
      lastSyncStatus,
      loadDetail,
      outboxPending,
      outboxSent,
      products,
      recordEvent,
      refreshDevData,
      search,
      selectedZoneId,
      setSearch,
      statusText,
      stores,
      activeStoreId,
      setActiveStoreId,
      storeCount,
      t,
      tableCounts,
      zones,
    ]
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
};
