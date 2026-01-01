import type { GetPackDeltaResponse } from '@speedy-basket/shared';

export type PackRepository = {
  getPackDelta(storeId: number, since?: string): Promise<GetPackDeltaResponse>;
};
