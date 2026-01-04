import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

const formatTimestamp = (value: string | null) => {
  if (!value) return 'never';
  return value.replace('T', ' ').replace('Z', '');
};

type Props = {
  status: string;
  storeCount: number | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'idle' | 'ok' | 'failed';
  lastSyncError: string | null;
  apiBaseUrl: string;
  showDevInfo: boolean;
  t: TFunction;
  onSecretTap: () => void;
};

export default function StatusHeader({
  status,
  storeCount,
  lastSyncAt,
  lastSyncStatus,
  lastSyncError,
  apiBaseUrl,
  showDevInfo,
  t,
  onSecretTap,
}: Props) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onSecretTap}>
        <Text style={styles.title}>Speedy Basket</Text>
      </Pressable>
      {showDevInfo ? (
        <>
          <Text style={styles.subtitle}>{status}</Text>
          <Text style={styles.subtitle}>
            {t('header.stores')}: {storeCount ?? '-'}
          </Text>
          <Text style={styles.subtitle}>
            {t('header.lastSync')}: {formatTimestamp(lastSyncAt)} (
            {t(`syncStatus.${lastSyncStatus}`)})
          </Text>
          {lastSyncError ? (
            <Text style={styles.subtitle}>
              {t('header.error')}: {lastSyncError}
            </Text>
          ) : null}
          <Text style={styles.subtitle}>
            {t('header.api')}: {apiBaseUrl}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 12,
  },
  subtitle: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
