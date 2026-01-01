import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  loadOutboxEvents,
  loadProductDetail,
  loadProducts,
  loadStoreCount,
  loadTableCounts,
  loadZones,
  recordOutboxEvent,
  resetWithPack,
} from '@domain/usecases';

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
  const [devMode, setDevMode] = useState(false);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [outboxEvents, setOutboxEvents] = useState<OutboxEventItem[]>([]);
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

  const refreshDevData = async () => {
    const counts = await loadTableCounts(repo);
    const events = await loadOutboxEvents(repo, 20);
    setTableCounts(counts);
    setOutboxEvents(events);
  };

  const refreshListData = async () => {
    const rows = await loadProducts(repo, search);
    setProducts(rows);
  };

  const refreshZones = async () => {
    const rows = await loadZones(repo);
    setZones(rows);
  };

  useEffect(() => {
    if (status === 'SQLite ready') {
      refreshListData();
      refreshZones();
      refreshDevData();
    }
  }, [status]);

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
    await recordOutboxEvent(repo, type, { productId: detail.id });
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
              fill={isActive ? '#2563eb' : '#e5e7eb'}
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
              fill={isActive ? '#fff' : '#111'}
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
    if (tapCount.current >= 5) {
      setDevMode((prev) => !prev);
      tapCount.current = 0;
    }
  };

  const handleReset = async () => {
    await resetWithPack(repo, pack);
    await refreshListData();
    await refreshZones();
    await refreshDevData();
    setStatus('DB reset + pack imported');
    setScreen('list');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleSecretTap}>
          <Text style={styles.title}>Speedy Basket</Text>
        </Pressable>
        <Text style={styles.subtitle}>{status}</Text>
        <Text style={styles.subtitle}>Stores: {storeCount ?? '-'}</Text>
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
            <Text style={styles.detailMeta}>DB counts</Text>
            {Object.entries(tableCounts).map(([key, value]) => (
              <Text key={key} style={styles.devRow}>
                {key}: {value}
              </Text>
            ))}
          </View>
          <View style={styles.devSection}>
            <Text style={styles.detailMeta}>Outbox (ultimos 20)</Text>
            {outboxEvents.map((eventItem) => (
              <Text key={eventItem.id} style={styles.devRow}>
                {eventItem.type} · {eventItem.created_at}
              </Text>
            ))}
          </View>
          <Pressable onPress={refreshDevData} style={styles.actionButton}>
            <Text style={styles.actionText}>Refrescar</Text>
          </Pressable>
          <Pressable onPress={handleReset} style={styles.actionButton}>
            <Text style={styles.actionText}>Reset + Import pack</Text>
          </Pressable>
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: {
    color: '#fff',
  },
  backLink: {
    color: '#3b82f6',
    marginTop: 8,
  },
  card: {
    borderColor: '#eee',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  cardMeta: {
    color: '#666',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    backgroundColor: '#fff',
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
    color: '#444',
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
    color: '#444',
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
    borderColor: '#ddd',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonActive: {
    borderColor: '#3b82f6',
  },
  navButtonText: {
    color: '#111',
  },
  searchInput: {
    borderColor: '#ddd',
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
    color: '#444',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
