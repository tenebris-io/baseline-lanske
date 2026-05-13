import { create } from 'zustand';
import type { GlucoseCurrent } from '@/api/dexcom';

interface GlucoseState {
  current: GlucoseCurrent | null;
  lastFetched: number | null;
  setCurrent: (reading: GlucoseCurrent) => void;
  clear: () => void;
}

export const useGlucoseStore = create<GlucoseState>((set) => ({
  current: null,
  lastFetched: null,
  setCurrent: (reading) => set({ current: reading, lastFetched: Date.now() }),
  clear: () => set({ current: null, lastFetched: null }),
}));
