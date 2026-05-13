export type GlucoseRange =
  | 'urgent-low'
  | 'low'
  | 'in-range'
  | 'high'
  | 'urgent-high'
  | 'unreliable';

export function classifyReading(value: number, status: string | null): GlucoseRange {
  if (status !== null && status !== '') return 'unreliable';
  if (value < 55) return 'urgent-low';
  if (value < 70) return 'low';
  if (value <= 180) return 'in-range';
  if (value <= 250) return 'high';
  return 'urgent-high';
}

export const RANGE_COLORS: Record<GlucoseRange, string> = {
  'urgent-low': '#dc2626',
  'low': '#f97316',
  'in-range': '#16a34a',
  'high': '#d97706',
  'urgent-high': '#b45309',
  'unreliable': '#6b7280',
};

export const RANGE_BG_COLORS: Record<GlucoseRange, string> = {
  'urgent-low': '#fef2f2',
  'low': '#fff7ed',
  'in-range': '#f0fdf4',
  'high': '#fffbeb',
  'urgent-high': '#fef3c7',
  'unreliable': '#f9fafb',
};

export function trendToArrow(trend: string): string {
  const map: Record<string, string> = {
    doubleUp: '↑↑',
    singleUp: '↑',
    fortyFiveUp: '↗',
    flat: '→',
    fortyFiveDown: '↘',
    singleDown: '↓',
    doubleDown: '↓↓',
    notComputable: '—',
    rateOutOfRange: '?',
  };
  return map[trend] ?? '—';
}

export function trendToText(trend: string, rate: number | null): string {
  const r = rate != null ? Math.abs(rate).toFixed(1) : null;
  const map: Record<string, string> = {
    doubleUp: r ? `Rising fast ${r} mg/dL/min` : 'Rising fast',
    singleUp: r ? `Rising ${r} mg/dL/min` : 'Rising',
    fortyFiveUp: r ? `Rising slowly ${r} mg/dL/min` : 'Rising slowly',
    flat: 'Steady',
    fortyFiveDown: r ? `Falling slowly ${r} mg/dL/min` : 'Falling slowly',
    singleDown: r ? `Falling ${r} mg/dL/min` : 'Falling',
    doubleDown: r ? `Falling fast ${r} mg/dL/min` : 'Falling fast',
    notComputable: 'Trend unavailable',
    rateOutOfRange: 'Trend out of range',
  };
  return map[trend] ?? 'Unknown trend';
}

export interface EgvRecord {
  value: number;
  trend: string;
  trendRate: number | null;
  status: string | null;
  timestamp: string;
}

export function computeTimeInRange(
  readings: EgvRecord[],
  low = 70,
  high = 180
): { inRange: number; low: number; high: number; urgentLow: number } {
  if (readings.length === 0) return { inRange: 0, low: 0, high: 0, urgentLow: 0 };
  const total = readings.length;
  const pct = (n: number) => Math.round((n / total) * 100);
  return {
    inRange: pct(readings.filter((r) => r.value >= low && r.value <= high).length),
    low: pct(readings.filter((r) => r.value < low && r.value >= 55).length),
    high: pct(readings.filter((r) => r.value > high).length),
    urgentLow: pct(readings.filter((r) => r.value < 55).length),
  };
}

export function computeGMI(averageGlucose: number): number {
  return parseFloat((3.31 + 0.02392 * averageGlucose).toFixed(2));
}

export function formatGlucose(value: number): string {
  return String(Math.round(value));
}
