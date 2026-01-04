import { useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import type { Pack } from '@domain/types';
import { SqliteRepository } from '@data/sqlite/repository';
import HomeScreen from '@presentation/screens/HomeScreen';

type Props = {
  pack: Pack;
};

export default function App({ pack }: Props) {
  const repo = useMemo(() => new SqliteRepository(), []);
  return (
    <PaperProvider>
      <HomeScreen repo={repo} pack={pack} />
    </PaperProvider>
  );
}
