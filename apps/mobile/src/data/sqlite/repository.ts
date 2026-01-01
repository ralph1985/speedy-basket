import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppRepository } from '@domain/ports';
import type { Pack } from '@domain/types';
import {
  createOutboxEvent,
  getProductDetail,
  getStoreCount,
  getTableCounts,
  importPack,
  importPackIfNeeded,
  initDatabase,
  listOutboxEvents,
  listProducts,
  listZones,
  openDatabase,
  resetDatabase,
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

  async listProducts(search: string) {
    return listProducts(this.requireDb(), search);
  }

  async listZones() {
    return listZones(this.requireDb());
  }

  async getProductDetail(productId: number) {
    return getProductDetail(this.requireDb(), productId);
  }

  async createOutboxEvent(type: 'FOUND' | 'NOT_FOUND', payload: Record<string, unknown>) {
    return createOutboxEvent(this.requireDb(), type, payload);
  }

  async listOutboxEvents(limit: number) {
    return listOutboxEvents(this.requireDb(), limit);
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

  private requireDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
