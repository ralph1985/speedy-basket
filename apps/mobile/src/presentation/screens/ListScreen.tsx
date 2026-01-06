import { StyleSheet, View, useWindowDimensions } from 'react-native';
import HomeLayout from '@presentation/components/HomeLayout';
import SearchPanel from '@presentation/components/SearchPanel';
import ShoppingListItemsPanel from '@presentation/components/ShoppingListItemsPanel';
import ShoppingListSidebar from '@presentation/components/ShoppingListSidebar';
import { useHome } from '@presentation/context/HomeContext';

export default function ListScreen() {
  const {
    products,
    search,
    setSearch,
    createProduct,
    categories,
    lists,
    activeListId,
    listItems,
    setActiveListId,
    createShoppingList,
    addShoppingListItem,
    toggleShoppingListItem,
    addShoppingListMember,
    t,
  } = useHome();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;

  return (
    <HomeLayout>
      <View style={[styles.layout, isWide && styles.layoutWide]}>
        <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
          <ShoppingListSidebar
            lists={lists}
            activeListId={activeListId}
            onSelectList={setActiveListId}
            onCreateList={createShoppingList}
            onShareMember={addShoppingListMember}
            t={t}
          />
        </View>
        <View style={styles.content}>
          <ShoppingListItemsPanel
            listItems={listItems}
            onToggleItem={toggleShoppingListItem}
            onAddItem={addShoppingListItem}
            t={t}
          />
          <SearchPanel
            products={products}
            search={search}
            onSearchChange={setSearch}
            onSelect={(productId) => addShoppingListItem({ productId })}
            onCreateProduct={createProduct}
            categories={categories}
            t={t}
          />
        </View>
      </View>
    </HomeLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
  },
  layout: {
    gap: 16,
  },
  layoutWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  sidebar: {
    flex: 1,
  },
  sidebarWide: {
    maxWidth: 280,
  },
});
