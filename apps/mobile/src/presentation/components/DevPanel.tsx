import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, SegmentedButtons } from 'react-native-paper';
import type { OutboxEventItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import { useMemo, useState } from 'react';

type Props = {
  apiBaseUrl: string;
  tableCounts: Record<string, number>;
  outboxPending: OutboxEventItem[];
  outboxSent: OutboxEventItem[];
  lastSyncStats: Record<string, string> | null;
  isSyncing: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onSync: () => void;
};

export default function DevPanel({
  apiBaseUrl,
  tableCounts,
  outboxPending,
  outboxSent,
  lastSyncStats,
  isSyncing,
  onRefresh,
  onReset,
  onSync,
}: Props) {
  const [section, setSection] = useState('overview');
  const sections = useMemo(
    () => [
      { value: 'overview', label: 'Resumen' },
      { value: 'sync', label: 'Sync' },
      { value: 'outbox', label: 'Outbox' },
      { value: 'actions', label: 'Acciones' },
    ],
    []
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.panel}>
        <Text style={styles.title}>Developer mode</Text>
        <SegmentedButtons value={section} onValueChange={setSection} buttons={sections} />

        {section === 'overview' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.meta}>API base</Text>
              <Text style={styles.row}>{apiBaseUrl}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>DB counts</Text>
              {Object.entries(tableCounts).map(([key, value]) => (
                <Text key={key} style={styles.row}>
                  {key}: {value}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        {section === 'sync' ? (
          <>
            {lastSyncStats ? (
              <View style={styles.section}>
                <Text style={styles.meta}>Last sync stats</Text>
                {Object.entries(lastSyncStats).map(([key, value]) => (
                  <Text key={key} style={styles.row}>
                    {key}: {value}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.meta}>Sin stats de sync todavia.</Text>
            )}
          </>
        ) : null}

        {section === 'outbox' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.meta}>
                Outbox pendientes ({outboxPending.length}/{tableCounts.outbox_events ?? 0})
              </Text>
              {outboxPending.map((eventItem) => (
                <Text key={eventItem.id} style={styles.row}>
                  {eventItem.type} · {eventItem.created_at}
                </Text>
              ))}
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>Outbox enviados (ultimos 20)</Text>
              {outboxSent.map((eventItem) => (
                <Text key={eventItem.id} style={styles.row}>
                  {eventItem.type} · {eventItem.sent_at}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button mode="contained" onPress={onRefresh}>
          <Text>Refrescar</Text>
        </Button>
        <Button mode="contained" onPress={onReset}>
          <Text>Reset + Import pack</Text>
        </Button>
        <Button mode="contained" onPress={onSync} disabled={isSyncing}>
          <Text>{isSyncing ? 'Syncing...' : 'Sync now'}</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 8,
    paddingTop: 12,
  },
  container: {
    flex: 1,
  },
  meta: {
    color: colors.textMuted,
  },
  panel: {
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    color: colors.textMuted,
    fontSize: 12,
  },
  section: {
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
