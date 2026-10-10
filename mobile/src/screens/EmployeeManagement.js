import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Badge, Chip, Avatar } from '../components/ui';

const FILTERS = ['All', 'Doctors', 'Nursing', 'Admin', 'Lab'];
const EMPLOYEES = [
  { name: 'Dr. Ahmad Khan', id: 'YH-0123', role: 'Medical Officer', dept: 'Medicine' },
  { name: 'Dr. Sara Malik', id: 'YH-0124', role: 'Consultant', dept: 'Gynaecology' },
  { name: 'Ali Raza', id: 'YH-0150', role: 'Lab Technician', dept: 'Laboratory' },
  { name: 'Nida Khan', id: 'YH-0168', role: 'Staff Nurse', dept: 'Nursing' },
  { name: 'Muhammad Asim', id: 'YH-0175', role: 'Admin Staff', dept: 'Administration' },
];

export default function EmployeeManagement({ navigation }) {
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const list = EMPLOYEES.filter((e) => (e.name + e.id + e.dept).toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen header={<Header title="Employees" onBack={() => navigation.goBack()} />}>
      <View style={s.searchRow}>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput style={{ flex: 1, marginLeft: 8, color: colors.text }} placeholder="Search by name, ID or department" placeholderTextColor={colors.muted} value={q} onChangeText={setQ} />
        </View>
        <TouchableOpacity style={s.add}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}> Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, alignItems: 'center' }}>
          {FILTERS.map((f) => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>
      </View>

      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item }) => (
          <Card style={s.item}>
            <Avatar size={46} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{item.name}</Text>
              <Text style={s.meta}>{item.id} | {item.role}</Text>
              <Text style={s.meta}>{item.dept}</Text>
            </View>
            <Badge text="Active" />
            <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} style={{ marginLeft: 8 }} />
          </Card>
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, height: 44 },
  add: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 14, height: 44, marginLeft: 10 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
});
