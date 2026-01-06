import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Checkbox, Dialog, Portal, TextInput } from 'react-native-paper';
import type { ShoppingListItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  listItems: ShoppingListItem[];
  onToggleItem: (itemId: number, checked: boolean) => Promise<void>;
  onAddItem: (payload: { label?: string }) => Promise<void>;
  t: TFunction;
};

export default function ShoppingListItemsPanel({
  listItems,
  onToggleItem,
  onAddItem,
  t,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async () => {
    const label = newItemLabel.trim();
    if (!label) return;
    setIsAdding(true);
    await onAddItem({ label });
    setIsAdding(false);
    setShowAdd(false);
    setNewItemLabel('');
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('list.items')}</Text>
        <Button mode="outlined" onPress={() => setShowAdd(true)} compact>
          {t('action.addItem')}
        </Button>
      </View>
      {listItems.length === 0 ? (
        <Text style={styles.emptyText}>{t('list.emptyItems')}</Text>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.itemsList}
          renderItem={({ item }) => (
            <Card mode="outlined" style={styles.itemCard}>
              <Card.Content style={styles.itemContent}>
                <Checkbox
                  status={item.checked ? 'checked' : 'unchecked'}
                  onPress={() => onToggleItem(item.id, !item.checked)}
                />
                <View style={styles.itemTextWrapper}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
                      {item.label}
                    </Text>
                    {item.productId && item.productId < 0 ? (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>{t('product.pending')}</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.productName ? (
                    <Text style={styles.itemMeta}>{item.productName}</Text>
                  ) : null}
                </View>
              </Card.Content>
            </Card>
          )}
        />
      )}

      <Portal>
        <Dialog visible={showAdd} onDismiss={() => setShowAdd(false)}>
          <Dialog.Title>{t('action.addItem')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('label.itemName')}
              value={newItemLabel}
              onChangeText={setNewItemLabel}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAdd(false)}>{t('action.cancel')}</Button>
            <Button onPress={handleAddItem} disabled={!newItemLabel.trim() || isAdding}>
              {isAdding ? t('action.creating') : t('action.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textSoft,
    marginTop: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemCard: {
    borderColor: colors.borderLight,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  itemMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  itemText: {
    color: colors.text,
    fontSize: 16,
  },
  itemTextChecked: {
    color: colors.textSoft,
    textDecorationLine: 'line-through',
  },
  itemTextWrapper: {
    flex: 1,
  },
  itemTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemsList: {
    gap: 8,
    paddingBottom: 8,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  pendingBadge: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
