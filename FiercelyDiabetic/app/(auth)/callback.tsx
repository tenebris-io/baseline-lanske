import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

// Handles the deep link fiercelydiabetic://auth/callback?session=X
// when the app is reopened from a background/closed state.
export default function Callback() {
  const { session, error } = useLocalSearchParams<{ session?: string; error?: string }>();
  const signIn = useAuthStore((s) => s.signIn);

  useEffect(() => {
    if (error) {
      router.replace('/(auth)/login');
      return;
    }
    if (session) {
      signIn(session).then(() => router.replace('/(tabs)'));
    }
  }, [session, error, signIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#16a34a" />
      <Text style={styles.text}>Completing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 16,
  },
  text: {
    color: '#86efac',
    fontSize: 16,
  },
});
