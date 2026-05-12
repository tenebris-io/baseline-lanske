import { dexcomGet } from './dexcomClient';

interface TimeWindow {
  start: { systemTime: string; displayTime: string };
  end: { systemTime: string; displayTime: string };
}

export interface DataRange {
  calibrations: TimeWindow;
  egvs: TimeWindow;
  events: TimeWindow;
}

export async function fetchDataRange(userId: number): Promise<DataRange> {
  return dexcomGet<DataRange>(userId, '/v3/users/self/dataRange');
}

export function earliestSystemTime(range: DataRange): string {
  const candidates = [
    range.egvs?.start?.systemTime,
    range.events?.start?.systemTime,
  ].filter(Boolean) as string[];

  if (candidates.length === 0) {
    throw new Error('dataRange returned no valid start times');
  }

  return candidates.sort()[0];
}
