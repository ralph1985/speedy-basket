import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import type { Pack } from '@domain/types';
import { SqliteRepository } from '@data/sqlite/repository';
import HomeScreen from '@presentation/screens/HomeScreen';
import theme from '@presentation/styles/theme';

type Props = {
  pack: Pack;
};

export default function App({ pack }: Props) {
  const repo = useMemo(() => new SqliteRepository(), []);
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <HomeScreen repo={repo} pack={pack} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
