import { useEffect, useState } from 'react';
import { fetchGlucoseHistory } from '@/api/dexcom';
import type { GlucoseHistory } from '@/api/dexcom';

export function useHistory(hours: number) {
  const [data, setData] = useState<GlucoseHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const result = await fetchGlucoseHistory(hours);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to load history');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [hours]);

  return { data, isLoading, error };
}
