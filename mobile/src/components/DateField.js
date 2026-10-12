import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import SelectField from './SelectField';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`;
};

function PickerSheet({ value, onCancel, onDone }) {
  const [y0, m0, d0] = value.split('-').map(Number);
  const [y, setY] = useState(y0);
  const [m, setM] = useState(m0);
  const [d, setD] = useState(d0);

  const thisYear = new Date().getFullYear();
  const days = new Date(y, m, 0).getDate();
  const dayOpts = Array.from({ length: days }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const monthOpts = MONTHS.map((n, i) => ({ value: i + 1, label: n }));
  const yearOpts = [thisYear - 3, thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((v) => ({ value: v, label: String(v) }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Select date</Text>
          <View style={{ flexDirection: 'row' }}>
            <SelectField style={{ flex: 1, marginRight: 8 }} label="Day" options={dayOpts} value={Math.min(d, days)} onChange={setD} />
            <SelectField style={{ flex: 1.2, marginRight: 8 }} label="Month" options={monthOpts} value={m} onChange={setM} />
            <SelectField style={{ flex: 1.3 }} label="Year" options={yearOpts} value={y} onChange={setY} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
            <TouchableOpacity onPress={onCancel} style={s.btn}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onDone(`${y}-${pad(m)}-${pad(Math.min(d, days))}`)} style={s.btn}>
              <Text style={{ color: colors.green, fontWeight: '700' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DateField({ label, value, onChange, style }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[{ flex: 1 }, style]}>
      <TouchableOpacity style={s.box} onPress={() => setOpen(true)}>
        <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.text }}>{fmtDate(value)}</Text>
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
        </View>
      </TouchableOpacity>
      {open ? <PickerSheet value={value} onCancel={() => setOpen(false)} onDone={(v) => { setOpen(false); onChange(v); }} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.bg, borderRadius: 16, padding: 16 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  btn: { paddingHorizontal: 16, paddingVertical: 10 },
});