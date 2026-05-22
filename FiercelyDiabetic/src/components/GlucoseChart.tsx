import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryScatter,
  VictoryArea,
} from 'victory-native';
import { parseTimestamp } from '@/utils/time';
import { classifyReading, RANGE_COLORS } from '@/utils/glucose';
import type { EgvRecord } from '@/utils/glucose';

interface Props {
  readings: EgvRecord[];
  height?: number;
  showAxes?: boolean;
  referenceLines?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function GlucoseChart({
  readings,
  height = 180,
  showAxes = false,
  referenceLines = true,
}: Props) {
  if (readings.length === 0) return <View style={[styles.empty, { height }]} />;

  const data = readings.map((r) => ({
    x: parseTimestamp(r.timestamp),
    y: r.value,
    range: classifyReading(r.value, r.status),
  }));

  const width = SCREEN_WIDTH - 32;
  const padding = showAxes
    ? { top: 10, bottom: 30, left: 40, right: 16 }
    : { top: 8, bottom: 8, left: 8, right: 8 };

  const yDomain: [number, number] = [
    Math.max(40, Math.min(...readings.map((r) => r.value)) - 20),
    Math.min(400, Math.max(...readings.map((r) => r.value)) + 20),
  ];

  return (
    <View style={styles.container}>
      <VictoryChart
        width={width}
        height={height}
        scale={{ x: 'time' }}
        padding={padding}
        domain={{ y: yDomain }}
      >
        {referenceLines && (
          <VictoryArea
            data={[
              { x: data[0].x, y: 180, y0: 70 },
              { x: data[data.length - 1].x, y: 180, y0: 70 },
            ]}
            style={{ data: { fill: '#bbf7d0', opacity: 0.4, stroke: 'none' } }}
          />
        )}

        {showAxes && (
          <VictoryAxis
            dependentAxis
            tickValues={[70, 120, 180, 250]}
            style={{
              axis: { stroke: '#e5e7eb' },
              tickLabels: { fontSize: 10, fill: '#9ca3af' },
              grid: { stroke: '#f3f4f6', strokeDasharray: '4,4' },
            }}
          />
        )}

        {showAxes && (
          <VictoryAxis
            style={{
              axis: { stroke: '#e5e7eb' },
              tickLabels: { fontSize: 9, fill: '#9ca3af', angle: -30 },
              grid: { stroke: 'transparent' },
            }}
            tickFormat={(t: Date | number | string) =>
              new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            }
            tickCount={4}
          />
        )}

        <VictoryLine
          data={data}
          style={{
            data: { stroke: '#22c55e', strokeWidth: 2.5, strokeLinejoin: 'round' },
          }}
          interpolation="monotoneX"
        />

        <VictoryScatter
          data={data.filter((d) => d.range !== 'in-range')}
          size={3}
          style={{
            data: {
              fill: ({ datum }: { datum?: { range: keyof typeof RANGE_COLORS } }) =>
                datum ? RANGE_COLORS[datum.range] : '#9ca3af',
            },
          }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  empty: {
    marginHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
});
