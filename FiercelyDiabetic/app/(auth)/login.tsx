import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { setSession } from '@/store/session';
import { initiateAuth } from '@/api/dexcom';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const { authUrl } = await initiateAuth();

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'fiercelydiabetic://'
      );

      if (result.type === 'success') {
        const url = new URL(result.url);
        const session = url.searchParams.get('session');
        const error = url.searchParams.get('error');

        if (error) {
          Alert.alert('Auth failed', 'Could not complete Dexcom sign-in. Please try again.');
          return;
        }

        if (session) {
          await setSession(session);
          router.replace('/(tabs)');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Could not reach the server. Is it running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🩸</Text>
        <Text style={styles.title}>Fiercely Diabetic</Text>
        <Text style={styles.tagline}>Your CGM data, beautifully clear.</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleConnect}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Connect Dexcom</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Uses the Dexcom sandbox for testing.{'\n'}
        Your Dexcom tokens never leave the server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f0fdf4',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    color: '#86efac',
    textAlign: 'center',
    fontWeight: '400',
  },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
});
