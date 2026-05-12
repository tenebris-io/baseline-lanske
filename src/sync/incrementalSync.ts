import { fetchEgvs } from '../api/egvs';
import { fetchEvents } from '../api/events';
import {
  getLastEgvTime,
  upsertEgvs,
  upsertEvents,
  startSyncLog,
  finishSyncLog,
  getLastSuccessfulSync,
} from '../db/store';
import type { EgvRow, EventRow } from '../db/store';

export async function incrementalSync(userId: number): Promise<void> {
  const syncId = startSyncLog(userId, 'incremental');
  let totalEgvs = 0;
  let totalEvents = 0;

  try {
    const lastSync = getLastSuccessfulSync(userId);
    if (!lastSync) {
      throw new Error(
        `No completed full sync found for user ${userId}. Run fullSync first.`
      );
    }

    // Use the most recent stored reading time as the pull window start
    const lastEgvTime = getLastEgvTime(userId);
    if (!lastEgvTime) {
      throw new Error(`No stored EGVs found for user ${userId}. Run fullSync first.`);
    }

    const startDate = lastEgvTime.replace(/Z$/, '');
    const endDate = new Date().toISOString().replace(/\.\d{3}Z$/, '');

    console.log(`[incrementalSync] user=${userId} pulling ${startDate} → ${endDate}`);

    const [egvs, events] = await Promise.all([
      fetchEgvs(userId, startDate, endDate),
      fetchEvents(userId, startDate, endDate),
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

    finishSyncLog(syncId, totalEgvs, totalEvents);
    console.log(`[incrementalSync] done — ${totalEgvs} EGVs, ${totalEvents} events`);
  } catch (err) {
    const msg = (err as Error).message;
    finishSyncLog(syncId, totalEgvs, totalEvents, msg);
    console.error(`[incrementalSync] failed: ${msg}`);
    throw err;
  }
}
