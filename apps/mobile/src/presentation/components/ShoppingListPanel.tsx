import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Checkbox, Dialog, Portal, TextInput } from 'react-native-paper';
import type { ShoppingList, ShoppingListItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  lists: ShoppingList[];
  activeListId: number | null;
  listItems: ShoppingListItem[];
  onSelectList: (listId: number) => void;
  onCreateList: (name: string) => Promise<void>;
  onToggleItem: (itemId: number, checked: boolean) => Promise<void>;
  onAddItem: (payload: { label?: string }) => Promise<void>;
  onShareMember: (payload: { userId: string; role?: 'owner' | 'editor' | 'viewer' }) => Promise<void>;
  t: TFunction;
};

export default function ShoppingListPanel({
  lists,
  activeListId,
  listItems,
  onSelectList,
  onCreateList,
  onToggleItem,
  onAddItem,
  onShareMember,
  t,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [isCreating, setIsCreating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleCreate = async () => {
    const name = newListName.trim();
    if (!name) return;
    setIsCreating(true);
    await onCreateList(name);
    setIsCreating(false);
    setShowCreate(false);
    setNewListName('');
  };

  const handleAddItem = async () => {
    const label = newItemLabel.trim();
    if (!label) return;
    setIsAdding(true);
    await onAddItem({ label });
    setIsAdding(false);
    setShowAdd(false);
    setNewItemLabel('');
  };

  const handleShare = async () => {
    const userId = memberUserId.trim();
    if (!userId) return;
    setIsSharing(true);
    await onShareMember({ userId, role: memberRole });
    setIsSharing(false);
    setShowShare(false);
    setMemberUserId('');
    setMemberRole('editor');
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('list.title')}</Text>
        <View style={styles.headerActions}>
          <Button mode="outlined" onPress={() => setShowShare(true)} compact>
            {t('action.share')}
          </Button>
          <Button mode="contained" onPress={() => setShowCreate(true)} compact>
            {t('action.newList')}
          </Button>
        </View>
      </View>
      {lists.length === 0 ? (
        <Text style={styles.emptyText}>{t('list.empty')}</Text>
      ) : (
        <FlatList
          data={lists}
          horizontal
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listRow}
          renderItem={({ item }) => (
            <Button
              mode={item.id === activeListId ? 'contained' : 'outlined'}
              onPress={() => onSelectList(item.id)}
              style={styles.listButton}
              labelStyle={styles.listButtonLabel}
              compact
            >
              {item.name}
            </Button>
          )}
        />
      )}

      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{t('list.items')}</Text>
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
                    <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
                      {item.label}
                    </Text>
                    {item.productName ? (
                      <Text style={styles.itemMeta}>{item.productName}</Text>
                    ) : null}
                  </View>
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)}>
          <Dialog.Title>{t('action.newList')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('label.listName')}
              value={newListName}
              onChangeText={setNewListName}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('action.cancel')}</Button>
            <Button onPress={handleCreate} disabled={!newListName.trim() || isCreating}>
              {isCreating ? t('action.creating') : t('action.create')}
            </Button>
          </Dialog.Actions>
        </Dialog>

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

        <Dialog visible={showShare} onDismiss={() => setShowShare(false)}>
          <Dialog.Title>{t('action.share')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('label.userId')}
              value={memberUserId}
              onChangeText={setMemberUserId}
              mode="outlined"
            />
            <View style={styles.roleRow}>
              {(['owner', 'editor', 'viewer'] as const).map((role) => (
                <Button
                  key={role}
                  mode={memberRole === role ? 'contained' : 'outlined'}
                  onPress={() => setMemberRole(role)}
                  compact
                >
                  {t(`role.${role}`)}
                </Button>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowShare(false)}>{t('action.cancel')}</Button>
            <Button onPress={handleShare} disabled={!memberUserId.trim() || isSharing}>
              {isSharing ? t('action.creating') : t('action.add')}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
  itemsList: {
    gap: 8,
    paddingBottom: 8,
  },
  listButton: {
    marginRight: 8,
  },
  listButtonLabel: {
    fontSize: 12,
  },
  listRow: {
    paddingVertical: 8,
  },
  panel: {
    gap: 12,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
