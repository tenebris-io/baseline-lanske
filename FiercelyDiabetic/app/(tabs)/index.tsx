import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlucose } from '@/hooks/useGlucose';
import { useHistory } from '@/hooks/useHistory';
import { GlucoseReading } from '@/components/GlucoseReading';
import { GlucoseChart } from '@/components/GlucoseChart';
import { RangeBar } from '@/components/RangeBar';
import { computeTimeInRange } from '@/utils/glucose';
import { triggerSync } from '@/api/dexcom';

export default function Dashboard() {
  const { current, isLoading, error, refresh } = useGlucose();
  const { data: history } = useHistory(3);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await triggerSync();
      await new Promise((r) => setTimeout(r, 3000));
    } catch {}
    await refresh();
    setRefreshing(false);
  }

  const tir = history
    ? computeTimeInRange(history.readings)
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#16a34a"
          />
        }
      >
        <Text style={styles.header}>Now</Text>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {current && <GlucoseReading reading={current} />}

        {history && history.readings.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/history')}
            activeOpacity={0.9}
          >
            <Text style={styles.sectionLabel}>Last 3 Hours</Text>
            <GlucoseChart readings={history.readings} height={140} />
          </TouchableOpacity>
        )}

        {tir && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Time in Range · 24h</Text>
            <RangeBar
              inRange={tir.inRange}
              low={tir.low}
              high={tir.high}
              urgentLow={tir.urgentLow}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 32, gap: 20 },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  center: { alignItems: 'center', paddingVertical: 40 },
  errorBox: {
    marginHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
  },
  errorText: { color: '#dc2626', fontSize: 14 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
});
