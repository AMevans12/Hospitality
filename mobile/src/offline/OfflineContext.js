import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Alert, Text, TouchableOpacity, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const Q_KEY = 'offline_queue_v1';
const R_KEY = 'offline_rejected_v1';

const read = async (k) => {
  try { return JSON.parse((await AsyncStorage.getItem(k)) || '[]'); } catch (e) { return []; }
};
const write = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v));
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const DEFAULT = {
  online: true, pending: 0, rejected: [],
  queueAttendance: async () => ({ duplicate: false }), syncNow: async () => {}, dismissRejected: async () => {},
};
const Ctx = createContext(DEFAULT);
export const useOffline = () => useContext(Ctx);

export function OfflineProvider({ children }) {
  const { user } = useAuth();
  const me = user?.employee_id;
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState([]);
  const syncing = useRef(false);

  const refreshCounts = useCallback(async () => {
    if (!me) { setPending(0); setRejected([]); return; }
    setPending((await read(Q_KEY)).filter((i) => i.user === me).length);
    setRejected((await read(R_KEY)).filter((i) => i.user === me));
  }, [me]);

  const syncNow = useCallback(async () => {
    if (!me || syncing.current) return;
    const mine = (await read(Q_KEY)).filter((i) => i.user === me);
    if (!mine.length) return;
    syncing.current = true;
    try {
      const items = mine.map(({ id, mode, at, lat, lng, accuracy, mocked }) => ({ id, mode, at, lat, lng, accuracy, mocked }));
      const { data } = await api.post('/attendance/sync/', { items });
      const done = new Set(data.results.map((r) => r.id));
      await write(Q_KEY, (await read(Q_KEY)).filter((i) => !done.has(i.id)));
      const bad = data.results.filter((r) => !r.ok);
      if (bad.length) {
        const byId = Object.fromEntries(mine.map((i) => [i.id, i]));
        const rej = await read(R_KEY);
        bad.forEach((b) => rej.push({ id: b.id, user: me, mode: byId[b.id]?.mode, at: byId[b.id]?.at, detail: b.detail }));
        await write(R_KEY, rej);
      }
    } catch (e) {
      /* no connection or server down: keep the queue and try again later */
    } finally {
      syncing.current = false;
      refreshCounts();
    }
  }, [me, refreshCounts]);

  const syncRef = useRef(syncNow);
  syncRef.current = syncNow;

  useEffect(() => {
    refreshCounts();
    syncRef.current();
  }, [me]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((st) => {
      const on = !!(st.isConnected && st.isInternetReachable !== false);
      setOnline(on);
      if (on) syncRef.current();
    });
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') syncRef.current(); });
    return () => { unsub(); sub.remove(); };
  }, []);

  const queueAttendance = async (mode, pos) => {
    const all = await read(Q_KEY);
    const today = new Date().toDateString();
    if (all.some((i) => i.user === me && i.mode === mode && new Date(i.at).toDateString() === today)) {
      return { duplicate: true };
    }
    all.push({
      id: makeId(), user: me, mode, at: new Date().toISOString(),
      lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, mocked: !!pos.mocked,
    });
    await write(Q_KEY, all);
    await refreshCounts();
    return { duplicate: false };
  };

  const dismissRejected = async () => {
    await write(R_KEY, (await read(R_KEY)).filter((i) => i.user !== me));
    refreshCounts();
  };

  return (
    <Ctx.Provider value={{ online, pending, rejected, queueAttendance, syncNow, dismissRejected }}>
      {children}
    </Ctx.Provider>
  );
}

// Thin bar shown under the header of every screen
export function OfflineBanner() {
  const { online, pending, rejected, dismissRejected } = useOffline();

  if (rejected.length) {
    const show = () =>
      Alert.alert(
        'Offline records not accepted',
        rejected.map((r) => `${r.mode === 'in' ? 'Check-in' : 'Check-out'} (${new Date(r.at).toLocaleString()}): ${r.detail}`).join('\n\n'),
        [{ text: 'OK', onPress: dismissRejected }]
      );
    return (
      <TouchableOpacity style={[s.bar, { backgroundColor: '#fee2e2' }]} onPress={show}>
        <Ionicons name="alert-circle" size={16} color="#b91c1c" />
        <Text style={[s.text, { color: '#b91c1c' }]}>{rejected.length} offline record(s) were not accepted. Tap to see why.</Text>
      </TouchableOpacity>
    );
  }
  if (!online) {
    return (
      <TouchableOpacity activeOpacity={1} style={[s.bar, { backgroundColor: '#fef3c7' }]}>
        <Ionicons name="cloud-offline" size={16} color="#92400e" />
        <Text style={[s.text, { color: '#92400e' }]}>No internet{pending ? `  |  ${pending} waiting to sync` : ''}</Text>
      </TouchableOpacity>
    );
  }
  if (pending) {
    return (
      <TouchableOpacity activeOpacity={1} style={[s.bar, { backgroundColor: '#dbeafe' }]}>
        <Ionicons name="sync" size={16} color="#1d4ed8" />
        <Text style={[s.text, { color: '#1d4ed8' }]}>Syncing {pending} saved record(s)...</Text>
      </TouchableOpacity>
    );
  }
  return null;
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  text: { marginLeft: 8, fontSize: 12.5, fontWeight: '600' },
});