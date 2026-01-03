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
  initDatabase,
  listOutboxEvents,
  listPendingOutboxEvents,
  listProducts,
  listZones,
  openDatabase,
  markOutboxEventsSent,
  resetDatabase,
  setMetaValue,
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

  private requireDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
