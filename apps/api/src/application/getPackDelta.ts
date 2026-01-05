import type { PackRepository } from '../ports/PackRepository';

export async function getPackDelta(
  repo: PackRepository,
  storeId: number,
  userId: string,
  since?: string
) {
  return repo.getPackDelta(storeId, userId, since);
}
