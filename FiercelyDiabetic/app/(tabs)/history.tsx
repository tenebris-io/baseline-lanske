import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHistory } from '@/hooks/useHistory';
import { GlucoseChart } from '@/components/GlucoseChart';
import { RangeBar } from '@/components/RangeBar';
import { hoursToLabel } from '@/utils/time';

const WINDOWS = [1, 3, 6, 24, 168];

export default function History() {
  const [hours, setHours] = useState(24);
  const { data, isLoading } = useHistory(hours);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>History</Text>

        <View style={styles.selector}>
          {WINDOWS.map((w) => (
            <TouchableOpacity
              key={w}
              style={[styles.chip, hours === w && styles.chipActive]}
              onPress={() => setHours(w)}
            >
              <Text style={[styles.chipText, hours === w && styles.chipTextActive]}>
                {hoursToLabel(w)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#16a34a" />
          </View>
        ) : data && data.readings.length > 0 ? (
          <>
            <GlucoseChart
              readings={data.readings}
              height={240}
              showAxes
              referenceLines
            />

            <View style={styles.statsGrid}>
              <StatCard label="Average" value={`${data.stats.average} mg/dL`} />
              <StatCard label="In Range" value={`${data.stats.timeInRange}%`} color="#16a34a" />
              <StatCard label="GMI" value={`${data.stats.gmi}%`} />
              <StatCard label="Low" value={`${data.stats.timeLow}%`} color="#dc2626" />
            </View>

            <View style={styles.rangeSection}>
              <Text style={styles.sectionLabel}>Time in Range</Text>
              <RangeBar
                inRange={data.stats.timeInRange}
                low={data.stats.timeLow}
                high={data.stats.timeHigh}
              />
            </View>
          </>
        ) : (
          <Text style={styles.empty}>No readings for this time window.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color = '#0f172a' }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40, gap: 20 },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  selector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#16a34a' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },
  center: { paddingVertical: 60, alignItems: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontWeight: '500' },
  rangeSection: { paddingHorizontal: 4, gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
  },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
