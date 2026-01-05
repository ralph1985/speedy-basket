import HomeLayout from '@presentation/components/HomeLayout';
import SearchPanel from '@presentation/components/SearchPanel';
import ShoppingListPanel from '@presentation/components/ShoppingListPanel';
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
    t,
  } = useHome();

  return (
    <HomeLayout>
      <ShoppingListPanel
        lists={lists}
        activeListId={activeListId}
        listItems={listItems}
        onSelectList={setActiveListId}
        onCreateList={createShoppingList}
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
    </HomeLayout>
  );
}
