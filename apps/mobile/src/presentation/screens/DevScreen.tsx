import HomeLayout from '@presentation/components/HomeLayout';
import DevPanel from '@presentation/components/DevPanel';
import { useHome } from '@presentation/context/HomeContext';
import { API_BASE_URL } from '@app/config';

export default function DevScreen() {
  const {
    tableCounts,
    outboxPending,
    outboxSent,
    lastSyncStats,
    isSyncing,
    authToken,
    setAuthToken,
    refreshDevData,
    handleReset,
    handleSync,
    t,
  } = useHome();

  return (
    <HomeLayout showDevInfo>
      <DevPanel
        apiBaseUrl={API_BASE_URL}
        authToken={authToken}
        tableCounts={tableCounts}
        outboxPending={outboxPending}
        outboxSent={outboxSent}
        lastSyncStats={lastSyncStats}
        isSyncing={isSyncing}
        onRefresh={refreshDevData}
        onReset={handleReset}
        onSync={handleSync}
        onSetAuthToken={setAuthToken}
        t={t}
      />
    </HomeLayout>
  );
}
