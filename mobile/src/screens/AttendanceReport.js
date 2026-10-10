import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, StatTile, Button } from '../components/ui';

const ROWS = [
  ['1', 'Dr. Ahmad Khan', '26', '2', '3', '86%'],
  ['2', 'Dr. Sara Malik', '28', '0', '1', '97%'],
  ['3', 'Ali Raza', '25', '3', '5', '82%'],
  ['4', 'Nida Khan', '27', '1', '2', '90%'],
  ['5', 'Muhammad Asim', '26', '2', '4', '86%'],
];
const W = [26, 0, 56, 56, 40, 44]; // column widths (0 = flexible)

function Cell({ i, children, bold, color }) {
  return (
    <Text style={[{ fontSize: 12, color: color || colors.text, fontWeight: bold ? '700' : '400', textAlign: i === 1 ? 'left' : 'center' }, W[i] ? { width: W[i] } : { flex: 1 }]}>
      {children}
    </Text>
  );
}

function DateBox({ label, value }) {
  return (
    <View style={s.dateBox}>
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.text }}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </View>
    </View>
  );
}

export default function AttendanceReport({ navigation }) {
  const [tab, setTab] = useState('Employee Wise');
  return (
    <Screen header={<Header title="Attendance Report" onBack={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <DateBox label="From" value="01 Sep 2026" />
          <DateBox label="To" value="30 Sep 2026" />
          <DateBox label=" " value="All Departments" />
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {[['612', 'Present', colors.green, colors.greenBg], ['48', 'Absent', colors.red, colors.redBg], ['76', 'Late', colors.amber, colors.amberBg], ['22', 'Leave', colors.blue, colors.blueBg]].map(([v, l, c, b], i) => (
            <StatTile key={l} value={v} label={l} color={c} bg={b} style={{ marginLeft: i ? 8 : 0, flexDirection: 'column', paddingVertical: 12 }} />
          ))}
        </View>

        <View style={s.tabs}>
          {['Employee Wise', 'Department Wise'].map((t) => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
              <Text style={{ fontWeight: '700', color: tab === t ? colors.primary : colors.muted }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <View style={[s.tr, { backgroundColor: '#EEF3F5' }]}>
            {['#', 'Employee', 'Present', 'Absent', 'Late', '%'].map((h, i) => <Cell key={h} i={i} bold>{h}</Cell>)}
          </View>
          {ROWS.map((r) => (
            <View key={r[0]} style={s.tr}>
              {r.map((c, i) => (
                <Cell key={i} i={i} color={i === 2 ? colors.green : i === 3 ? colors.text : i === 4 ? colors.red : undefined}>{c}</Cell>
              ))}
            </View>
          ))}
        </Card>

        <View style={{ flexDirection: 'row' }}>
          <Button title="Export Excel" icon="document-text" style={{ flex: 1 }} />
          <View style={{ width: 12 }} />
          <Button title="Export PDF" icon="document" color={colors.red} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  dateBox: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, marginRight: 8 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  tr: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
