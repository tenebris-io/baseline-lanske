import { Slot, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getSession } from '@/store/session';
import apiClient from '@/api/client';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!authed && !inAuth) router.replace('/(auth)/login');
    else if (authed && inAuth) router.replace('/(tabs)');
  }, [authed, segments, ready]);

  async function checkAuth() {
    const token = await getSession();
    if (!token) { setAuthed(false); setReady(true); return; }
    try {
      const { data } = await apiClient.get('/api/auth/validate');
      setAuthed(data.valid === true);
    } catch {
      setAuthed(false);
    }
    setReady(true);
  }

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
