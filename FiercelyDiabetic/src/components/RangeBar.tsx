import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  inRange: number;
  low: number;
  high: number;
  urgentLow?: number;
}

export function RangeBar({ inRange, low, high, urgentLow = 0 }: Props) {
  const safeInRange = Math.max(0, inRange);
  const safeLow = Math.max(0, low + urgentLow);
  const safeHigh = Math.max(0, high);

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {safeLow > 0 && (
          <View style={[styles.segment, styles.low, { flex: safeLow }]} />
        )}
        {safeInRange > 0 && (
          <View style={[styles.segment, styles.inRange, { flex: safeInRange }]} />
        )}
        {safeHigh > 0 && (
          <View style={[styles.segment, styles.high, { flex: safeHigh }]} />
        )}
      </View>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: '#dc2626' }]}>{safeLow}% Low</Text>
        <Text style={[styles.label, { color: '#16a34a' }]}>{safeInRange}% In Range</Text>
        <Text style={[styles.label, { color: '#d97706' }]}>{safeHigh}% High</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
  },
  bar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  segment: {
    height: '100%',
  },
  low: { backgroundColor: '#fca5a5' },
  inRange: { backgroundColor: '#86efac' },
  high: { backgroundColor: '#fcd34d' },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
