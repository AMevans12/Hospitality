import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function SelectField({ label, options, value, onChange, placeholder = 'Select', clearable, style }) {
  const [open, setOpen] = useState(false);
  const list = clearable ? [{ value: null, label: 'None' }, ...options] : options;
  const current = list.find((o) => o.value === value);

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TouchableOpacity style={s.box} onPress={() => setOpen(true)}>
        <Text style={{ flex: 1, color: current ? colors.text : colors.muted }} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <FlatList
              data={list}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.row} onPress={() => { onChange(item.value); setOpen(false); }}>
                  <Text style={[{ color: colors.text, fontSize: 15 }, item.value === value && { color: colors.green, fontWeight: '700' }]}>{item.label}</Text>
                  {item.value === value ? <Ionicons name="checkmark" size={18} color={colors.green} /> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 30 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, maxHeight: '60%', paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
});