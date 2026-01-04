import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card, TextInput } from 'react-native-paper';
import type { ProductListItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  products: ProductListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (productId: number) => void;
  t: TFunction;
};

export default function SearchPanel({ products, search, onSearchChange, onSelect, t }: Props) {
  return (
    <View style={styles.panel}>
      <TextInput
        placeholder={t('search.placeholder')}
        value={search}
        onChangeText={onSearchChange}
        mode="outlined"
        style={styles.searchInput}
      />
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
    </View>
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
  panel: {
    flex: 1,
  },
  searchInput: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
