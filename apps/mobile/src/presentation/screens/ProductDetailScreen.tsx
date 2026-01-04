import { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HomeLayout from '@presentation/components/HomeLayout';
import ProductDetailView from '@presentation/components/ProductDetail';
import { useHome } from '@presentation/context/HomeContext';
import type { RootStackParamList } from '@presentation/navigation/types';
import type { ProductDetail } from '@domain/types';

export default function ProductDetailScreen() {
  const route = useRoute();
  const { productId } = route.params as RootStackParamList['ProductDetail'];
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { loadDetail, recordEvent, t } = useHome();
  const [detail, setDetail] = useState<ProductDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const item = await loadDetail(productId);
      if (mounted) setDetail(item ?? null);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [loadDetail, productId]);

  if (!detail) {
    return (
      <HomeLayout>
        <ProductDetailView
          detail={{
            id: productId,
            name: t('status.initializing'),
            brand: null,
            category: null,
            zoneId: null,
            zoneName: null,
          }}
          onFound={() => null}
          onNotFound={() => null}
          onBack={() => navigation.goBack()}
          t={t}
        />
      </HomeLayout>
    );
  }

  return (
    <HomeLayout>
      <ProductDetailView
        detail={detail}
        onFound={async () => {
          await recordEvent(detail, 'FOUND');
          navigation.goBack();
        }}
        onNotFound={async () => {
          await recordEvent(detail, 'NOT_FOUND');
          navigation.goBack();
        }}
        onBack={() => navigation.goBack()}
        t={t}
      />
    </HomeLayout>
  );
}
