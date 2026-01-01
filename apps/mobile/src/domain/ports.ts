import type { OutboxEventItem, Pack, ProductDetail, ProductListItem, TableCounts, ZoneItem } from './types';

export interface AppRepository {
  init(): Promise<void>;
  getStoreCount(): Promise<number>;
  listProducts(search: string): Promise<ProductListItem[]>;
  listZones(): Promise<ZoneItem[]>;
  getProductDetail(productId: number): Promise<ProductDetail | null>;
  createOutboxEvent(type: 'FOUND' | 'NOT_FOUND', payload: Record<string, unknown>): Promise<string>;
  listOutboxEvents(limit: number): Promise<OutboxEventItem[]>;
  getTableCounts(): Promise<TableCounts>;
  resetAndImportPack(pack: Pack): Promise<void>;
  ensurePack(pack: Pack): Promise<boolean>;
}
