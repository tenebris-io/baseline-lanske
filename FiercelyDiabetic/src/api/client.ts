import axios from 'axios';
import { Platform } from 'react-native';
import { getSession } from '@/store/session';

// Android emulator reaches the host machine via 10.0.2.2; iOS uses localhost.
// For a real device on the same WiFi, replace with your computer's local IP.
const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
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
