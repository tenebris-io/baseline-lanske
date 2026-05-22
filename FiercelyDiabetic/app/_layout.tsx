import { Slot, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';

export default function RootLayout() {
  // Auth state now lives in a shared store, so login/logout update it live and
  // this gate reacts immediately (instead of relying on a one-time startup snapshot).
  const authed = useAuthStore((s) => s.authed);
  const ready = useAuthStore((s) => s.ready);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const segments = useSegments();

  // One-time startup auth check.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Keep the user on the correct side of the auth gate.
  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!authed && !inAuth) router.replace('/(auth)/login');
    else if (authed && inAuth) router.replace('/(tabs)');
  }, [authed, segments, ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
