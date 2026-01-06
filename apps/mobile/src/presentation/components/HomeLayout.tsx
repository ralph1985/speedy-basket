import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusHeader from '@presentation/components/StatusHeader';
import colors from '@presentation/styles/colors';
import { useHome } from '@presentation/context/HomeContext';
import { API_BASE_URL } from '@app/config';

type Props = {
  showDevInfo?: boolean;
  children: ReactNode;
};

export default function HomeLayout({ showDevInfo = false, children }: Props) {
  const {
    statusText,
    storeCount,
    lastSyncAt,
    lastSyncStatus,
    lastSyncError,
    registerDevTap,
    t,
  } = useHome();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <StatusHeader
          status={statusText}
          storeCount={storeCount}
          lastSyncAt={lastSyncAt}
          lastSyncStatus={lastSyncStatus}
          lastSyncError={lastSyncError}
          apiBaseUrl={API_BASE_URL}
          showDevInfo={showDevInfo}
          t={t}
          onSecretTap={registerDevTap}
        />
        {children}
      </View>
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
