import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import FaceCapture from '../components/FaceCapture';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const PROMPTS = [
  'Look straight at the camera',
  'Turn your head slightly left',
  'Look straight at the camera',
  'Turn your head slightly right',
  'Look straight at the camera',
];

export default function FaceEnroll({ navigation }) {
  const { user, updateUser } = useAuth();
  const [phase, setPhase] = useState('intro'); // intro | camera | sending | error
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // forced enrollment: block the Android back button
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [])
  );

  const upload = async (uris) => {
    setPhase('sending');
    try {
      const fd = new FormData();
      uris.forEach((uri, n) =>
        fd.append('frames', { uri, name: `f${n}.jpg`, type: 'image/jpeg' })
      );
      await api.post('/face/enroll/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      updateUser({ face_enrolled: true });
      navigation.replace('EmployeeDashboard');
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
        onDone={upload}
        onError={(m) => { setError(m); setPhase('error'); }}
      />
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Face registration</Text>
      {phase === 'intro' && (
        <>
          <Text style={s.text}>
            We need to register your face once. Hold the phone at eye level in good light, remove
            glasses or mask, and follow the on-screen prompts. 5 photos will be taken automatically.
          </Text>
          <Pressable style={s.btn} onPress={() => setPhase('camera')}>
            <Text style={s.btnText}>Start</Text>
          </Pressable>
        </>
      )}
      {phase === 'sending' && (
        <>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.text}>Registering your face...</Text>
        </>
      )}
      {phase === 'error' && (
        <>
          <Text style={[s.text, { color: '#b91c1c' }]}>{error}</Text>
          <Pressable
            style={s.btn}
            onPress={() => { setAttempt((a) => a + 1); setPhase('camera'); }}
          >
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  text: { fontSize: 16, textAlign: 'center', color: '#374151' },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});