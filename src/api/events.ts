import { dexcomGet } from './dexcomClient';

export interface DexcomEvent {
  eventType: 'carbs' | 'insulin' | 'exercise' | 'health';
  eventSubType: string | null;
  value: number | null;
  unit: string | null;
  displayTime: string;
  systemTime: string;
  id: string;
}

interface EventsResponse {
  events: DexcomEvent[];
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
  return data.events ?? [];
}
