import HomeLayout from '@presentation/components/HomeLayout';
import DevPanel from '@presentation/components/DevPanel';
import { useHome } from '@presentation/context/HomeContext';
import { API_BASE_URL } from '@app/config';

export default function DevScreen() {
  const {
    tableCounts,
    outboxPending,
    outboxSent,
    pendingProductsCount,
    pendingListItemsCount,
    pendingListsCount,
    lastSyncStats,
    isSyncing,
    refreshDevData,
    handleReset,
    handleSync,
    t,
  } = useHome();

  return (
    <HomeLayout showDevInfo>
      <DevPanel
        apiBaseUrl={API_BASE_URL}
        tableCounts={tableCounts}
        outboxPending={outboxPending}
        outboxSent={outboxSent}
        pendingProductsCount={pendingProductsCount}
        pendingListItemsCount={pendingListItemsCount}
        pendingListsCount={pendingListsCount}
        lastSyncStats={lastSyncStats}
        isSyncing={isSyncing}
        onRefresh={refreshDevData}
        onReset={handleReset}
        onSync={handleSync}
        t={t}
      />
    </HomeLayout>
  );
}
