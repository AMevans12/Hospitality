import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../api/client';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TURN = 0.18;      // how far the head must turn
const STRAIGHT = 0.12;  // how straight counts as "straight"

// steps: [{ text, type: 'straight' | 'turn' | 'opposite' }]
export default function FaceCapture({ steps, onDone, onError }) {
  const camRef = useRef(null);
  const photos = useRef([]);
  const base = useRef(null);      // yaw of the first straight photo
  const turnSign = useRef(0);     // side of the first turn
  const [perm, requestPerm] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState('');
  const [good, setGood] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let alive = true;

    (async () => {
      let i = 0;
      let streak = 0;
      let lastUri = null;
      let startedAt = Date.now();

      while (alive && i < steps.length) {
        if (Date.now() - startedAt > 60000) {
          onError && onError('Could not get a clear photo. Try again in better light.');
          return;
        }
        try {
          const p = await camRef.current.takePictureAsync({ quality: 0.5, shutterSound: false });
          if (!alive) return;
          const fd = new FormData();
          fd.append('frame', { uri: p.uri, name: 'f.jpg', type: 'image/jpeg' });
          const { data } = await api.post('/face/check/', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 8000,
          });
          if (!alive) return;

          let msg = '';
          let pass = false;
          if (!data.ok) {
            msg = data.hint;
          } else {
            const yaw = data.yaw;
            const type = steps[i].type;
            const b = base.current === null ? 0 : base.current;
            if (type === 'straight') {
              const ref = base.current === null ? 0 : b;
              if (Math.abs(yaw - ref) < STRAIGHT) pass = true;
              else msg = 'Look straight at the camera.';
            } else {
              const d = yaw - b;
              if (Math.abs(d) < TURN) msg = 'Turn your head a little more.';
              else if (type === 'opposite' && Math.sign(d) === turnSign.current) msg = 'Turn to the other side.';
              else pass = true;
            }
            if (pass && type === 'straight' && base.current === null) base.current = yaw;
            if (pass && type === 'turn') turnSign.current = Math.sign(yaw - b);
          }

          if (pass) {
            streak += 1;
            lastUri = p.uri;
            setHint('');
            setGood(true);
          } else {
            streak = 0;
            setGood(false);
            setHint(msg);
          }

          if (streak >= 2) {
            photos.current.push(lastUri);
            setHint('Good, hold on...');
            await sleep(900);
            if (!alive) return;
            i += 1;
            streak = 0;
            startedAt = Date.now();
            setGood(false);
            setHint('');
            if (i < steps.length) setStep(i);
          }
        } catch (e) {
          setGood(false);
          setHint('Connection problem. Retrying...');
          await sleep(800);
        }
        await sleep(200);
      }
      if (alive) onDone(photos.current);
    })();

    return () => { alive = false; };
  }, [ready]);

  if (!perm) return <View style={s.fill} />;
  if (!perm.granted) {
    return (
      <View style={[s.fill, s.center]}>
        <Text style={s.msg}>Camera permission is needed to verify your face.</Text>
        <Pressable style={s.btn} onPress={requestPerm}>
          <Text style={s.btnText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  const color = good ? '#22c55e' : hint ? '#f59e0b' : '#ffffff';

  return (
    <View style={s.fill}>
      <Text style={s.prompt}>{ready ? steps[Math.min(step, steps.length - 1)].text : 'Starting camera...'}</Text>

      <View style={s.box}>
        <CameraView
          ref={camRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          onCameraReady={() => setReady(true)}
          onMountError={() => onError && onError('Camera could not start. Check that no other app is using it.')}
        />
        <View style={s.ovalWrap} pointerEvents="none">
          <View style={[s.oval, { borderColor: color }]} />
        </View>
      </View>

      <View style={s.footer}>
        {hint ? <Text style={[s.hint, { backgroundColor: good ? '#16a34a' : '#b45309' }]}>{hint}</Text> : null}
        <Text style={s.step}>Photo {Math.min(step + 1, steps.length)} of {steps.length}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 16 },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  prompt: { position: 'absolute', top: 60, left: 0, right: 0, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },
  box: { width: '100%', aspectRatio: 3 / 4, overflow: 'hidden', backgroundColor: '#111' },
  ovalWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  oval: { width: '62%', aspectRatio: 0.75, borderRadius: 999, borderWidth: 4 },
  footer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, overflow: 'hidden', textAlign: 'center', marginBottom: 12, maxWidth: '90%' },
  step: { color: '#fff', fontSize: 14 },
});
