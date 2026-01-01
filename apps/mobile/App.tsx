import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import {
  createOutboxEvent,
  getProductDetail,
  getStoreCount,
  importPackIfNeeded,
  initDatabase,
  listZones,
  listProducts,
  openDatabase,
  ProductDetail,
  ProductListItem,
  ZoneItem,
} from './src/db';
import pack from './assets/pack.json';

export default function App() {
  const [status, setStatus] = useState('Initializing...');
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [screen, setScreen] = useState<'list' | 'search' | 'detail' | 'map'>('list');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        const database = await openDatabase();
        await initDatabase(database);
        await importPackIfNeeded(database, pack);
        const count = await getStoreCount(database);
        if (mounted) {
          setStoreCount(count);
          setStatus('SQLite ready');
          setDb(database);
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
  }, []);

  const loadProducts = async (query = '') => {
    if (!db) return;
    const rows = await listProducts(db, query);
    setProducts(rows);
  };

  const loadZones = async () => {
    if (!db) return;
    const rows = await listZones(db);
    setZones(rows);
  };

  useEffect(() => {
    if (db) {
      loadProducts('');
      loadZones();
    }
  }, [db]);

  const openDetail = async (productId: number) => {
    if (!db) return;
    const item = await getProductDetail(db, productId);
    setDetail(item ?? null);
    setScreen('detail');
  };

  const handleSearchChange = async (value: string) => {
    setSearch(value);
    if (db) {
      await loadProducts(value);
    }
  };

  const navItems = useMemo(
    () => [
      { key: 'list' as const, label: 'Lista' },
      { key: 'search' as const, label: 'Busqueda' },
      { key: 'map' as const, label: 'Mapa' },
    ],
    []
  );

  const renderProduct = ({ item }: { item: ProductListItem }) => (
    <Pressable onPress={() => openDetail(item.id)} style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardMeta}>Zona: {item.zoneName ?? '-'}</Text>
    </Pressable>
  );

  const handleEvent = async (type: 'FOUND' | 'NOT_FOUND') => {
    if (!db || !detail) return;
    await createOutboxEvent(db, type, { productId: detail.id });
    setStatus(`Event ${type} saved`);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Speedy Basket</Text>
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
          <Text style={styles.detailMeta}>
            Zona activa: {activeZoneId ?? '-'}
          </Text>
          <View style={styles.mapCanvas}>{renderZoneMap()}</View>
        </View>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: '#444',
  },
  header: {
    marginBottom: 12,
    gap: 4,
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  navButtonActive: {
    borderColor: '#3b82f6',
  },
  navButtonText: {
    color: '#111',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#666',
    marginTop: 4,
  },
  searchPanel: {
    flex: 1,
  },
  mapPanel: {
    flex: 1,
    gap: 12,
  },
  mapCanvas: {
    alignItems: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  detail: {
    gap: 10,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailMeta: {
    color: '#444',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  actionText: {
    color: '#fff',
  },
  backLink: {
    color: '#3b82f6',
    marginTop: 8,
  },
});
