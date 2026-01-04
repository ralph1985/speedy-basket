import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { enableScreens } from 'react-native-screens';
import type { Pack } from '@domain/types';
import { SqliteRepository } from '@data/sqlite/repository';
import AppNavigator from '@presentation/navigation/AppNavigator';
import theme from '@presentation/styles/theme';
import { HomeProvider } from '@presentation/context/HomeContext';

enableScreens();

type Props = {
  pack: Pack;
};

export default function App({ pack }: Props) {
  const repo = useMemo(() => new SqliteRepository(), []);
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <HomeProvider repo={repo} pack={pack}>
          <AppNavigator />
        </HomeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
