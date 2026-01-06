import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppRepository } from '@domain/ports';
import type { Pack } from '@domain/types';
import type { PackDelta } from '@shared/sync';
import type { EventType } from '@shared/types';
import {
  applyPackDelta,
  createOutboxEvent,
  getProductDetail,
  getStoreCount,
  getTableCounts,
  getMetaValue,
  importPack,
  importPackIfNeeded,
  createLocalProduct,
  insertProduct,
  initDatabase,
  listCategories,
  listProductsNeedingSync,
  listOutboxEvents,
  listPendingOutboxEvents,
  listProducts,
  listStores,
  listZones,
  openDatabase,
  markOutboxEventsSent,
  resetDatabase,
  setMetaValue,
  listShoppingLists,
  createShoppingListLocal,
  listShoppingListItems,
  addShoppingListItemLocal,
  toggleShoppingListItemLocal,
  listShoppingListsNeedingSync,
  listShoppingListItemsNeedingSync,
  setShoppingListRemoteId,
  getShoppingListRemoteId,
  setShoppingListItemRemoteId,
  markShoppingListItemSynced,
  replaceProductId,
} from './db';

export class SqliteRepository implements AppRepository {
  private db: SQLiteDatabase | null = null;

  async init() {
    this.db = await openDatabase();
    await initDatabase(this.db);
  }

  async getStoreCount() {
    return getStoreCount(this.requireDb());
  }

  async listStores() {
    return listStores(this.requireDb());
  }

  async listProducts(search: string, storeId: number, locale: string) {
    return listProducts(this.requireDb(), search, storeId, locale);
  }

  async listCategories() {
    return listCategories(this.requireDb());
  }

  async createLocalProduct(payload: { name: string; category: string | null; locale: string }) {
    return createLocalProduct(this.requireDb(), payload);
  }

  async listProductsNeedingSync(locale: string) {
    return listProductsNeedingSync(this.requireDb(), locale);
  }

  async replaceProductId(localId: number, remoteId: number) {
    return replaceProductId(this.requireDb(), localId, remoteId);
  }

  async insertProduct(product: {
    id: number;
    name: string;
    category: string | null;
    locale: string;
  }) {
    await insertProduct(this.requireDb(), product);
  }

  async listZones(storeId: number) {
    return listZones(this.requireDb(), storeId);
  }

  async getProductDetail(productId: number, storeId: number, locale: string) {
    return getProductDetail(this.requireDb(), productId, storeId, locale);
  }

  async listShoppingLists() {
    return listShoppingLists(this.requireDb());
  }

  async createShoppingList(payload: { name: string }) {
    return createShoppingListLocal(this.requireDb(), payload);
  }

  async listShoppingListItems(listId: number, locale: string) {
    return listShoppingListItems(this.requireDb(), listId, locale);
  }

  async addShoppingListItem(
    listId: number,
    payload: { productId?: number; label?: string; qty?: string | null }
  ) {
    return addShoppingListItemLocal(this.requireDb(), listId, payload);
  }

  async toggleShoppingListItem(itemId: number, checked: boolean) {
    return toggleShoppingListItemLocal(this.requireDb(), itemId, checked);
  }

  async listShoppingListsNeedingSync() {
    return listShoppingListsNeedingSync(this.requireDb());
  }

  async listShoppingListItemsNeedingSync() {
    return listShoppingListItemsNeedingSync(this.requireDb());
  }

  async setShoppingListRemoteId(listId: number, remoteId: number) {
    return setShoppingListRemoteId(this.requireDb(), listId, remoteId);
  }

  async getShoppingListRemoteId(listId: number) {
    return getShoppingListRemoteId(this.requireDb(), listId);
  }

  async setShoppingListItemRemoteId(itemId: number, remoteId: number) {
    return setShoppingListItemRemoteId(this.requireDb(), itemId, remoteId);
  }

  async markShoppingListItemSynced(itemId: number) {
    return markShoppingListItemSynced(this.requireDb(), itemId);
  }

  async createOutboxEvent(type: EventType, payload: Record<string, unknown>) {
    return createOutboxEvent(this.requireDb(), type, payload);
  }

  async listOutboxEvents(limit: number) {
    return listOutboxEvents(this.requireDb(), limit);
  }

  async listPendingOutboxEvents(limit: number) {
    return listPendingOutboxEvents(this.requireDb(), limit);
  }

  async markOutboxEventsSent(ids: string[]) {
    await markOutboxEventsSent(this.requireDb(), ids);
  }

  async getTableCounts() {
    return getTableCounts(this.requireDb());
  }

  async resetAndImportPack(pack: Pack) {
    const db = this.requireDb();
    await resetDatabase(db);
    await importPack(db, pack, true);
  }

  async ensurePack(pack: Pack) {
    return importPackIfNeeded(this.requireDb(), pack);
  }

  async getPackVersion() {
    return getMetaValue(this.requireDb(), 'pack_version');
  }

  async setPackVersion(version: string) {
    await setMetaValue(this.requireDb(), 'pack_version', version);
  }

  async applyPackDelta(delta: PackDelta) {
    await applyPackDelta(this.requireDb(), delta);
    await this.setPackVersion(delta.version);
  }

  async getMetaValue(key: string) {
    return getMetaValue(this.requireDb(), key);
  }

  async setMetaValue(key: string, value: string) {
    await setMetaValue(this.requireDb(), key, value);
  }

  private requireDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
