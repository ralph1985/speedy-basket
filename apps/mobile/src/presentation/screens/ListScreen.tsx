import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HomeLayout from '@presentation/components/HomeLayout';
import SearchPanel from '@presentation/components/SearchPanel';
import { useHome } from '@presentation/context/HomeContext';
import type { RootStackParamList } from '@presentation/navigation/types';

export default function ListScreen() {
  const { products, search, setSearch, createProduct, categories, t } = useHome();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <HomeLayout>
      <SearchPanel
        products={products}
        search={search}
        onSearchChange={setSearch}
        onSelect={(productId) => navigation.navigate('ProductDetail', { productId })}
        onCreateProduct={createProduct}
        categories={categories}
        t={t}
      />
    </HomeLayout>
  );
}
