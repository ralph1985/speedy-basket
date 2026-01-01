import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStoreCount, importPackIfNeeded, initDatabase, openDatabase } from './src/db';
import pack from './assets/pack.json';

export default function App() {
  const [status, setStatus] = useState('Initializing...');
  const [storeCount, setStoreCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        const db = await openDatabase();
        await initDatabase(db);
        await importPackIfNeeded(db, pack);
        const count = await getStoreCount(db);
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
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speedy Basket</Text>
      <Text>{status}</Text>
      <Text>Stores: {storeCount ?? '-'}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
