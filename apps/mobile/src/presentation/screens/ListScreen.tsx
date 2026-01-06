import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FAB, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeLayout from '@presentation/components/HomeLayout';
import SearchPanel from '@presentation/components/SearchPanel';
import ShoppingListItemsPanel from '@presentation/components/ShoppingListItemsPanel';
import ShoppingListSidebar from '@presentation/components/ShoppingListSidebar';
import { useHome } from '@presentation/context/HomeContext';
import colors from '@presentation/styles/colors';

export default function ListScreen() {
  const {
    lists,
    activeListId,
    setActiveListId,
    createShoppingList,
    listItems,
    addShoppingListItem,
    toggleShoppingListItem,
    products,
    search,
    setSearch,
    createProduct,
    categories,
    t,
  } = useHome();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const drawerWidth = 280;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-drawerWidth)).current;
  const insets = useSafeAreaInsets();
  const activeListName = useMemo(
    () => (activeListId ? lists.find((list) => list.id === activeListId)?.name ?? null : null),
    [activeListId, lists]
  );

  useEffect(() => {
    if (isDrawerOpen) {
      setIsDrawerVisible(true);
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else if (isDrawerVisible) {
      Animated.timing(drawerTranslateX, {
        toValue: -drawerWidth,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsDrawerVisible(false);
        }
      });
    }
  }, [drawerTranslateX, drawerWidth, isDrawerOpen, isDrawerVisible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isWide && gesture.moveX < 24 && gesture.dx > 12 && Math.abs(gesture.dy) < 40,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 40) {
            setIsDrawerOpen(true);
          }
        },
      }),
    [isWide]
  );

  const handleSelectList = (listId: number) => {
    setActiveListId(listId);
    if (!isWide) {
      setIsDrawerOpen(false);
    }
  };

  return (
    <HomeLayout>
      <View style={[styles.layout, isWide && styles.layoutWide]} {...panResponder.panHandlers}>
        {isWide ? (
          <View style={[styles.sidebar, styles.sidebarWide]}>
            <ShoppingListSidebar
              lists={lists}
              activeListId={activeListId}
              onSelectList={handleSelectList}
              onCreateList={createShoppingList}
              t={t}
            />
          </View>
        ) : null}
        <View style={styles.content}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {activeListName ? t('list.active', { name: activeListName }) : t('list.noActive')}
            </Text>
            {!activeListName ? (
              <Text style={styles.listHint}>{t('list.createHint')}</Text>
            ) : null}
          </View>
          {activeListName ? (
            <>
              <ShoppingListItemsPanel
                listItems={listItems}
                onAddItem={addShoppingListItem}
                onToggleItem={toggleShoppingListItem}
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
            </>
          ) : null}
        </View>
      </View>

      {!isWide ? (
        <FAB
          icon="cart-outline"
          onPress={() => setIsDrawerOpen(true)}
          style={[
            styles.drawerFab,
            { bottom: Math.max(24, insets.bottom + 12) },
          ]}
          color={colors.onPrimary}
        />
      ) : null}

      {!isWide && isDrawerVisible ? (
        <Portal>
          <View style={styles.drawerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDrawerOpen(false)} />
            <Animated.View
              style={[styles.drawerPanel, { transform: [{ translateX: drawerTranslateX }] }]}
            >
              <ShoppingListSidebar
                lists={lists}
                activeListId={activeListId}
                onSelectList={handleSelectList}
                onCreateList={createShoppingList}
                t={t}
              />
            </Animated.View>
          </View>
        </Portal>
      ) : null}
    </HomeLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
  },
  drawerFab: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    left: 16,
    position: 'absolute',
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-start',
  },
  drawerPanel: {
    height: '100%',
    padding: 0,
    width: 280,
  },
  layout: {
    gap: 16,
  },
  layoutWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  listHeader: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 16,
    width: '100%',
  },
  listHint: {
    color: colors.textSoft,
    fontSize: 13,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sidebar: {
    alignSelf: 'stretch',
    flex: 1,
  },
  sidebarWide: {
    maxWidth: 280,
  },
});
