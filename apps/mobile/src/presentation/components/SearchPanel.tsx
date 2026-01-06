import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Dialog, Portal, TextInput } from 'react-native-paper';
import { useState } from 'react';
import type { ProductListItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  products: ProductListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (productId: number) => void;
  onCreateProduct: (name: string, category?: string | null) => Promise<void>;
  categories: string[];
  t: TFunction;
};

export default function SearchPanel({
  products,
  search,
  onSearchChange,
  onSelect,
  onCreateProduct,
  categories,
  t,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    await onCreateProduct(name, newCategory.trim() || null);
    setIsCreating(false);
    setShowCreate(false);
    setNewName('');
    setNewCategory('');
  };

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <TextInput
          placeholder={t('search.placeholder')}
          value={search}
          onChangeText={onSearchChange}
          mode="outlined"
          style={styles.searchInput}
        />
        <Button
          mode="contained"
          onPress={() => setShowCreate(true)}
          style={styles.addButton}
          labelStyle={styles.addButtonLabel}
        >
          {t('action.addProduct')}
        </Button>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card mode="outlined" style={styles.card} onPress={() => onSelect(item.id)}>
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
      {products.length === 0 ? (
        <Text style={styles.emptyText}>{t('search.empty')}</Text>
      ) : null}
      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)}>
          <Dialog.Title>{t('action.addProduct')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('label.productName')}
              value={newName}
              onChangeText={setNewName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label={t('label.category')}
              value={newCategory}
              onChangeText={setNewCategory}
              mode="outlined"
              style={styles.dialogInput}
            />
            {categories.length > 0 ? (
              <View style={styles.categoryList}>
                {categories.map((category) => (
                  <Chip
                    key={category}
                    onPress={() => setNewCategory(category)}
                    style={styles.categoryChip}
                    textStyle={styles.categoryChipText}
                  >
                    {category}
                  </Chip>
                ))}
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('action.cancel')}</Button>
            <Button onPress={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating ? t('action.creating') : t('action.createProduct')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignSelf: 'center',
    marginLeft: 8,
  },
  addButtonLabel: {
    color: colors.onPrimary,
  },
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
  categoryChip: {
    backgroundColor: colors.surfaceAlt,
  },
  categoryChipText: {
    color: colors.text,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dialogInput: {
    marginBottom: 12,
  },
  emptyText: {
    color: colors.textSoft,
    marginTop: 8,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  panel: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
