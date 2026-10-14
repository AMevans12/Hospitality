import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// prompts: array of instructions, one photo per prompt. Waits for the user to press Capture.
export default function FaceCapture({ prompts, onDone, onError }) {
  const camRef = useRef(null);
  const photos = useRef([]);
  const [perm, requestPerm] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const p = await camRef.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      photos.current.push(p.uri);
    } catch (e) {
      setBusy(false);
      onError && onError('Could not take the photo. Try again.');
      return;
    }
    if (i + 1 >= prompts.length) {
      onDone(photos.current);
    } else {
      setI(i + 1);
      setBusy(false);
    }
  };

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

  return (
    <View style={s.fill}>
      <CameraView
        ref={camRef}
        style={s.fill}
        facing="front"
        onCameraReady={() => setReady(true)}
        onMountError={() => onError && onError('Camera could not start. Check that no other app is using it.')}
      />

      <View style={s.overlay} pointerEvents="none">
        <Text style={s.prompt}>{ready ? prompts[i] : 'Starting camera...'}</Text>
        <View style={s.oval} />
        <Text style={s.step}>Photo {i + 1} of {prompts.length}</Text>
      </View>

      <View style={s.bottom}>
        <Pressable style={[s.capture, (!ready || busy) && { opacity: 0.5 }]} onPress={capture} disabled={!ready || busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Capture</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 16 },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  oval: { width: 240, height: 320, borderRadius: 160, borderWidth: 3, borderColor: '#fff', opacity: 0.9 },
  prompt: { position: 'absolute', top: 70, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },
  step: { position: 'absolute', bottom: 150, color: '#fff', fontSize: 14 },
  bottom: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  capture: { backgroundColor: '#2563eb', width: 180, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});