import type { PackRepository } from '../ports/PackRepository';

export async function getPackDelta(repo: PackRepository, storeId: number, since?: string) {
  return repo.getPackDelta(storeId, since);
}
