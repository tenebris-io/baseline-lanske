import { useEffect, useState } from 'react';
import { fetchRecentEvents } from '@/api/dexcom';
import type { DexcomEvent } from '@/api/dexcom';

export function useEvents(hours: number = 24) {
  const [events, setEvents] = useState<DexcomEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const result = await fetchRecentEvents(hours);
        if (!cancelled) {
          setEvents(result);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to load events');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [hours]);

  return { events, isLoading, error };
}
