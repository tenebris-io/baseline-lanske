import { dexcomGet } from './dexcomClient';

export interface DexcomEvent {
  recordId: string;
  eventType: 'carbs' | 'insulin' | 'exercise' | 'health';
  eventSubType: string | null;
  value: string | number | null;
  unit: string | null;
  displayTime: string;
  systemTime: string;
  eventStatus: string | null;
}

interface EventsResponse {
  records: DexcomEvent[];
}

export async function fetchEvents(
  userId: number,
  startDate: string,
  endDate: string
): Promise<DexcomEvent[]> {
  const data = await dexcomGet<EventsResponse>(userId, '/v3/users/self/events', {
    startDate,
    endDate,
  });
  return data.records ?? [];
}
