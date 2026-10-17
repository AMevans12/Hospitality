import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function DepartmentPicker({ departments, value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const current = departments.find((d) => d.id === value);
  const options = [{ id: null, name: 'All Departments' }, ...departments];

  return (
    <>
      <TouchableOpacity style={[s.btn, style]} onPress={() => setOpen(true)}>
        <Text numberOfLines={1} style={s.btnText}>{current ? current.name : 'All Departments'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <FlatList
              data={options}
              keyExtractor={(d) => String(d.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.row} onPress={() => { onChange(item.id); setOpen(false); }}>
                  <Text style={[s.rowText, item.id === value && { color: colors.green, fontWeight: '700' }]}>{item.name}</Text>
                  {item.id === value ? <Ionicons name="checkmark" size={18} color={colors.green} /> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  btnText: { color: colors.text, fontSize: 13, marginRight: 6, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 30 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, maxHeight: '60%', paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  rowText: { color: colors.text, fontSize: 15 },
});