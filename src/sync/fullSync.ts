import { fetchDataRange, earliestSystemTime } from '../api/dataRange';
import { fetchEgvs } from '../api/egvs';
import { fetchEvents } from '../api/events';
import { upsertEgvs, upsertEvents, startSyncLog, finishSyncLog } from '../db/store';
import type { EgvRow, EventRow } from '../db/store';

// Dexcom max window is 90 days; use 89 to stay safely under
const CHUNK_DAYS = 89;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace(/\.\d{3}Z$/, '');
}

function toIso(systemTime: string): string {
  // Dexcom returns times like "2024-01-01T00:00:00" — no Z suffix in sandbox
  return systemTime.replace(/Z$/, '');
}

function chunkDateRange(
  start: string,
  end: string
): Array<{ startDate: string; endDate: string }> {
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  let cursor = start;

  while (cursor < end) {
    const chunkEnd = addDays(cursor, CHUNK_DAYS);
    chunks.push({
      startDate: cursor,
      endDate: chunkEnd < end ? chunkEnd : end,
    });
    cursor = chunkEnd < end ? chunkEnd : end;
  }

  return chunks;
}

export async function fullSync(userId: number): Promise<void> {
  const syncId = startSyncLog(userId, 'full');
  let totalEgvs = 0;
  let totalEvents = 0;

  try {
    console.log(`[fullSync] user=${userId} — fetching data range`);
    const range = await fetchDataRange(userId);
    const startDate = toIso(earliestSystemTime(range));
    const endDate = new Date().toISOString().replace(/\.\d{3}Z$/, '');

    console.log(`[fullSync] date range: ${startDate} → ${endDate}`);
    const chunks = chunkDateRange(startDate, endDate);
    console.log(`[fullSync] ${chunks.length} chunk(s) to process`);

    for (let i = 0; i < chunks.length; i++) {
      const { startDate: s, endDate: e } = chunks[i];
      console.log(`[fullSync] chunk ${i + 1}/${chunks.length}: ${s} → ${e}`);

      const [egvs, events] = await Promise.all([
        fetchEgvs(userId, s, e),
        fetchEvents(userId, s, e),
      ]);

      const egvRows: EgvRow[] = egvs.map((pt) => ({
        systemTime: pt.systemTime,
        displayTime: pt.displayTime,
        value: pt.value,
        trend: pt.trend ?? null,
        trendRate: pt.trendRate ?? null,
        status: pt.status ?? null,
        rawJson: JSON.stringify(pt),
      }));

      const eventRows: EventRow[] = events.map((ev) => ({
        eventId: ev.id,
        eventType: ev.eventType,
        eventSubtype: ev.eventSubType ?? null,
        value: ev.value ?? null,
        unit: ev.unit ?? null,
        systemTime: ev.systemTime,
        displayTime: ev.displayTime,
        rawJson: JSON.stringify(ev),
      }));

      totalEgvs += upsertEgvs(userId, egvRows);
      totalEvents += upsertEvents(userId, eventRows);
    }

    finishSyncLog(syncId, totalEgvs, totalEvents);
    console.log(`[fullSync] done — ${totalEgvs} EGVs, ${totalEvents} events`);
  } catch (err) {
    const msg = (err as Error).message;
    finishSyncLog(syncId, totalEgvs, totalEvents, msg);
    console.error(`[fullSync] failed: ${msg}`);
    throw err;
  }
}
