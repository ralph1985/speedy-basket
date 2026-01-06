import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, SegmentedButtons } from 'react-native-paper';
import type { OutboxEventItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import { useMemo, useState } from 'react';
import type { TFunction } from '@presentation/i18n';

type Props = {
  apiBaseUrl: string;
  tableCounts: Record<string, number>;
  outboxPending: OutboxEventItem[];
  outboxSent: OutboxEventItem[];
  pendingProductsCount: number;
  pendingListItemsCount: number;
  pendingListsCount: number;
  lastSyncStats: Record<string, string> | null;
  isSyncing: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onSync: () => void;
  t: TFunction;
};

export default function DevPanel({
  apiBaseUrl,
  tableCounts,
  outboxPending,
  outboxSent,
  pendingProductsCount,
  pendingListItemsCount,
  pendingListsCount,
  lastSyncStats,
  isSyncing,
  onRefresh,
  onReset,
  onSync,
  t,
}: Props) {
  const [section, setSection] = useState('overview');
  const sections = useMemo(
    () => [
      { value: 'overview', label: t('dev.section.overview') },
      { value: 'sync', label: t('dev.section.sync') },
      { value: 'outbox', label: t('dev.section.outbox') },
    ],
    [t]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.panel}>
        <Text style={styles.title}>{t('dev.title')}</Text>
        <SegmentedButtons value={section} onValueChange={setSection} buttons={sections} />

        {section === 'overview' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.meta}>{t('dev.apiBase')}</Text>
              <Text style={styles.row}>{apiBaseUrl}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>{t('dev.dbCounts')}</Text>
              {Object.entries(tableCounts).map(([key, value]) => (
                <Text key={key} style={styles.row}>
                  {key}: {value}
                </Text>
              ))}
              <Text style={styles.row}>
                {t('dev.pendingProducts')}: {pendingProductsCount}
              </Text>
              <Text style={styles.row}>
                {t('dev.pendingListItems')}: {pendingListItemsCount}
              </Text>
              <Text style={styles.row}>
                {t('dev.pendingLists')}: {pendingListsCount}
              </Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>{t('dev.pendingProducts')}</Text>
              <Text style={styles.row}>{pendingProductsCount}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>{t('dev.pendingListItems')}</Text>
              <Text style={styles.row}>{pendingListItemsCount}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>{t('dev.pendingLists')}</Text>
              <Text style={styles.row}>{pendingListsCount}</Text>
            </View>
          </>
        ) : null}

        {section === 'sync' ? (
          <>
            {lastSyncStats ? (
              <View style={styles.section}>
                <Text style={styles.meta}>{t('dev.lastSyncStats')}</Text>
                {Object.entries(lastSyncStats).map(([key, value]) => (
                  <Text key={key} style={styles.row}>
                    {key}: {value}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.meta}>{t('dev.noSyncStats')}</Text>
            )}
          </>
        ) : null}

        {section === 'outbox' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.meta}>
                {t('dev.outboxPending')} ({outboxPending.length}/
                {tableCounts.outbox_events ?? 0})
              </Text>
              {outboxPending.map((eventItem) => (
                <Text key={eventItem.id} style={styles.row}>
                  {t(`eventType.${eventItem.type}`)} · {eventItem.created_at}
                </Text>
              ))}
            </View>
            <View style={styles.section}>
              <Text style={styles.meta}>{t('dev.outboxSent')}</Text>
              {outboxSent.map((eventItem) => (
                <Text key={eventItem.id} style={styles.row}>
                  {t(`eventType.${eventItem.type}`)} · {eventItem.sent_at}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button mode="contained" onPress={onRefresh}>
          <Text>{t('action.refresh')}</Text>
        </Button>
        <Button mode="contained" onPress={onReset}>
          <Text>{t('action.resetPack')}</Text>
        </Button>
        <Button mode="contained" onPress={onSync} disabled={isSyncing}>
          <Text>{isSyncing ? t('action.syncing') : t('action.syncNow')}</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
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
