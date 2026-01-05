import type { AppRepository } from './ports';
import type { Pack } from './types';
import type { EventType } from '@shared/types';

export async function initApp(repo: AppRepository) {
  await repo.init();
}

export async function loadStoreCount(repo: AppRepository) {
  return repo.getStoreCount();
}

export async function loadStores(repo: AppRepository) {
  return repo.listStores();
}

export async function loadProducts(repo: AppRepository, search = '', storeId: number) {
  return repo.listProducts(search, storeId);
}

export async function addProduct(
  repo: AppRepository,
  product: { id: number; name: string; category: string | null }
) {
  return repo.insertProduct(product);
}

export async function loadZones(repo: AppRepository, storeId: number) {
  return repo.listZones(storeId);
}

export async function loadProductDetail(repo: AppRepository, productId: number, storeId: number) {
  return repo.getProductDetail(productId, storeId);
}

export async function recordOutboxEvent(
  repo: AppRepository,
  type: EventType,
  payload: Record<string, unknown>
) {
  return repo.createOutboxEvent(type, payload);
}

export async function loadOutboxEvents(repo: AppRepository, limit = 20) {
  return repo.listOutboxEvents(limit);
}

export async function loadPendingOutboxEvents(repo: AppRepository, limit = 20) {
  return repo.listPendingOutboxEvents(limit);
}

export async function loadTableCounts(repo: AppRepository) {
  return repo.getTableCounts();
}

export async function resetWithPack(repo: AppRepository, pack: Pack) {
  await repo.resetAndImportPack(pack);
}

export async function ensurePack(repo: AppRepository, pack: Pack) {
  return repo.ensurePack(pack);
}
