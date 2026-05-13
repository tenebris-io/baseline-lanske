import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime } from '@/utils/time';
import type { DexcomEvent } from '@/api/dexcom';

interface Props {
  event: DexcomEvent;
}

const EVENT_ICONS: Record<string, string> = {
  carbs: '🍞',
  insulin: '💉',
  exercise: '🏃',
  health: '❤️',
};

function eventTitle(event: DexcomEvent): string {
  switch (event.eventType) {
    case 'carbs':
      return `Carbs — ${event.value}${event.unit ?? 'g'}`;
    case 'insulin': {
      const subtype =
        event.eventSubType === 'fastActing' || event.eventSubType === 'rapidActing'
          ? 'Rapid-acting'
          : event.eventSubType === 'longActing'
          ? 'Long-acting'
          : 'Insulin';
      return `${subtype} — ${event.value} ${event.unit ?? 'units'}`;
    }
    case 'exercise':
      return event.eventSubType
        ? `${event.eventSubType} exercise`
        : 'Exercise';
    case 'health':
      return event.eventSubType ?? 'Health event';
    default:
      return event.eventType;
  }
}

export function EventCard({ event }: Props) {
  const icon = EVENT_ICONS[event.eventType] ?? '📝';
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{eventTitle(event)}</Text>
        <Text style={styles.time}>{formatTime(event.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  time: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
