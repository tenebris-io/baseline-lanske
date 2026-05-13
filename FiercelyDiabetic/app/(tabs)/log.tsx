import { View, Text, SectionList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { formatDate, parseTimestamp } from '@/utils/time';
import type { DexcomEvent } from '@/api/dexcom';

function groupByDay(events: DexcomEvent[]) {
  const groups: Record<string, DexcomEvent[]> = {};
  for (const ev of events) {
    const label = formatDate(ev.timestamp);
    if (!groups[label]) groups[label] = [];
    groups[label].push(ev);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function EventLog() {
  const { events, isLoading, error } = useEvents(168); // last 7 days

  const sections = groupByDay(
    [...events].sort(
      (a, b) =>
        parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime()
    )
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Event Log</Text>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#16a34a" />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && sections.length === 0 && (
        <Text style={styles.empty}>No logged events in the last 7 days.</Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc2626', paddingHorizontal: 20 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 60, fontSize: 15 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  list: { paddingBottom: 32 },
});
