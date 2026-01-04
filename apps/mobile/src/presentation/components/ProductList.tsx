import { FlatList, StyleSheet, Text } from 'react-native';
import { Card } from 'react-native-paper';
import type { ProductListItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  products: ProductListItem[];
  onSelect: (productId: number) => void;
  t: TFunction;
};

export default function ProductList({ products, onSelect, t }: Props) {
  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <Card style={styles.card} onPress={() => onSelect(item.id)}>
          <Card.Content>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {t('label.zone')}: {item.zoneName ?? '-'}
            </Text>
          </Card.Content>
        </Card>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.borderLight,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  cardMeta: {
    color: colors.textSoft,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
});
