import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';
import { api, errorMessage } from '../api/client';
import { distanceM } from '../utils/geo';

const WAIT_MS = 15000;   // how long we keep improving the GPS reading

export default function LocationVerification({ navigation, route }) {
  const mode = route.params?.mode === 'out' ? 'out' : 'in';
  const [fence, setFence] = useState(null);
  const [pos, setPos] = useState(null);          // best reading so far
  const [phase, setPhase] = useState('locating'); // locating | ready | denied | off | error
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sub = useRef(null);
  const timer = useRef(null);
  const alive = useRef(true);

  const stop = () => {
    if (sub.current) sub.current.remove();
    sub.current = null;
    clearTimeout(timer.current);
  };

  const locate = useCallback(async () => {
    stop();
    setPhase('locating');
    setPos(null);
    setError('');
    try {
      const r = await api.get('/attendance/today/');
      const f = r.data.geofence;
      setFence(f);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setPhase('denied');
      if (!(await Location.hasServicesEnabledAsync())) return setPhase('off');

      let best = null;
      const finish = () => { stop(); if (alive.current) setPhase('ready'); };
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
        (p) => {
          if (!best || p.coords.accuracy < best.coords.accuracy) {
            best = p;
            if (alive.current) setPos(p);
          }
          if (p.coords.accuracy <= f.max_accuracy_m) finish();
        }
      );
      timer.current = setTimeout(finish, WAIT_MS);
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    locate();
    return () => { alive.current = false; stop(); };
  }, [locate]);

  // ---- what the reading means ----
  const acc = pos?.coords.accuracy;
  const dist = pos && fence ? distanceM(pos.coords.latitude, pos.coords.longitude, Number(fence.lat), Number(fence.lng)) : null;
  let verdict = null;
  if (phase === 'ready' && fence) {
    if (!pos) verdict = 'nofix';
    else if (acc > fence.max_accuracy_m) verdict = 'weak';
    else if (dist > fence.radius_m) verdict = 'outside';
    else verdict = 'ok';
  }

  const confirm = async () => {
    if (busy || verdict !== 'ok') return;
    setBusy(true);
    try {
      const r = await api.post(mode === 'in' ? '/attendance/check-in/' : '/attendance/check-out/', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        mocked: !!pos.mocked,
      });
      navigation.replace('AttendanceSuccess', { mode, record: r.data });
    } catch (e) {
      const code = e.response?.data?.code;
      Alert.alert('Could not mark attendance', errorMessage(e), [
        { text: 'OK', onPress: () => { if (['already_checked_in', 'already_done', 'not_checked_in'].includes(code)) navigation.goBack(); } },
      ]);
      setBusy(false);
    }
  };

  // ---- banner text ----
  let banner = { icon: null, tone: colors.primary, title: '', sub: '' };
  if (phase === 'locating') banner = { tone: colors.primary, title: 'Getting your location...', sub: acc ? `Improving accuracy (about ${Math.round(acc)} m). Hold still.` : 'Hold still for a few seconds.' };
  else if (phase === 'denied') banner = { icon: 'lock-closed', tone: colors.red, title: 'Location permission needed', sub: 'Allow location access in Settings to mark attendance.' };
  else if (phase === 'off') banner = { icon: 'location-outline', tone: colors.red, title: 'Location is turned off', sub: 'Turn on GPS, then try again.' };
  else if (phase === 'error') banner = { icon: 'alert-circle', tone: colors.red, title: 'Something went wrong', sub: error };
  else if (verdict === 'ok') banner = { icon: 'checkmark-circle', tone: colors.green, title: 'You are at Yahya Hospital', sub: 'Location verified successfully' };
  else if (verdict === 'outside') banner = { icon: 'close-circle', tone: colors.red, title: `You are ${Math.round(dist)} m away`, sub: `You must be within ${fence.radius_m} m of the hospital.` };
  else if (verdict === 'weak') banner = { icon: 'warning', tone: colors.amber, title: `GPS signal is weak (about ${Math.round(acc)} m)`, sub: 'Move near a window or outdoors and refresh.' };
  else if (verdict === 'nofix') banner = { icon: 'warning', tone: colors.amber, title: 'Could not get a GPS fix', sub: 'Move near a window or outdoors and refresh.' };

  const ring = verdict === 'outside' ? colors.red : verdict === 'ok' ? colors.green : colors.muted;
  const label = mode === 'in' ? 'Check-In' : 'Check-Out';

  return (
    <Screen header={<Header title="Location Verification" onBack={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={s.status}>
          {banner.icon ? <Ionicons name={banner.icon} size={40} color={banner.tone} /> : <ActivityIndicator size="large" color={colors.green} />}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{banner.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{banner.sub}</Text>
          </View>
        </Card>

        <View style={s.map}>
          <View style={[s.circle, { borderColor: ring, backgroundColor: ring + '2E' }]}>
            <Ionicons name="location" size={40} color={colors.red} />
            <Text style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>Yahya Hospital</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>Haripur</Text>
          </View>
          {dist != null ? (
            <Text style={[s.within, { color: ring }]}>
              {verdict === 'outside' ? `${Math.round(dist)} metres away` : `Within ${Math.max(Math.round(dist), 1)} metres`}
            </Text>
          ) : null}
        </View>

        <Card style={{ marginTop: 14, marginBottom: 14 }}>
          <View style={s.row}>
            <Ionicons name="location" size={22} color={colors.blue} />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.label}>Hospital Location</Text>
              <Text style={s.value}>{fence ? `${Number(fence.lat).toFixed(5)}° N, ${Number(fence.lng).toFixed(5)}° E` : '...'}</Text>
            </View>
          </View>
          <View style={[s.row, { marginTop: 14 }]}>
            <Ionicons name="radio-button-on-outline" size={22} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.label}>Allowed Radius</Text>
              <Text style={s.value}>{fence ? `${fence.radius_m} metres` : '...'}</Text>
            </View>
          </View>
          <View style={[s.row, { marginTop: 14 }]}>
            <Ionicons name="navigate-outline" size={22} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.label}>Your GPS accuracy</Text>
              <Text style={s.value}>{acc ? `about ${Math.round(acc)} metres` : '...'}</Text>
            </View>
          </View>
        </Card>

        <Button
          title={busy ? 'Saving...' : `Confirm ${label}`}
          color={mode === 'in' ? colors.green : colors.red}
          onPress={confirm}
          style={{ opacity: verdict === 'ok' && !busy ? 1 : 0.4 }}
        />
        {phase === 'denied' ? (
          <Button title="Open Settings" icon="settings-outline" color={colors.primary} onPress={() => Linking.openSettings()} style={{ marginTop: 10 }} />
        ) : null}
        <Button
          title="Refresh location"
          icon="refresh"
          color={colors.primary}
          onPress={locate}
          style={{ marginTop: 10, opacity: phase === 'locating' || busy ? 0.4 : 1 }}
        />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  map: { height: 260, borderRadius: 14, backgroundColor: '#DDE7EA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circle: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  within: { position: 'absolute', bottom: 10, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontWeight: '600', fontSize: 14 },
});