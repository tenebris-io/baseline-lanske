import apiClient from './client';
import type { EgvRecord } from '@/utils/glucose';

export interface GlucoseCurrent {
  value: number;
  trend: string;
  trendRate: number | null;
  status: string | null;
  timestamp: string;
  minutesAgo: number;
}

export interface GlucoseStats {
  timeInRange: number;
  timeLow: number;
  timeHigh: number;
  average: number;
  gmi: number;
}

export interface GlucoseHistory {
  readings: EgvRecord[];
  unit: string;
  stats: GlucoseStats;
}

export interface DexcomEvent {
  id: string;
  eventType: 'carbs' | 'insulin' | 'exercise' | 'health';
  eventSubType: string | null;
  value: number | null;
  unit: string | null;
  timestamp: string;
}

export async function fetchCurrentGlucose(): Promise<GlucoseCurrent> {
  const { data } = await apiClient.get<GlucoseCurrent>('/api/glucose/current');
  return data;
}

export async function fetchGlucoseHistory(hours: number): Promise<GlucoseHistory> {
  const { data } = await apiClient.get<GlucoseHistory>('/api/glucose/history', {
    params: { hours },
  });
  return data;
}

export async function fetchRecentEvents(hours: number = 24): Promise<DexcomEvent[]> {
  const { data } = await apiClient.get<{ events: DexcomEvent[] }>('/api/events/recent', {
    params: { hours },
  });
  return data.events;
}

export async function triggerSync(): Promise<void> {
  await apiClient.post('/api/sync/trigger');
}

export async function initiateAuth(): Promise<{ authUrl: string; state: string }> {
  const { data } = await apiClient.post<{ authUrl: string; state: string }>(
    '/api/auth/initiate'
  );
  return data;
}

export async function getAuthStatus(): Promise<{
  connected: boolean;
  lastSync: string | null;
  userId: number;
}> {
  const { data } = await apiClient.get('/api/auth/status');
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}
