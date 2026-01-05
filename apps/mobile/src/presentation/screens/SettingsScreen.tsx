import HomeLayout from '@presentation/components/HomeLayout';
import SettingsPanel from '@presentation/components/SettingsPanel';
import { useHome } from '@presentation/context/HomeContext';

export default function SettingsScreen() {
  const { language, setLanguage, t, stores, activeStoreId, setActiveStoreId } = useHome();

  return (
    <HomeLayout>
      <SettingsPanel
        language={language}
        onChangeLanguage={setLanguage}
        stores={stores}
        activeStoreId={activeStoreId}
        onChangeStore={setActiveStoreId}
        t={t}
      />
    </HomeLayout>
  );
}
