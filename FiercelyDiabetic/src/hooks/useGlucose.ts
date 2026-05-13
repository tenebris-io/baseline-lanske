import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { fetchCurrentGlucose } from '@/api/dexcom';
import { useGlucoseStore } from '@/store/glucoseStore';
import type { GlucoseCurrent } from '@/api/dexcom';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useGlucose() {
  const { current, setCurrent } = useGlucoseStore();
  const [isLoading, setIsLoading] = useState(current === null);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await fetchCurrentGlucose();
      setCurrent(data);
      setError(null);
    } catch {
      setError('Failed to fetch glucose reading');
    } finally {
      setIsLoading(false);
    }
  }, [setCurrent]);

  useEffect(() => {
    fetch();

    const interval = setInterval(fetch, POLL_INTERVAL_MS);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') fetch();
    };
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetch]);

  return { current, isLoading, error, refresh: fetch };
}
