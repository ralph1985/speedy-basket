import HomeLayout from '@presentation/components/HomeLayout';
import SettingsPanel from '@presentation/components/SettingsPanel';
import { useHome } from '@presentation/context/HomeContext';

export default function SettingsScreen() {
  const { language, setLanguage, t, signOut } = useHome();

  return (
    <HomeLayout>
      <SettingsPanel
        language={language}
        onChangeLanguage={setLanguage}
        onSignOut={signOut}
        t={t}
      />
    </HomeLayout>
  );
}
