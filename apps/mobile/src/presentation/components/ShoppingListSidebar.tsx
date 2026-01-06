import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Dialog, IconButton, Portal, TextInput } from 'react-native-paper';
import type { ShoppingList } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  lists: ShoppingList[];
  activeListId: number | null;
  onSelectList: (listId: number) => void;
  onCreateList: (name: string) => Promise<void>;
  onDeleteList: (listId: number) => Promise<void>;
  onGetListItemCount: (listId: number) => Promise<number>;
  t: TFunction;
};

export default function ShoppingListSidebar({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  t,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingList | null>(null);
  const [deleteCount, setDeleteCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = async () => {
    const name = newListName.trim();
    if (!name) return;
    setIsCreating(true);
    await onCreateList(name);
    setIsCreating(false);
    setShowCreate(false);
    setNewListName('');
  };

  const openDelete = async (list: ShoppingList) => {
    const count = await onGetListItemCount(list.id);
    setDeleteCount(count);
    setDeleteTarget(list);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteCount(0);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await onDeleteList(deleteTarget.id);
    setIsDeleting(false);
    closeDelete();
  };

  return (
    <SafeAreaView style={styles.sidebar} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('list.title')}</Text>
      </View>

      {lists.length === 0 ? (
        <Text style={styles.emptyText}>{t('list.empty')}</Text>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <Button
                mode={item.id === activeListId ? 'contained' : 'outlined'}
                onPress={() => onSelectList(item.id)}
                style={styles.listButton}
                labelStyle={styles.listButtonLabel}
                compact
              >
                {item.name}
              </Button>
              <IconButton
                icon="trash-can-outline"
                size={18}
                iconColor={colors.textMuted}
                onPress={() => openDelete(item)}
                accessibilityLabel={t('action.deleteList')}
              />
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <Button mode="contained" onPress={() => setShowCreate(true)}>
          {t('action.newList')}
        </Button>
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
        <Dialog visible={Boolean(deleteTarget)} onDismiss={closeDelete}>
          <Dialog.Title>{t('list.deleteTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.deleteText}>
              {t('list.deleteConfirm', { name: deleteTarget?.name ?? '' })}
            </Text>
            {deleteCount > 0 ? (
              <Text style={styles.deleteWarning}>
                {t('list.deleteWarning', { count: deleteCount })}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDelete}>{t('action.cancel')}</Button>
            <Button onPress={handleDelete} disabled={isDeleting} textColor={colors.danger}>
              {isDeleting ? t('action.deleting') : t('action.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  deleteText: {
    color: colors.text,
    marginBottom: 8,
  },
  deleteWarning: {
    color: colors.warning,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textSoft,
    marginTop: 8,
  },
  footer: {
    paddingTop: 12,
  },
  header: {
    gap: 8,
  },
  list: {
    gap: 8,
    paddingTop: 8,
  },
  listButton: {
    flex: 1,
  },
  listButtonLabel: {
    fontSize: 12,
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sidebar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
