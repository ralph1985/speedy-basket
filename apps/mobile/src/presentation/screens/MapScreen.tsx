import HomeLayout from '@presentation/components/HomeLayout';
import MapPanel from '@presentation/components/MapPanel';
import { useHome } from '@presentation/context/HomeContext';

export default function MapScreen() {
  const { zones, selectedZoneId, setSelectedZoneId, stores, activeStoreId, setActiveStoreId, t } =
    useHome();

  return (
    <HomeLayout>
      <MapPanel
        stores={stores}
        activeStoreId={activeStoreId}
        onChangeStore={setActiveStoreId}
        zones={zones}
        activeZoneId={selectedZoneId}
        onSelectZone={setSelectedZoneId}
        t={t}
      />
    </HomeLayout>
  );
}
