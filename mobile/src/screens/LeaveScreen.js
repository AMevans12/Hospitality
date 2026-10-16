import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Modal, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';
import { useRefresh } from '../components/PullToRefresh';
import { api, errorMessage } from '../api/client';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

const STATUS = {
  pending: { text: 'Pending', color: '#b45309', bg: '#fef3c7' },
  approved: { text: 'Approved', color: '#166534', bg: '#dcfce7' },
  rejected: { text: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
};

// defined outside the screen so typing never loses focus
function DayStepper({ title, value, onChange, min }) {
  const atMin = min && iso(value) <= iso(min);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{title}</Text>
      <View style={s.stepper}>
        <TouchableOpacity onPress={() => onChange(addDays(value, -1))} disabled={atMin} style={[s.arrow, atMin && { opacity: 0.3 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.stepText}>{fmt(value)}</Text>
        <TouchableOpacity onPress={() => onChange(addDays(value, 1))} style={s.arrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LeaveForm({ onClose, onSaved }) {
  const today = new Date();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changeFrom = (d) => { setFrom(d); if (iso(to) < iso(d)) setTo(d); };
  const days = Math.round((fromIso(iso(to)) - fromIso(iso(from))) / 86400000) + 1;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/leaves/', { from_date: iso(from), to_date: iso(to), reason: reason.trim() });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.title}>Apply for leave</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.muted} /></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <DayStepper title="From" value={from} onChange={changeFrom} min={today} />
            <DayStepper title="To" value={to} onChange={setTo} min={from} />
            <Text style={{ color: colors.muted, marginBottom: 12 }}>{days} day{days > 1 ? 's' : ''}</Text>
            <Text style={s.label}>Reason (optional)</Text>
            <TextInput
              style={s.input}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Family function"
              placeholderTextColor={colors.muted}
              maxLength={255}
              editable={!busy}
            />
            {error ? <Text style={{ color: colors.red, marginTop: 10 }}>{error}</Text> : null}
            <Button title={busy ? 'Sending...' : 'Submit request'} onPress={submit} style={{ marginTop: 16, opacity: busy ? 0.7 : 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function LeaveScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/leaves/');
      setItems(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refreshControl = useRefresh(load);

  const cancel = (l) =>
    Alert.alert('Cancel request', 'Withdraw this leave request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: () => api.post(`/leaves/${l.id}/cancel/`).then(load).catch((e) => Alert.alert('Error', errorMessage(e))),
      },
    ]);

  return (
    <Screen header={<Header title="My Leave" onBack={() => navigation.goBack()} />}>
      <View style={{ padding: 14, paddingBottom: 0 }}>
        <Button title="Apply for leave" icon="add-circle-outline" onPress={() => setForm(true)} />
      </View>

      {error ? <Text style={{ color: colors.red, margin: 14 }}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => String(l.id)}
          refreshControl={refreshControl}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No leave requests yet</Text>}
          renderItem={({ item }) => {
            const st = STATUS[item.status] || STATUS.pending;
            const same = item.from_date === item.to_date;
            return (
              <Card style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>
                      {fmt(fromIso(item.from_date))}{same ? '' : `  to  ${fmt(fromIso(item.to_date))}`}
                    </Text>
                    <Text style={s.meta}>{item.days} day{item.days > 1 ? 's' : ''}{item.reason ? `  |  ${item.reason}` : ''}</Text>
                    {item.decided_by ? <Text style={s.meta}>Decided by {item.decided_by}</Text> : null}
                  </View>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Text style={{ color: st.color, fontWeight: '700', fontSize: 12 }}>{st.text}</Text>
                  </View>
                </View>
                {item.status === 'pending' ? (
                  <TouchableOpacity onPress={() => cancel(item)} style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.red, fontWeight: '600' }}>Withdraw request</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            );
          }}
        />
      )}

      {form ? <LeaveForm onClose={() => setForm(false)} onSaved={() => { setForm(false); load(); }} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, backgroundColor: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  arrow: { padding: 12 },
  stepText: { flex: 1, textAlign: 'center', fontWeight: '600', color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});