import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppRepository } from '@domain/ports';
import type {
  OutboxEventItem,
  Pack,
  ProductDetail,
  ProductListItem,
  ShoppingList,
  ShoppingListItem,
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
import { API_BASE_URL, DEFAULT_STORE_ID, SUPABASE_ANON_KEY, SUPABASE_URL } from '@app/config';
import { supabase } from '@app/supabase';
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
  delta.product_translations.upserts.length > 0 ||
  delta.product_translations.deletes.length > 0 ||
  delta.product_variants.upserts.length > 0 ||
  delta.product_variants.deletes.length > 0 ||
  delta.product_locations.upserts.length > 0 ||
  delta.product_locations.deletes.length > 0;

async function fetchPackDelta(storeId: number, authToken: string, since?: string | null) {
  const query = since ? `&since=${encodeURIComponent(since)}` : '';
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/pack?storeId=${storeId}${query}`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to fetch pack');
  return res.json();
}

async function postEvents(events: SyncEvent[], authToken: string) {
  if (events.length === 0) return 0;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ events }),
  });
  if (!res.ok) throw new Error('Failed to post events');
  const data = await res.json();
  return data.accepted ?? 0;
}

async function postProduct(
  payload: { name: string; category?: string | null; locale?: string },
  authToken: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
}

async function postList(payload: { name: string }, authToken: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/lists`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
}

async function fetchLists(authToken: string) {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/lists`, { headers });
  if (!res.ok) throw new Error('Failed to fetch lists');
  return res.json() as Promise<Array<{ id: number; name: string; role?: string }>>;
}

async function fetchListItems(listId: number, authToken: string, locale: string) {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(
    `${API_BASE_URL}/lists/${listId}/items?lang=${locale === 'en' ? 'en' : 'es'}`,
    { headers }
  );
  if (!res.ok) throw new Error('Failed to fetch list items');
  return res.json() as Promise<
    Array<{
      id: number;
      listId: number;
      productId: number | null;
      label: string;
      qty: string | null;
      checked: boolean;
    }>
  >;
}

async function postListItem(
  listId: number,
  payload: { productId?: number; label?: string; qty?: string | null },
  authToken: string,
  locale: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/lists/${listId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, locale }),
  });
  if (!res.ok) throw new Error('Failed to add list item');
  return res.json();
}

async function patchListItem(
  listId: number,
  itemId: number,
  checked: boolean,
  authToken: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/lists/${listId}/items/${itemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ checked }),
  });
  if (!res.ok) throw new Error('Failed to update list item');
  return res.json();
}

async function deleteList(listId: number, authToken: string) {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE_URL}/lists/${listId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error('Failed to delete list');
  }
}

type HomeContextValue = {
  t: TFunction;
  language: Language;
  setLanguage: (language: Language) => void;
  authToken: string;
  setAuthToken: (token: string) => void;
  authStatus: 'idle' | 'loading' | 'error';
  authError: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  statusText: string;
  stores: { id: number; name: string }[];
  activeStoreId: number | null;
  setActiveStoreId: (storeId: number) => void;
  storeCount: number | null;
  products: ProductListItem[];
  search: string;
  setSearch: (value: string) => void;
  categories: string[];
  lists: ShoppingList[];
  activeListId: number | null;
  listItems: ShoppingListItem[];
  pendingProductsCount: number;
  pendingListItemsCount: number;
  pendingListsCount: number;
  setActiveListId: (listId: number) => void;
  createShoppingList: (name: string) => Promise<void>;
  addShoppingListItem: (payload: { productId?: number; label?: string }) => Promise<void>;
  toggleShoppingListItem: (itemId: number, checked: boolean) => Promise<void>;
  getShoppingListItemCount: (listId: number) => Promise<number>;
  deleteShoppingList: (listId: number) => Promise<void>;
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
  devUnlocked: boolean;
  registerDevTap: () => void;
  handleReset: () => Promise<void>;
  handleSync: () => Promise<void>;
  loadDetail: (productId: number) => Promise<ProductDetail | null>;
  recordEvent: (detail: ProductDetail, type: 'FOUND' | 'NOT_FOUND') => Promise<void>;
  createProduct: (name: string, category?: string | null) => Promise<void>;
  refreshCategories: () => Promise<void>;
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
  const [categories, setCategories] = useState<string[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListIdState] = useState<number | null>(null);
  const [listItems, setListItems] = useState<ShoppingListItem[]>([]);
  const [pendingProductsCount, setPendingProductsCount] = useState(0);
  const [pendingListItemsCount, setPendingListItemsCount] = useState(0);
  const [pendingListsCount, setPendingListsCount] = useState(0);
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
  const [devUnlocked, setDevUnlocked] = useState(false);
  const devTapCount = useRef(0);
  const devTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<Record<string, string> | null>(null);
  const [language, setLanguage] = useState<Language>('es');
  const [authToken, setAuthTokenState] = useState('');
  const [authRefreshToken, setAuthRefreshToken] = useState('');
  const [authExpiresAt, setAuthExpiresAt] = useState<number | null>(null);
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const t = useMemo(() => createTranslator(language), [language]);
  const statusText = t(statusKey, statusParams);
  const isAuthenticated = authToken.trim().length > 0;

  const refreshDevData = useCallback(async () => {
    const counts = await loadTableCounts(repo);
    const [pending, allEvents, pendingProducts, pendingListItems, pendingLists] = await Promise.all([
      loadPendingOutboxEvents(repo, 20),
      loadOutboxEvents(repo, 50),
      repo.listProductsNeedingSync(language),
      repo.listShoppingListItemsNeedingSync(),
      repo.listShoppingListsNeedingSync(),
    ]);
    const sent = allEvents.filter((eventItem) => eventItem.sent_at);
    setTableCounts(counts);
    setOutboxPending(pending);
    setOutboxSent(sent.slice(0, 20));
    setPendingProductsCount(pendingProducts.length);
    setPendingListItemsCount(pendingListItems.length);
    setPendingListsCount(pendingLists.length);
  }, [language, repo]);

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
      const effectiveStoreId = storeId ?? fallbackStoreId(pack);
      const rows = await loadProducts(repo, value, effectiveStoreId, language);
      setProducts(rows);
    },
    [activeStoreId, language, pack, repo, search]
  );

  const refreshZones = useCallback(
    async (storeId = activeStoreId) => {
      const effectiveStoreId = storeId ?? fallbackStoreId(pack);
      const rows = await loadZones(repo, effectiveStoreId);
      setZones(rows);
    },
    [activeStoreId, pack, repo]
  );

  const refreshCategories = useCallback(async () => {
    try {
      const data = await repo.listCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories', error);
      setCategories([]);
    }
  }, [repo]);

  const syncProductsIfNeeded = useCallback(
    async () => {
      const token = authToken.trim();
      if (!token) return;
      const pending = await repo.listProductsNeedingSync(language);
      for (const product of pending) {
        try {
          const created = await postProduct(
            { name: product.name, category: product.category, locale: language },
            token
          );
          const remoteId = Number(created.id);
          if (!Number.isNaN(remoteId)) {
            await repo.replaceProductId(product.id, remoteId);
          }
        } catch (error) {
          console.error('Failed to sync product', error);
        }
      }
    },
    [authToken, language, repo]
  );

  const refreshLists = useCallback(async () => {
    const data = await repo.listShoppingLists();
      const mapped = data.map((row) => ({
        id: Number(row.id),
        name: row.name,
        role: row.role ?? 'owner',
      }));
    setLists(mapped);
    if (mapped.length > 0) {
      const hasActive = activeListId
        ? mapped.some((list) => list.id === activeListId)
        : false;
      if (!hasActive) {
        setActiveListIdState(mapped[0].id);
      }
    }
  }, [activeListId, repo]);

  const refreshListItems = useCallback(
    async (listId = activeListId) => {
      if (!listId) {
        setListItems([]);
        return;
      }
      const data = await repo.listShoppingListItems(listId, language);
      setListItems(
        data.map((row) => ({
          id: Number(row.id),
          listId: Number(row.listId),
          productId: row.productId ? Number(row.productId) : null,
          label: row.label,
          qty: row.qty ?? null,
          checked: Boolean(row.checked),
          productName: row.productName ?? null,
        }))
      );
    },
    [activeListId, language, repo]
  );

  const syncListsIfNeeded = useCallback(
    async () => {
      const token = authToken.trim();
      if (!token) return;

      const pendingLists = await repo.listShoppingListsNeedingSync();
      for (const list of pendingLists) {
        try {
          const created = await postList({ name: list.name }, token);
          const remoteId = Number(created.id);
          if (!Number.isNaN(remoteId)) {
            await repo.setShoppingListRemoteId(list.id, remoteId);
          }
        } catch (error) {
          console.error('Failed to sync list', error);
        }
      }

      const pendingItems = await repo.listShoppingListItemsNeedingSync();
      for (const item of pendingItems) {
        const remoteListId = await repo.getShoppingListRemoteId(item.listId);
        if (!remoteListId) continue;
        if (!item.remoteId) {
          try {
            const created = await postListItem(
              remoteListId,
              { productId: item.productId ?? undefined, label: item.label ?? undefined, qty: item.qty ?? undefined },
              token,
              language
            );
            const remoteItemId = Number(created.id);
            if (!Number.isNaN(remoteItemId)) {
              await repo.setShoppingListItemRemoteId(item.id, remoteItemId);
            }
          } catch (error) {
            console.error('Failed to sync list item', error);
          }
        } else if (!item.syncedAt || item.updatedAt > item.syncedAt) {
          try {
            await patchListItem(remoteListId, item.remoteId, Boolean(item.checked), token);
            await repo.markShoppingListItemSynced(item.id);
          } catch (error) {
            console.error('Failed to sync list item update', error);
          }
        }
      }
    },
    [authToken, language, repo]
  );

  const pullListsIfNeeded = useCallback(
    async () => {
      const token = authToken.trim();
      if (!token) return;
      const listsFromServer = await fetchLists(token);
      for (const list of listsFromServer) {
        const localListId = await repo.upsertShoppingListFromRemote({
          remoteId: Number(list.id),
          name: list.name,
          role: list.role ?? 'viewer',
        });
        const items = await fetchListItems(Number(list.id), token, language);
        for (const item of items) {
          await repo.upsertShoppingListItemFromRemote({
            listId: localListId,
            remoteId: Number(item.id),
            productId: item.productId ? Number(item.productId) : null,
            label: item.label,
            qty: item.qty ?? null,
            checked: Boolean(item.checked),
          });
        }
      }
      await refreshLists();
      await refreshListItems();
    },
    [authToken, language, refreshListItems, refreshLists, repo]
  );

  const setActiveListId = useCallback(
    (listId: number) => {
      setActiveListIdState(listId);
      repo.setMetaValue('active_list_id', `${listId}`).catch((error) => {
        console.error('Failed to persist active list', error);
      });
    },
    [repo]
  );

  const createShoppingList = useCallback(
    async (name: string) => {
      try {
        const created = await repo.createShoppingList({ name });
        await refreshLists();
        setActiveListIdState(Number(created.id));
        setStatusKey('status.listCreated');
        setStatusParams({ name: created.name });
        await refreshListItems(Number(created.id));
      } catch (error) {
        const message = getErrorMessage(error);
        setStatusKey('status.listCreateFailed');
        setStatusParams({ message });
      }
    },
    [refreshListItems, refreshLists, repo]
  );

  const getShoppingListItemCount = useCallback(
    async (listId: number) => {
      return repo.getShoppingListItemCount(listId);
    },
    [repo]
  );

  const deleteShoppingList = useCallback(
    async (listId: number) => {
      try {
        const list = (await repo.listShoppingLists()).find((row) => row.id === listId);
        if (list && list.role !== 'owner') {
          setStatusKey('status.listDeleteFailed');
          setStatusParams({ message: 'Not owner' });
          return;
        }
        await repo.markShoppingListDeleted(listId);
        await refreshLists();
        if (activeListId === listId) {
          const next = await repo.listShoppingLists();
          setActiveListIdState(next[0]?.id ?? null);
          await refreshListItems(next[0]?.id ?? null);
        }
        setStatusKey('status.listDeleted');
        setStatusParams({});
      } catch (error) {
        const message = getErrorMessage(error);
        setStatusKey('status.listDeleteFailed');
        setStatusParams({ message });
      }
    },
    [activeListId, refreshListItems, refreshLists, repo]
  );

  const addShoppingListItem = useCallback(
    async (payload: { productId?: number; label?: string }) => {
      const listId = activeListId;
      if (!listId) {
        setStatusKey('status.listSelectRequired');
        setStatusParams({});
        return;
      }
      try {
        await repo.addShoppingListItem(listId, payload);
        await refreshListItems(listId);
        setStatusKey('status.listItemAdded');
        setStatusParams({});
      } catch (error) {
        const message = getErrorMessage(error);
        setStatusKey('status.listItemFailed');
        setStatusParams({ message });
      }
    },
    [activeListId, refreshListItems, repo]
  );

  const toggleShoppingListItem = useCallback(
    async (itemId: number, checked: boolean) => {
      const listId = activeListId;
      if (!listId) return;
      const previous = listItems;
      setListItems((items) =>
        items.map((item) => (item.id === itemId ? { ...item, checked } : item))
      );
      try {
        await repo.toggleShoppingListItem(itemId, checked);
      } catch (error) {
        setListItems(previous);
        const message = getErrorMessage(error);
        setStatusKey('status.listToggleFailed');
        setStatusParams({ message });
      }
    },
    [activeListId, listItems, repo]
  );

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        await initApp(repo);
        await ensurePack(repo, pack);
        const [
          count,
          storedLanguage,
          storedActiveStoreId,
          storedToken,
          storedRefreshToken,
          storedExpiresAt,
          storedActiveListId,
        ] = await Promise.all([
          loadStoreCount(repo),
          repo.getMetaValue('language'),
          repo.getMetaValue('active_store_id'),
          repo.getMetaValue('auth_token'),
          repo.getMetaValue('auth_refresh_token'),
          repo.getMetaValue('auth_expires_at'),
          repo.getMetaValue('active_list_id'),
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
          if (storedToken) {
            setAuthTokenState(storedToken);
          }
          if (storedRefreshToken) {
            setAuthRefreshToken(storedRefreshToken);
          }
          if (storedExpiresAt) {
            const parsedExpires = Number(storedExpiresAt);
            setAuthExpiresAt(Number.isNaN(parsedExpires) ? null : parsedExpires);
          }
          if (storedActiveListId) {
            const parsedListId = Number(storedActiveListId);
            if (!Number.isNaN(parsedListId)) {
              setActiveListIdState(parsedListId);
            }
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

  const clearAuth = useCallback(async () => {
    setAuthTokenState('');
    setAuthRefreshToken('');
    setAuthExpiresAt(null);
    await Promise.all([
      repo.setMetaValue('auth_token', ''),
      repo.setMetaValue('auth_refresh_token', ''),
      repo.setMetaValue('auth_expires_at', ''),
    ]);
  }, [repo]);

  const refreshSessionIfNeeded = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    if (!authRefreshToken || !authExpiresAt) return;
    const now = Math.floor(Date.now() / 1000);
    if (authExpiresAt > now + 30) return;
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: authRefreshToken,
    });
    if (error || !data.session) {
      await clearAuth();
      return;
    }
    const { access_token, refresh_token, expires_at } = data.session;
    setAuthTokenState(access_token ?? '');
    setAuthRefreshToken(refresh_token ?? '');
    setAuthExpiresAt(expires_at ?? null);
    await Promise.all([
      repo.setMetaValue('auth_token', access_token ?? ''),
      repo.setMetaValue('auth_refresh_token', refresh_token ?? ''),
      repo.setMetaValue('auth_expires_at', expires_at ? `${expires_at}` : ''),
    ]);
  }, [authExpiresAt, authRefreshToken, clearAuth, repo]);

  useEffect(() => {
    if (isReady) {
      refreshListData();
      refreshZones();
      refreshDevData();
      refreshSyncMeta();
      refreshCategories();
      refreshSessionIfNeeded().catch((error) => {
        console.error('Auth refresh failed', error);
      });
    }
  }, [
    isReady,
    refreshCategories,
    refreshDevData,
    refreshListData,
    refreshSyncMeta,
    refreshZones,
    refreshSessionIfNeeded,
  ]);

  useEffect(() => {
    if (isReady) {
      refreshLists();
    }
  }, [isReady, refreshLists]);

  useEffect(() => {
    if (isReady) {
      refreshListData();
      refreshZones();
    }
  }, [activeStoreId, isReady, refreshListData, refreshZones]);

  useEffect(() => {
    if (isReady) {
      refreshListItems();
    }
  }, [activeListId, isReady, refreshListItems]);

  useEffect(() => {
    if (isReady) {
      repo.setMetaValue('language', language).catch((error) => {
        console.error('Failed to persist language', error);
      });
    }
  }, [isReady, language, repo]);

  const setAuthToken = useCallback(
    async (token: string) => {
      const trimmed = token.trim();
      setAuthTokenState(trimmed);
      await repo.setMetaValue('auth_token', trimmed);
    },
    [repo]
  );

  const registerDevTap = useCallback(() => {
    devTapCount.current += 1;
    if (devTapTimer.current) {
      clearTimeout(devTapTimer.current);
    }
    if (devTapCount.current >= 5) {
      devTapCount.current = 0;
      setDevUnlocked(true);
      return;
    }
    devTapTimer.current = setTimeout(() => {
      devTapCount.current = 0;
    }, 1200);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setAuthStatus('loading');
      setAuthError(null);
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setAuthStatus('error');
        setAuthError(t('login.configMissing'));
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setAuthStatus('error');
        setAuthError(error?.message ?? t('login.failed'));
        return;
      }
      const { access_token, refresh_token, expires_at } = data.session;
      setAuthTokenState(access_token ?? '');
      setAuthRefreshToken(refresh_token ?? '');
      setAuthExpiresAt(expires_at ?? null);
      await Promise.all([
        repo.setMetaValue('auth_token', access_token ?? ''),
        repo.setMetaValue('auth_refresh_token', refresh_token ?? ''),
        repo.setMetaValue('auth_expires_at', expires_at ? `${expires_at}` : ''),
      ]);
      setAuthStatus('idle');
      await refreshCategories();
      await pullListsIfNeeded();
    },
    [pullListsIfNeeded, refreshCategories, repo, t]
  );

  const signOut = useCallback(async () => {
    await clearAuth();
    setAuthStatus('idle');
    setAuthError(null);
  }, [clearAuth]);

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
      const token = authToken.trim();
      if (!token) {
        setStatusKey('status.authRequired');
        setStatusParams({});
        const now = new Date().toISOString();
        await repo.setMetaValue('sync_last_at', now);
        await repo.setMetaValue('sync_last_status', 'failed');
        await repo.setMetaValue('sync_last_error', 'Auth token required');
        setLastSyncAt(now);
        setLastSyncStatus('failed');
        setLastSyncError('Auth token required');
        setIsSyncing(false);
        return;
      }
      let accepted = 0;
      let hasChanges = false;
      const syncStartedAt = Date.now();
      const pendingBefore = await repo.listPendingOutboxEvents(100);
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const since = await repo.getPackVersion();
          const delta = (await fetchPackDelta(storeId, token, since)) as PackDelta;
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
          accepted = await postEvents(events, token);
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
            delta_translations: `${delta.product_translations.upserts.length}/${delta.product_translations.deletes.length}`,
            delta_variants: `${delta.product_variants.upserts.length}/${delta.product_variants.deletes.length}`,
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
      await syncProductsIfNeeded();
      await pullListsIfNeeded();
      const pendingDeletes = await repo.listShoppingListsPendingDelete();
      for (const list of pendingDeletes) {
        const token = authToken.trim();
        if (!list.remoteId) {
          await repo.purgeShoppingList(list.id);
          continue;
        }
        if (!token) {
          continue;
        }
        try {
          await deleteList(list.remoteId, token);
          await repo.purgeShoppingList(list.id);
        } catch (error) {
          console.error('Failed to delete list remotely', error);
        }
      }
      await syncListsIfNeeded();
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
    authToken,
    isSyncing,
    pack,
    refreshDevData,
    refreshListData,
    refreshSyncMeta,
    refreshZones,
    pullListsIfNeeded,
    syncListsIfNeeded,
    syncProductsIfNeeded,
    repo,
  ]);

  const loadDetail = useCallback(
    async (productId: number) => {
      const storeId = activeStoreId ?? fallbackStoreId(pack);
      return loadProductDetail(repo, productId, storeId, language);
    },
    [activeStoreId, language, pack, repo]
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

  const createProduct = useCallback(
    async (name: string, category?: string | null) => {
      try {
        await repo.createLocalProduct({
          name,
          category: category ?? null,
          locale: language,
        });
        await refreshCategories();
        await refreshListData(search, activeStoreId);
        await refreshDevData();
        setStatusKey('status.productCreated');
        setStatusParams({ name });
      } catch (error) {
        const message = getErrorMessage(error);
        setStatusKey('status.productCreateFailed');
        setStatusParams({ message });
      }
    },
    [activeStoreId, language, refreshCategories, refreshDevData, refreshListData, repo, search]
  );

  const value = useMemo<HomeContextValue>(
    () => ({
      t,
      language,
      setLanguage,
      authToken,
      setAuthToken,
      authStatus,
      authError,
      isAuthenticated,
      signIn,
      signOut,
      statusText,
      stores,
      activeStoreId,
      setActiveStoreId,
      storeCount,
      products,
      search,
      setSearch,
      categories,
      lists,
      activeListId,
      listItems,
      pendingProductsCount,
      pendingListItemsCount,
      pendingListsCount,
      setActiveListId,
      createShoppingList,
      addShoppingListItem,
      toggleShoppingListItem,
      getShoppingListItemCount,
      deleteShoppingList,
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
      devUnlocked,
      registerDevTap,
      handleReset,
      handleSync,
      loadDetail,
      recordEvent,
      createProduct,
      refreshCategories,
    }),
    [
      authToken,
      authStatus,
      authError,
      isAuthenticated,
      signIn,
      signOut,
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
      devUnlocked,
      registerDevTap,
      products,
      recordEvent,
      createProduct,
      categories,
      lists,
      activeListId,
      listItems,
      pendingProductsCount,
      pendingListItemsCount,
      pendingListsCount,
      setActiveListId,
      createShoppingList,
      addShoppingListItem,
      toggleShoppingListItem,
      getShoppingListItemCount,
      deleteShoppingList,
      refreshCategories,
      refreshDevData,
      search,
      selectedZoneId,
      setSearch,
      setAuthToken,
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
