import type {
  OutboxEventItem,
  Pack,
  ProductDetail,
  ProductListItem,
  TableCounts,
  ZoneItem,
  StoreItem,
} from './types';
import type { EventType } from '@shared/types';
import type { PackDelta } from '@shared/sync';

export interface AppRepository {
  init(): Promise<void>;
  getStoreCount(): Promise<number>;
  listStores(): Promise<StoreItem[]>;
  listProducts(search: string, storeId: number, locale: string): Promise<ProductListItem[]>;
  listCategories(): Promise<string[]>;
  createLocalProduct(payload: { name: string; category: string | null; locale: string }): Promise<number>;
  listProductsNeedingSync(locale: string): Promise<Array<{ id: number; name: string; category: string | null }>>;
  replaceProductId(localId: number, remoteId: number): Promise<void>;
  insertProduct(product: {
    id: number;
    name: string;
    category: string | null;
    locale: string;
  }): Promise<void>;
  listZones(storeId: number): Promise<ZoneItem[]>;
  getProductDetail(
    productId: number,
    storeId: number,
    locale: string
  ): Promise<ProductDetail | null>;
  listShoppingLists(): Promise<Array<{ id: number; name: string; remoteId: number | null }>>;
  createShoppingList(payload: { name: string }): Promise<{
    id: number;
    name: string;
    remoteId: number | null;
  }>;
  listShoppingListItems(
    listId: number,
    locale: string
  ): Promise<Array<{
    id: number;
    listId: number;
    productId: number | null;
    label: string;
    qty: string | null;
    checked: number;
    productName: string | null;
  }>>;
  addShoppingListItem(
    listId: number,
    payload: { productId?: number; label?: string; qty?: string | null }
  ): Promise<number>;
  toggleShoppingListItem(itemId: number, checked: boolean): Promise<void>;
  listShoppingListsNeedingSync(): Promise<Array<{ id: number; name: string }>>;
  listShoppingListItemsNeedingSync(): Promise<Array<{
    id: number;
    listId: number;
    remoteId: number | null;
    productId: number | null;
    label: string | null;
    qty: string | null;
    checked: number;
    updatedAt: string;
    syncedAt: string | null;
  }>>;
  setShoppingListRemoteId(listId: number, remoteId: number): Promise<void>;
  getShoppingListRemoteId(listId: number): Promise<number | null>;
  setShoppingListItemRemoteId(itemId: number, remoteId: number): Promise<void>;
  markShoppingListItemSynced(itemId: number): Promise<void>;
  createOutboxEvent(type: EventType, payload: Record<string, unknown>): Promise<string>;
  listOutboxEvents(limit: number): Promise<OutboxEventItem[]>;
  listPendingOutboxEvents(limit: number): Promise<OutboxEventItem[]>;
  markOutboxEventsSent(ids: string[]): Promise<void>;
  getTableCounts(): Promise<TableCounts>;
  resetAndImportPack(pack: Pack): Promise<void>;
  ensurePack(pack: Pack): Promise<boolean>;
  getPackVersion(): Promise<string | null>;
  setPackVersion(version: string): Promise<void>;
  applyPackDelta(delta: PackDelta): Promise<void>;
  getMetaValue(key: string): Promise<string | null>;
  setMetaValue(key: string, value: string): Promise<void>;
}
