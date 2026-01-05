import type { GetPackDeltaResponse } from '@speedy-basket/shared';

export type PackRepository = {
  getPackDelta(storeId: number, userId: string, since?: string): Promise<GetPackDeltaResponse>;
};
