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
  listProducts(search: string, storeId: number): Promise<ProductListItem[]>;
  insertProduct(product: { id: number; name: string; category: string | null }): Promise<void>;
  listZones(storeId: number): Promise<ZoneItem[]>;
  getProductDetail(productId: number, storeId: number): Promise<ProductDetail | null>;
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
