import { dexcomGet } from './dexcomClient';

export interface EgvPoint {
  systemTime: string;
  displayTime: string;
  value: number;
  realtimeValue: number;
  smoothedValue: number;
  status: string | null;
  trend: string;
  trendRate: number;
}

interface EgvsResponse {
  records: EgvPoint[];
  unit: string;
  rateUnit: string;
}

export async function fetchEgvs(
  userId: number,
  startDate: string,
  endDate: string
): Promise<EgvPoint[]> {
  const data = await dexcomGet<EgvsResponse>(userId, '/v3/users/self/egvs', {
    startDate,
    endDate,
  });
  return data.records ?? [];
}
