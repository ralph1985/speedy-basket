import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HomeLayout from '@presentation/components/HomeLayout';
import ProductList from '@presentation/components/ProductList';
import { useHome } from '@presentation/context/HomeContext';
import type { RootStackParamList } from '@presentation/navigation/types';

export default function ListScreen() {
  const { products, t } = useHome();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <HomeLayout>
      <ProductList
        products={products}
        onSelect={(productId) => navigation.navigate('ProductDetail', { productId })}
        t={t}
      />
    </HomeLayout>
  );
}
