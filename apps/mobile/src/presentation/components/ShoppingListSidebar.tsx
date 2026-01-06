import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Dialog, Portal, TextInput } from 'react-native-paper';
import type { ShoppingList } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  lists: ShoppingList[];
  activeListId: number | null;
  onSelectList: (listId: number) => void;
  onCreateList: (name: string) => Promise<void>;
  onShareMember: (payload: { userId: string; role?: 'owner' | 'editor' | 'viewer' }) => Promise<void>;
  t: TFunction;
};

export default function ShoppingListSidebar({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onShareMember,
  t,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [isCreating, setIsCreating] = useState(false);
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
    <View style={styles.sidebar}>
      <View style={styles.header}>
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
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
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
  header: {
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    gap: 8,
    paddingTop: 8,
  },
  listButton: {
    width: '100%',
  },
  listButtonLabel: {
    fontSize: 12,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  sidebar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
