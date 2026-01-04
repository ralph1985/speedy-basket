import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { BottomNavigation, TouchableRipple } from 'react-native-paper';
import type { AppRepository } from '@domain/ports';
import type { Pack, ProductDetail, ProductListItem, ZoneItem } from '@domain/types';
import {
  ensurePack,
  initApp,
  loadPendingOutboxEvents,
  loadOutboxEvents,
  loadProductDetail,
  loadProducts,
  loadStoreCount,
  loadTableCounts,
  loadZones,
  recordOutboxEvent,
  resetWithPack,
} from '@domain/usecases';
import type { PackDelta, SyncEvent } from '@shared/sync';
import { API_BASE_URL, DEFAULT_STORE_ID } from '@app/config';
import DevPanel from '@presentation/components/DevPanel';
import MapPanel from '@presentation/components/MapPanel';
import ProductDetailView from '@presentation/components/ProductDetail';
import ProductList from '@presentation/components/ProductList';
import SearchPanel from '@presentation/components/SearchPanel';
import StatusHeader from '@presentation/components/StatusHeader';
import colors from '@presentation/styles/colors';

const defaultStoreId = (pack: Pack) => pack.stores[0]?.id ?? DEFAULT_STORE_ID;

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

type Props = {
  repo: AppRepository;
  pack: Pack;
};

type TabKey = 'list' | 'search' | 'map' | 'dev';
type TouchableProps = ComponentProps<typeof TouchableRipple> & { key?: string; route?: unknown };

const renderBottomTouchable = ({ key, route: _route, ...props }: TouchableProps) => (
  <TouchableRipple key={key} {...props} />
);

export default function HomeScreen({ repo, pack }: Props) {
  const [status, setStatus] = useState('Initializing...');
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [devMode] = useState(true);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [outboxEvents, setOutboxEvents] = useState<OutboxEventItem[]>([]);
  const [sentOutboxEvents, setSentOutboxEvents] = useState<OutboxEventItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'ok' | 'failed'>('idle');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<Record<string, string> | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        await initApp(repo);
        await ensurePack(repo, pack);
        const count = await loadStoreCount(repo);
        if (mounted) {
          setStoreCount(count);
          setStatus('SQLite ready');
        }
      } catch (err) {
        if (mounted) setStatus('SQLite init failed');
        console.error('SQLite init failed', err);
      }
    };
    setup();
    return () => {
      mounted = false;
    };
  }, [repo, pack]);

  const refreshDevData = useCallback(async () => {
    const counts = await loadTableCounts(repo);
    const [pending, allEvents] = await Promise.all([
      loadPendingOutboxEvents(repo, 20),
      loadOutboxEvents(repo, 50),
    ]);
    const sent = allEvents.filter((eventItem) => eventItem.sent_at);
    setTableCounts(counts);
    setOutboxEvents(pending);
    setSentOutboxEvents(sent.slice(0, 20));
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

  const refreshListData = useCallback(async () => {
    const rows = await loadProducts(repo, search);
    setProducts(rows);
  }, [repo, search]);

  const refreshZones = useCallback(async () => {
    const rows = await loadZones(repo);
    setZones(rows);
  }, [repo]);

  useEffect(() => {
    if (status === 'SQLite ready') {
      refreshListData();
      refreshZones();
      refreshDevData();
      refreshSyncMeta();
    }
  }, [status, refreshDevData, refreshListData, refreshZones, refreshSyncMeta]);

  const openDetail = async (productId: number) => {
    const item = await loadProductDetail(repo, productId);
    setDetail(item ?? null);
    setShowDetail(true);
  };

  const handleSearchChange = async (value: string) => {
    setSearch(value);
    const rows = await loadProducts(repo, value);
    setProducts(rows);
  };

  const routes = useMemo(() => {
    const base = [
      { key: 'list', title: 'Lista', focusedIcon: 'format-list-bulleted' },
      { key: 'search', title: 'Busqueda', focusedIcon: 'magnify' },
      { key: 'map', title: 'Mapa', focusedIcon: 'map-outline' },
    ];
    if (devMode) {
      base.push({ key: 'dev', title: 'Dev', focusedIcon: 'wrench-outline' });
    }
    return base;
  }, [devMode]);

  const activeTab = (routes[tabIndex]?.key ?? 'list') as TabKey;

  const handleEvent = async (type: 'FOUND' | 'NOT_FOUND') => {
    if (!detail) return;
    await recordOutboxEvent(repo, type, {
      productId: detail.id,
      storeId: defaultStoreId(pack),
      zoneId: detail.zoneId ?? null,
    });
    setStatus(`Event ${type} saved`);
    refreshDevData();
  };

  const highlightZoneId = detail?.zoneId ?? null;
  const activeZoneId = highlightZoneId ?? selectedZoneId;

  const handleSecretTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 1500);
  };

  const handleReset = async () => {
    await resetWithPack(repo, pack);
    await refreshListData();
    await refreshZones();
    await refreshDevData();
    setStatus('DB reset + pack imported');
    setShowDetail(false);
    setTabIndex(0);
  };

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      setStatus('Syncing...');
      await repo.setMetaValue('sync_last_attempt', new Date().toISOString());
      const storeId = defaultStoreId(pack);
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
          setStatus(`Sync retry ${attempt}/${maxAttempts}...`);
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
        setStatus('Sync ok (no changes)');
      } else {
        setStatus(`Sync ok (${accepted} events)`);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Sync failed', error);
      setStatus(`Sync failed: ${message}`);
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
  }, [isSyncing, pack, refreshDevData, refreshListData, refreshSyncMeta, refreshZones, repo]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <StatusHeader
          status={status}
          storeCount={storeCount}
          lastSyncAt={lastSyncAt}
          lastSyncStatus={lastSyncStatus}
          lastSyncError={lastSyncError}
          apiBaseUrl={API_BASE_URL}
          onSecretTap={handleSecretTap}
        />

        {showDetail && detail ? (
          <ProductDetailView
            detail={detail}
            onFound={() => handleEvent('FOUND')}
            onNotFound={() => handleEvent('NOT_FOUND')}
            onBack={() => setShowDetail(false)}
          />
        ) : null}

        {!showDetail && activeTab === 'list' && (
          <ProductList products={products} onSelect={openDetail} />
        )}

        {!showDetail && activeTab === 'search' && (
          <SearchPanel
            products={products}
            search={search}
            onSearchChange={handleSearchChange}
            onSelect={openDetail}
          />
        )}

        {!showDetail && activeTab === 'map' && (
          <MapPanel zones={zones} activeZoneId={activeZoneId} onSelectZone={setSelectedZoneId} />
        )}

        {!showDetail && activeTab === 'dev' && (
          <DevPanel
            apiBaseUrl={API_BASE_URL}
            tableCounts={tableCounts}
            outboxPending={outboxEvents}
            outboxSent={sentOutboxEvents}
            lastSyncStats={lastSyncStats}
            isSyncing={isSyncing}
            onRefresh={refreshDevData}
            onReset={handleReset}
            onSync={handleSync}
          />
        )}
      </View>

      <BottomNavigation.Bar
        navigationState={{ index: tabIndex, routes }}
        renderTouchable={renderBottomTouchable}
        onTabPress={({ route }) => {
          const nextIndex = routes.findIndex((item) => item.key === route.key);
          if (nextIndex >= 0) setTabIndex(nextIndex);
          setShowDetail(false);
        }}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
});
