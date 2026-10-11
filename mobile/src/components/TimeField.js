import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import SelectField from './SelectField';

const pad = (n) => String(n).padStart(2, '0');

// 'HH:MM' or 'HH:MM:SS' (24h) -> '08:00 AM'
export function fmtTime(v) {
  const [h, m] = v.split(':').map(Number);
  return `${pad(h % 12 || 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

function TimeSheet({ value, onCancel, onDone }) {
  const [h0, m0] = value.split(':').map(Number);
  const [h, setH] = useState(h0 % 12 || 12);
  const [m, setM] = useState(m0);
  const [pm, setPm] = useState(h0 >= 12);

  const hours = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const mins = [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), m0])]
    .sort((a, b) => a - b)
    .map((v) => ({ value: v, label: pad(v) }));
  const periods = [{ value: false, label: 'AM' }, { value: true, label: 'PM' }];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Select time</Text>
          <View style={{ flexDirection: 'row' }}>
            <SelectField style={{ flex: 1, marginRight: 8 }} label="Hour" options={hours} value={h} onChange={setH} />
            <SelectField style={{ flex: 1, marginRight: 8 }} label="Minute" options={mins} value={m} onChange={setM} />
            <SelectField style={{ flex: 1 }} label="AM/PM" options={periods} value={pm} onChange={setPm} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
            <TouchableOpacity onPress={onCancel} style={s.btn}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onDone(`${pad((h % 12) + (pm ? 12 : 0))}:${pad(m)}`)} style={s.btn}>
              <Text style={{ color: colors.green, fontWeight: '700' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TimeField({ label, value, onChange, style }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[{ flex: 1 }, style]}>
      <TouchableOpacity style={s.box} onPress={() => setOpen(true)}>
        <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.text }}>{fmtTime(value)}</Text>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
        </View>
      </TouchableOpacity>
      {open ? <TimeSheet value={value} onCancel={() => setOpen(false)} onDone={(v) => { setOpen(false); onChange(v); }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.bg, borderRadius: 16, padding: 16 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  btn: { paddingHorizontal: 16, paddingVertical: 10 },
});