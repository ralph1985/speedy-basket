import HomeLayout from '@presentation/components/HomeLayout';
import MapPanel from '@presentation/components/MapPanel';
import { useHome } from '@presentation/context/HomeContext';

export default function MapScreen() {
  const { zones, selectedZoneId, setSelectedZoneId, t } = useHome();

  return (
    <HomeLayout>
      <MapPanel
        zones={zones}
        activeZoneId={selectedZoneId}
        onSelectZone={setSelectedZoneId}
        t={t}
      />
    </HomeLayout>
  );
}
