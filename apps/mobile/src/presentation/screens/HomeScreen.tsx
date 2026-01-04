import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { AppRepository } from '@domain/ports';
import type { Pack, ProductDetail, ProductListItem, ZoneItem, OutboxEventItem } from '@domain/types';
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

const defaultStoreId = (pack: Pack) => pack.stores[0]?.id ?? DEFAULT_STORE_ID;

const formatTimestamp = (value: string | null) => {
  if (!value) return 'never';
  return value.replace('T', ' ').replace('Z', '');
};

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

export default function HomeScreen({ repo, pack }: Props) {
  const [status, setStatus] = useState('Initializing...');
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [screen, setScreen] = useState<'list' | 'search' | 'detail' | 'map' | 'dev'>('list');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<ProductDetail | null>(null);
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
    setScreen('detail');
  };

  const handleSearchChange = async (value: string) => {
    setSearch(value);
    const rows = await loadProducts(repo, value);
    setProducts(rows);
  };

  const navItems = useMemo(
    () =>
      [
        { key: 'list' as const, label: 'Lista' },
        { key: 'search' as const, label: 'Busqueda' },
        { key: 'map' as const, label: 'Mapa' },
        devMode ? { key: 'dev' as const, label: 'Dev' } : null,
      ].filter(Boolean) as Array<{ key: 'list' | 'search' | 'map' | 'dev'; label: string }>,
    [devMode]
  );

  const renderProduct = ({ item }: { item: ProductListItem }) => (
    <Pressable onPress={() => openDetail(item.id)} style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardMeta}>Zona: {item.zoneName ?? '-'}</Text>
    </Pressable>
  );

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

  const renderZoneMap = () => {
    const columns = 2;
    const cellWidth = 120;
    const cellHeight = 80;
    const padding = 10;
    const width = columns * cellWidth + (columns + 1) * padding;
    const rows = Math.max(1, Math.ceil(zones.length / columns));
    const height = rows * cellHeight + (rows + 1) * padding;

    return (
      <Svg width={width} height={height}>
        {zones.map((zone, index) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          const x = padding + col * (cellWidth + padding);
          const y = padding + row * (cellHeight + padding);
          const isActive = zone.id === activeZoneId;
          return (
            <Rect
              key={zone.id}
              x={x}
              y={y}
              width={cellWidth}
              height={cellHeight}
              rx={8}
              fill={isActive ? colors.primary : colors.surface}
              onPress={() => setSelectedZoneId(zone.id)}
            />
          );
        })}
        {zones.map((zone, index) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          const x = padding + col * (cellWidth + padding);
          const y = padding + row * (cellHeight + padding);
          const labelX = x + cellWidth / 2;
          const labelY = y + cellHeight / 2 + 4;
          const isActive = zone.id === activeZoneId;
          return (
            <SvgText
              key={`label-${zone.id}`}
              x={labelX}
              y={labelY}
              fill={isActive ? colors.onPrimary : colors.text}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
            >
              {zone.name}
            </SvgText>
          );
        })}
      </Svg>
    );
  };

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
    setScreen('list');
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
      <View style={styles.header}>
        <Pressable onPress={handleSecretTap}>
        <Text style={styles.title}>Speedy Basket</Text>
        </Pressable>
        <Text style={styles.subtitle}>{status}</Text>
        <Text style={styles.subtitle}>Stores: {storeCount ?? '-'}</Text>
        <Text style={styles.subtitle}>
          Last sync: {formatTimestamp(lastSyncAt)} ({lastSyncStatus})
        </Text>
        {lastSyncError ? <Text style={styles.subtitle}>Error: {lastSyncError}</Text> : null}
        <Text style={styles.subtitle}>API: {API_BASE_URL}</Text>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setScreen(item.key)}
            style={[styles.navButton, screen === item.key && styles.navButtonActive]}
          >
            <Text style={styles.navButtonText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {screen === 'list' && (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
        />
      )}

      {screen === 'search' && (
        <View style={styles.searchPanel}>
          <TextInput
            placeholder="Buscar producto"
            value={search}
            onChangeText={handleSearchChange}
            style={styles.searchInput}
          />
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            contentContainerStyle={styles.list}
          />
        </View>
      )}

      {screen === 'detail' && detail && (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>{detail.name}</Text>
          <Text style={styles.detailMeta}>Zona sugerida: {detail.zoneName ?? '-'}</Text>
          <Text style={styles.detailMeta}>Categoria: {detail.category ?? '-'}</Text>
          <View style={styles.detailActions}>
            <Pressable onPress={() => handleEvent('FOUND')} style={styles.actionButton}>
              <Text style={styles.actionText}>Encontrado</Text>
            </Pressable>
            <Pressable onPress={() => handleEvent('NOT_FOUND')} style={styles.actionButton}>
              <Text style={styles.actionText}>No esta</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setScreen('list')}>
            <Text style={styles.backLink}>Volver a lista</Text>
          </Pressable>
        </View>
      )}

      {screen === 'map' && (
        <View style={styles.mapPanel}>
          <Text style={styles.detailMeta}>Zona activa: {activeZoneId ?? '-'}</Text>
          <View style={styles.mapCanvas}>{renderZoneMap()}</View>
        </View>
      )}

      {screen === 'dev' && (
        <ScrollView contentContainerStyle={styles.devPanel}>
          <Text style={styles.detailTitle}>Developer mode</Text>
          <View style={styles.devSection}>
            <Text style={styles.detailMeta}>API base</Text>
            <Text style={styles.devRow}>{API_BASE_URL}</Text>
          </View>
          <View style={styles.devSection}>
            <Text style={styles.detailMeta}>DB counts</Text>
            {Object.entries(tableCounts).map(([key, value]) => (
              <Text key={key} style={styles.devRow}>
                {key}: {value}
              </Text>
            ))}
          </View>
          {lastSyncStats ? (
            <View style={styles.devSection}>
              <Text style={styles.detailMeta}>Last sync stats</Text>
              {Object.entries(lastSyncStats).map(([key, value]) => (
                <Text key={key} style={styles.devRow}>
                  {key}: {value}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={styles.devSection}>
            <Text style={styles.detailMeta}>
              Outbox pendientes ({outboxEvents.length}/{tableCounts.outbox_events ?? 0})
            </Text>
            {outboxEvents.map((eventItem) => (
              <Text key={eventItem.id} style={styles.devRow}>
                {eventItem.type} · {eventItem.created_at}
              </Text>
            ))}
          </View>
          <View style={styles.devSection}>
            <Text style={styles.detailMeta}>Outbox enviados (ultimos 20)</Text>
            {sentOutboxEvents.map((eventItem) => (
              <Text key={eventItem.id} style={styles.devRow}>
                {eventItem.type} · {eventItem.sent_at}
              </Text>
            ))}
          </View>
          <Pressable onPress={refreshDevData} style={styles.actionButton}>
            <Text style={styles.actionText}>Refrescar</Text>
          </Pressable>
          <Pressable onPress={handleReset} style={styles.actionButton}>
            <Text style={styles.actionText}>Reset + Import pack</Text>
          </Pressable>
          <Pressable
            onPress={handleSync}
            style={[styles.actionButton, isSyncing && styles.actionButtonDisabled]}
            disabled={isSyncing}
          >
            <Text style={styles.actionText}>{isSyncing ? 'Syncing...' : 'Sync now'}</Text>
          </Pressable>
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const colors = {
  background: '#ffffff',
  text: '#111111',
  textMuted: '#444444',
  textSoft: '#666666',
  border: '#dddddd',
  borderLight: '#eeeeee',
  primary: '#3b82f6',
  onPrimary: '#ffffff',
  surface: '#e5e7eb',
};

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: colors.onPrimary,
  },
  backLink: {
    color: colors.primary,
    marginTop: 8,
  },
  card: {
    borderColor: colors.borderLight,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  cardMeta: {
    color: colors.textSoft,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 24,
  },
  detail: {
    gap: 10,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailMeta: {
    color: colors.textMuted,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  devPanel: {
    gap: 12,
    paddingBottom: 24,
  },
  devRow: {
    color: colors.textMuted,
    fontSize: 12,
  },
  devSection: {
    gap: 6,
  },
  header: {
    gap: 4,
    marginBottom: 12,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  mapCanvas: {
    alignItems: 'center',
  },
  mapPanel: {
    flex: 1,
    gap: 12,
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  navButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonActive: {
    borderColor: colors.primary,
  },
  navButtonText: {
    color: colors.text,
  },
  searchInput: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchPanel: {
    flex: 1,
  },
  subtitle: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
