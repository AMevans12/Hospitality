import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

export const tokens = {
  get: async () => ({
    access: await SecureStore.getItemAsync(ACCESS),
    refresh: await SecureStore.getItemAsync(REFRESH),
  }),
  set: async (access, refresh) => {
    await SecureStore.setItemAsync(ACCESS, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

let onLogout = null;
export const setLogoutHandler = (fn) => { onLogout = fn; };

// Attach the token to every request
api.interceptors.request.use(async (cfg) => {
  const access = await SecureStore.getItemAsync(ACCESS);
  if (access) cfg.headers.Authorization = `Bearer ${access}`;
  return cfg;
});

// If the token expired, refresh it once and retry; if that fails, log out
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && orig && !orig._retry && !orig.url.includes('/auth/')) {
      orig._retry = true;
      const refresh = await SecureStore.getItemAsync(REFRESH);
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          await SecureStore.setItemAsync(ACCESS, data.access);
          orig.headers.Authorization = `Bearer ${data.access}`;
          return api(orig);
        } catch (e) { /* fall through to logout */ }
      }
      await tokens.clear();
      if (onLogout) onLogout();
    }
    return Promise.reject(err);
  }
);

// Turn any error into a readable message
export function errorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Check your connection.';
  if (err.response.status === 401) return 'Wrong employee ID or PIN';
  const d = err.response.data;
  if (d && d.detail) return d.detail;
  if (d && typeof d === 'object') return Object.values(d).flat().join(' ');
  return 'Something went wrong';
}