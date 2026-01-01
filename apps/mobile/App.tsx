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
import {
  createOutboxEvent,
  getProductDetail,
  getStoreCount,
  importPackIfNeeded,
  initDatabase,
  listProducts,
  openDatabase,
  ProductDetail,
  ProductListItem,
} from './src/db';
import pack from './assets/pack.json';

export default function App() {
  const [status, setStatus] = useState('Initializing...');
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [screen, setScreen] = useState<'list' | 'search' | 'detail'>('list');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<ProductDetail | null>(null);

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

  useEffect(() => {
    if (db) loadProducts('');
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
