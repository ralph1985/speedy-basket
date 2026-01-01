import type { AppRepository } from './ports';
import type { Pack } from './types';

export async function initApp(repo: AppRepository) {
  await repo.init();
}

export async function loadStoreCount(repo: AppRepository) {
  return repo.getStoreCount();
}

export async function loadProducts(repo: AppRepository, search = '') {
  return repo.listProducts(search);
}

export async function loadZones(repo: AppRepository) {
  return repo.listZones();
}

export async function loadProductDetail(repo: AppRepository, productId: number) {
  return repo.getProductDetail(productId);
}

export async function recordOutboxEvent(
  repo: AppRepository,
  type: 'FOUND' | 'NOT_FOUND',
  payload: Record<string, unknown>
) {
  return repo.createOutboxEvent(type, payload);
}

export async function loadOutboxEvents(repo: AppRepository, limit = 20) {
  return repo.listOutboxEvents(limit);
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
