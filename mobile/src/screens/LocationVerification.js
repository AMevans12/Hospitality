import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import FaceCapture from '../components/FaceCapture';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const PROMPTS = [
  'Look straight at the camera',
  'Turn your head slightly left',
  'Turn your head slightly right',
];

export default function LocationVerification({ navigation, route }) {
  const mode = route.params?.mode === 'out' ? 'out' : 'in';
  const { user } = useAuth();
  const [phase, setPhase] = useState('locating'); // locating | camera | sending | error
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const pos = useRef(null);

  const locate = async () => {
    setPhase('locating');
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to mark attendance.');
        setPhase('error');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      pos.current = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        mocked: !!loc.mocked,
      };
      if (user?.face_required) {
        setAttempt((a) => a + 1);
        setPhase('camera');
      } else {
        send([]);
      }
    } catch (e) {
      setError('Could not get your location. Make sure GPS is on and try again.');
      setPhase('error');
    }
  };

  useEffect(() => { locate(); }, []);

  const send = async (uris) => {
    setPhase('sending');
    const p = pos.current;
    const url = `/attendance/check-${mode}/`;
    try {
      let res;
      if (uris.length) {
        const fd = new FormData();
        fd.append('lat', String(p.lat));
        fd.append('lng', String(p.lng));
        fd.append('accuracy', String(p.accuracy ?? ''));
        fd.append('mocked', p.mocked ? 'true' : 'false');
        uris.forEach((uri, n) => fd.append('frames', { uri, name: `f${n}.jpg`, type: 'image/jpeg' }));
        res = await api.post(url, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });
      } else {
        res = await api.post(url, p);
      }
      navigation.replace('AttendanceSuccess', { mode, record: res.data.record ?? res.data });
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  };

  if (phase === 'camera') {
    return (
      <FaceCapture
        key={attempt}
        prompts={PROMPTS}
        onDone={send}
        onError={(m) => { setError(m); setPhase('error'); }}
      />
    );
  }

  return (
    <View style={s.wrap}>
      {phase !== 'error' ? (
        <>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.text}>
            {phase === 'locating' ? 'Checking your location...' : 'Verifying...'}
          </Text>
        </>
      ) : (
        <>
          <Text style={[s.text, { color: '#b91c1c' }]}>{error}</Text>
          <Pressable style={s.btn} onPress={locate}>
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={s.link}>Back</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  text: { fontSize: 16, textAlign: 'center', color: '#374151' },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#2563eb', fontSize: 16, marginTop: 4 },
});