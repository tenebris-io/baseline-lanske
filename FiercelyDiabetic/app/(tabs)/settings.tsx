import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { getAuthStatus, logout, triggerSync } from '@/api/dexcom';
import { clearSession } from '@/store/session';
import { useGlucoseStore } from '@/store/glucoseStore';

export default function Settings() {
  const [status, setStatus] = useState<{ connected: boolean; lastSync: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const clear = useGlucoseStore((s) => s.clear);

  useEffect(() => {
    getAuthStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerSync();
      Alert.alert('Sync started', 'New data will appear in a few moments.');
    } catch {
      Alert.alert('Sync failed', 'Could not start sync. Check the server.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Disconnect Dexcom', 'This will sign you out and clear your session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try { await logout(); } catch {}
          await clearSession();
          clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Settings</Text>

        <Section title="Dexcom Connection">
          <Row
            label="Status"
            value={status?.connected ? '✅ Connected' : '❌ Disconnected'}
          />
          <Row
            label="Last Sync"
            value={status?.lastSync ? new Date(status.lastSync + 'Z').toLocaleString() : 'Never'}
          />
          <TouchableOpacity style={styles.actionRow} onPress={handleSync} disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color="#16a34a" />
            ) : (
              <Text style={styles.actionText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        </Section>

        <Section title="Target Range">
          <Row label="Low threshold" value="70 mg/dL" />
          <Row label="High threshold" value="180 mg/dL" />
          <Text style={styles.note}>
            Range customization coming in a future update.
          </Text>
        </Section>

        <Section title="About">
          <Row label="Version" value="1.0.0" />
          <Row label="Data source" value="Dexcom Sandbox" />
        </Section>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Disconnect & Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 48, gap: 24 },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: { gap: 6, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  actionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionText: { fontSize: 15, color: '#16a34a', fontWeight: '600' },
  note: { fontSize: 12, color: '#9ca3af', paddingHorizontal: 4, paddingTop: 2 },
  logoutButton: {
    marginHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
});
