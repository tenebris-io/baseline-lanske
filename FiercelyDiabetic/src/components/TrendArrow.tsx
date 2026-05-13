import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { trendToArrow } from '@/utils/glucose';

interface Props {
  trend: string;
  size?: number;
  color?: string;
}

export function TrendArrow({ trend, size = 32, color = '#111827' }: Props) {
  return (
    <Text style={[styles.arrow, { fontSize: size, color }]}>
      {trendToArrow(trend)}
    </Text>
  );
}

const styles = StyleSheet.create({
  arrow: {
    fontWeight: '300',
    lineHeight: 40,
  },
});
