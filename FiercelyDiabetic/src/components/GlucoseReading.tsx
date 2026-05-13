import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  classifyReading,
  RANGE_BG_COLORS,
  RANGE_COLORS,
  trendToText,
} from '@/utils/glucose';
import { formatMinutesAgo, isStaleReading, isNoSignal } from '@/utils/time';
import { TrendArrow } from './TrendArrow';
import type { GlucoseCurrent } from '@/api/dexcom';

interface Props {
  reading: GlucoseCurrent;
}

export function GlucoseReading({ reading }: Props) {
  const range = classifyReading(reading.value, reading.status);
  const bgColor = RANGE_BG_COLORS[range];
  const fgColor = RANGE_COLORS[range];
  const stale = isStaleReading(reading.timestamp);
  const noSignal = isNoSignal(reading.timestamp);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {reading.status && (
        <View style={[styles.statusBadge, { backgroundColor: fgColor }]}>
          <Text style={styles.statusText}>{reading.status.toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.readingRow}>
        <Text style={[styles.value, { color: fgColor, opacity: noSignal ? 0.4 : 1 }]}>
          {noSignal ? '---' : Math.round(reading.value)}
        </Text>
        <View style={styles.trendColumn}>
          <TrendArrow trend={reading.trend} size={36} color={fgColor} />
          <Text style={[styles.unit, { color: fgColor }]}>mg/dL</Text>
        </View>
      </View>

      <Text style={[styles.trendText, { color: fgColor }]}>
        {noSignal ? 'No signal' : trendToText(reading.trend, reading.trendRate)}
      </Text>

      <Text style={[styles.time, stale && styles.staleTime]}>
        {formatMinutesAgo(reading.timestamp)}
        {stale && !noSignal ? ' · Stale' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    fontSize: 96,
    fontWeight: '200',
    letterSpacing: -4,
    lineHeight: 104,
  },
  trendColumn: {
    alignItems: 'center',
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  trendText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.85,
  },
  time: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
  staleTime: {
    color: '#f97316',
  },
});
