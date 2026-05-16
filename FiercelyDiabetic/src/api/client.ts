import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSession } from '@/store/session';

function getBaseUrl(): string {
  // On a real device, Metro's hostUri contains the LAN IP (e.g. "192.168.1.x:8081").
  // Extract that host and point at the backend on port 3000.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  // Emulator fallbacks
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getSession();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
