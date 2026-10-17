import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';
import TimeField, { fmtTime } from '../components/TimeField';
import PullToRefresh from '../components/PullToRefresh';
import { api, errorMessage } from '../api/client';

function Field({ label, hint, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={colors.muted} {...props} />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

// ---- add / edit shift ----
function ShiftForm({ shift, onClose, onSaved }) {
  const editing = !!shift;
  const [name, setName] = useState(shift?.name || '');
  const [start, setStart] = useState(shift ? shift.start_time.slice(0, 5) : '08:00');
  const [end, setEnd] = useState(shift ? shift.end_time.slice(0, 5) : '16:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (busy) return;
    if (!name.trim()) return setError('Give the shift a name');
    setBusy(true);
    setError('');
    try {
      const body = { name: name.trim(), start_time: start, end_time: end };
      if (editing) await api.patch(`/shifts/${shift.id}/`, body);
      else await api.post('/shifts/', body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete shift', `Employees on "${shift.name}" will be left without a shift. Continue?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/shifts/${shift.id}/`); onSaved(); }
          catch (e) { setError(errorMessage(e)); }
        },
      },
    ]);

  const overnight = end <= start;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{editing ? 'Edit Shift' : 'Add Shift'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.muted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
            <Field label="Shift name" value={name} onChangeText={setName} placeholder="e.g. Morning, Night" />
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <TimeField label="Start" value={start} onChange={setStart} style={{ marginRight: 10 }} />
              <TimeField label="End" value={end} onChange={setEnd} />
            </View>
            {overnight ? <Text style={s.hint}>Ends the next day (night shift).</Text> : null}
            {error ? <Text style={{ color: colors.red, marginVertical: 8 }}>{error}</Text> : null}
            <Button title={busy ? 'Saving...' : 'Save Shift'} onPress={save} style={{ marginTop: 12, opacity: busy ? 0.7 : 1 }} />
            {editing ? <Button title="Delete Shift" color={colors.red} onPress={remove} style={{ marginTop: 10 }} /> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen({ navigation }) {
  const [geo, setGeo] = useState({ lat: '', lng: '', radius: '' });
  const [late, setLate] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingGeo, setSavingGeo] = useState(false);
  const [savingLate, setSavingLate] = useState(false);
  const [locating, setLocating] = useState(false);
  const [shiftForm, setShiftForm] = useState(null);   // null = closed, {} = new, shift = edit

  const load = useCallback(async () => {
    try {
      setError('');
      const [st, sh] = await Promise.all([api.get('/settings/'), api.get('/shifts/')]);
      setGeo({ lat: String(st.data.hospital_lat), lng: String(st.data.hospital_lng), radius: String(st.data.radius_m) });
      setLate(String(st.data.late_after_min));
      setShifts(sh.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveGeo = async () => {
    const lat = parseFloat(geo.lat), lng = parseFloat(geo.lng), radius = parseInt(geo.radius, 10);
    if (isNaN(lat) || lat < -90 || lat > 90) return Alert.alert('Check latitude', 'Enter a number between -90 and 90');
    if (isNaN(lng) || lng < -180 || lng > 180) return Alert.alert('Check longitude', 'Enter a number between -180 and 180');
    if (isNaN(radius) || radius < 20 || radius > 1000) return Alert.alert('Check radius', 'Radius must be between 20 and 1000 metres');
    setSavingGeo(true);
    try {
      await api.patch('/settings/', { hospital_lat: lat, hospital_lng: lng, radius_m: radius });
      Alert.alert('Saved', 'Hospital location updated.');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSavingGeo(false);
    }
  };

  const saveLate = async () => {
    const v = parseInt(late, 10);
    if (isNaN(v) || v < 0 || v > 180) return Alert.alert('Check value', 'Enter minutes between 0 and 180');
    setSavingLate(true);
    try {
      await api.patch('/settings/', { late_after_min: v });
      Alert.alert('Saved', 'Late grace time updated.');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSavingLate(false);
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location access to use this.');
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGeo((g) => ({ ...g, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }));
      Alert.alert('Location captured', `Accuracy about ${Math.round(p.coords.accuracy)} m. Check the values, then press Update.`);
    } catch (e) {
      Alert.alert('Could not get location', e.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen header={<Header title="Settings" onBack={() => navigation.goBack()} />}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
      ) : (
        <PullToRefresh onRefresh={load} contentContainerStyle={{ padding: 14 }}>
          {error ? (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>
              <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
            </Card>
          ) : null}

          <Card style={{ marginBottom: 14 }}>
            <Text style={s.section}>Hospital Location (Geofence)</Text>
            <Field label="Latitude" value={geo.lat} onChangeText={(v) => setGeo({ ...geo, lat: v })} keyboardType="decimal-pad" />
            <Field label="Longitude" value={geo.lng} onChangeText={(v) => setGeo({ ...geo, lng: v })} keyboardType="decimal-pad" />
            <Field
              label="Allowed radius (metres)"
              value={geo.radius}
              onChangeText={(v) => setGeo({ ...geo, radius: v })}
              keyboardType="number-pad"
              hint="Staff must be within this distance of the point above. 100 m is recommended because indoor GPS can drift."
            />
            <Button title={locating ? 'Getting location...' : 'Use my current location'} icon="locate" color={colors.primary} onPress={useMyLocation} style={{ opacity: locating ? 0.7 : 1 }} />
            <Button title={savingGeo ? 'Saving...' : 'Update'} onPress={saveGeo} color={colors.blue} style={{ marginTop: 10, opacity: savingGeo ? 0.7 : 1 }} />
          </Card>

          <Card>
            <Text style={s.section}>Work Schedule</Text>
            {shifts.length === 0 ? <Text style={{ color: colors.muted, marginVertical: 8 }}>No shifts yet. Add your first one.</Text> : null}
            {shifts.map((x) => (
              <TouchableOpacity key={x.id} style={s.shiftRow} onPress={() => setShiftForm(x)}>
                <Ionicons name={x.crosses_midnight ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.primary} style={{ width: 34 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{x.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {fmtTime(x.start_time)} - {fmtTime(x.end_time)}{x.crosses_midnight ? ' (next day)' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.addShift} onPress={() => setShiftForm({})}>
              <Ionicons name="add-circle-outline" size={20} color={colors.green} />
              <Text style={{ color: colors.green, fontWeight: '700', marginLeft: 6 }}>Add shift</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
            <Field label="Late after (minutes)" value={late} onChangeText={setLate} keyboardType="number-pad" hint="Check-ins later than this after shift start are marked Late." />
            <Button title={savingLate ? 'Saving...' : 'Update'} onPress={saveLate} color={colors.blue} style={{ opacity: savingLate ? 0.7 : 1 }} />
          </Card>
        </PullToRefresh>
      )}

      {shiftForm ? (
        <ShiftForm
          shift={shiftForm.id ? shiftForm : null}
          onClose={() => setShiftForm(null)}
          onSaved={() => { setShiftForm(null); load(); }}
        />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  section: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 10 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, backgroundColor: '#fff' },
  hint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  addShift: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
});