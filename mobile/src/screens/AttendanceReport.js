import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { Screen, Header, Chip, StatTile, Button } from '../components/ui';
import DateField from '../components/DateField';
import DepartmentPicker from '../components/DepartmentPicker';
import { useRefresh } from '../components/PullToRefresh';
import { api, errorMessage } from '../api/client';
import { exportReport } from '../utils/exportReport';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function presets() {
  const t = new Date();
  const week = new Date(t); week.setDate(t.getDate() - 6);
  return {
    'This month': [iso(new Date(t.getFullYear(), t.getMonth(), 1)), iso(t)],
    'Last month': [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), iso(new Date(t.getFullYear(), t.getMonth(), 0))],
    'Last 7 days': [iso(week), iso(t)],
  };
}

function Cell({ w, align = 'center', bold, color, children }) {
  return (
    <Text numberOfLines={1} style={[{ fontSize: 12, textAlign: align, color: color || colors.text, fontWeight: bold ? '700' : '400' }, w ? { width: w } : { flex: 1 }]}>
      {children}
    </Text>
  );
}

const pctColor = (p) => (p >= 90 ? colors.green : p >= 75 ? '#B27300' : colors.red);

export default function AttendanceReport({ navigation }) {
  const [range, setRange] = useState(presets()['This month']);
  const [dept, setDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [rep, setRep] = useState(null);
  const [tab, setTab] = useState('Employee Wise');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [from, to] = range;

  const query = { from, to, ...(dept ? { department: dept } : {}) };

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const { data } = await api.get('/reports/attendance/', { params: { from, to, ...(dept ? { department: dept } : {}) } });
      setRep(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [from, to, dept]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { api.get('/departments/').then((r) => setDepartments(r.data)).catch(() => {}); }, []);
  const refreshControl = useRefresh(load);

  const setFrom = (v) => setRange(([, t]) => [v, v > t ? v : t]);
  const setTo = (v) => setRange(([f]) => [v < f ? v : f, v]);

  const doExport = async (fmt) => {
    if (exporting) return;
    setExporting(fmt);
    try {
      await exportReport(fmt, query);
    } catch (e) {
      Alert.alert('Export failed', e.response ? errorMessage(e) : e.message || 'Could not export');
    } finally {
      setExporting('');
    }
  };

  const P = presets();
  const t = rep ? rep.totals : null;
  const data = rep ? (tab === 'Employee Wise' ? rep.rows : rep.departments) : [];

  const header = (
    <View style={{ padding: 14, paddingBottom: 0 }}>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <DateField label="From" value={from} onChange={setFrom} style={{ marginRight: 8 }} />
        <DateField label="To" value={to} onChange={setTo} style={{ marginRight: 8 }} />
        <View style={{ flex: 1.1, justifyContent: 'flex-end' }}>
          <DepartmentPicker departments={departments} value={dept} onChange={setDept} style={{ height: 52 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {Object.keys(P).map((k) => (
          <Chip key={k} label={k} active={from === P[k][0] && to === P[k][1]} onPress={() => setRange(P[k])} />
        ))}
      </View>

      {error ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: colors.red, marginBottom: 6 }}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {[['present', 'Present', colors.green, colors.greenBg], ['absent', 'Absent', colors.red, colors.redBg], ['late', 'Late', colors.amber, colors.amberBg], ['leave', 'Leave', colors.blue, colors.blueBg]].map(([k, l, c, b], i) => (
          <StatTile key={k} value={t ? t[k] : '-'} label={l} color={c} bg={b} style={{ marginLeft: i ? 8 : 0, flexDirection: 'column', paddingVertical: 12 }} />
        ))}
      </View>

      <View style={s.tabs}>
        {['Employee Wise', 'Department Wise'].map((x) => (
          <TouchableOpacity key={x} style={[s.tab, tab === x && s.tabOn]} onPress={() => setTab(x)}>
            <Text style={{ fontWeight: '700', color: tab === x ? colors.primary : colors.muted }}>{x}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator style={{ marginVertical: 8 }} color={colors.green} /> : null}

      <View style={[s.tr, s.thead]}>
        {tab === 'Employee Wise' ? (
          <>
            <Cell w={26} bold>#</Cell><Cell align="left" bold>Employee</Cell>
            <Cell w={52} bold>Present</Cell><Cell w={50} bold>Absent</Cell><Cell w={38} bold>Late</Cell><Cell w={42} bold>%</Cell>
          </>
        ) : (
          <>
            <Cell align="left" bold>Department</Cell><Cell w={34} bold>Emp</Cell>
            <Cell w={52} bold>Present</Cell><Cell w={50} bold>Absent</Cell><Cell w={38} bold>Late</Cell>
          </>
        )}
      </View>
    </View>
  );

  const renderRow = ({ item, index }) => (
    <View style={{ paddingHorizontal: 14 }}>
      <View style={[s.tr, s.row]}>
        {tab === 'Employee Wise' ? (
          <>
            <Cell w={26}>{index + 1}</Cell>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 12, color: colors.text }}>{item.name}</Text>
              <Text style={{ fontSize: 10, color: colors.muted }}>{item.employee_id}</Text>
            </View>
            <Cell w={52} color={colors.green}>{item.present}</Cell>
            <Cell w={50}>{item.absent}</Cell>
            <Cell w={38} color={colors.red}>{item.late}</Cell>
            <Cell w={42} bold color={pctColor(item.percent)}>{item.percent}%</Cell>
          </>
        ) : (
          <>
            <Cell align="left">{item.department}</Cell><Cell w={34}>{item.employees}</Cell>
            <Cell w={52} color={colors.green}>{item.present}</Cell>
            <Cell w={50}>{item.absent}</Cell>
            <Cell w={38} color={colors.red}>{item.late}</Cell>
          </>
        )}
      </View>
    </View>
  );

  return (
    <Screen header={<Header title="Attendance Report" onBack={() => navigation.goBack()} />}>
      <FlatList
        data={data}
        keyExtractor={(x, i) => (tab === 'Employee Wise' ? x.employee_id : x.department) + i}
        renderItem={renderRow}
        ListHeaderComponent={header}
        refreshControl={refreshControl}
        ListEmptyComponent={!loading ? <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 30 }}>No data for this selection</Text> : null}
        contentContainerStyle={{ paddingBottom: 14 }}
      />
      <View style={s.bar}>
        <Button title={exporting === 'excel' ? 'Preparing...' : 'Export Excel'} icon="document-text" onPress={() => doExport('excel')} style={{ flex: 1, opacity: exporting ? 0.7 : 1 }} />
        <View style={{ width: 12 }} />
        <Button title={exporting === 'pdf' ? 'Preparing...' : 'Export PDF'} icon="document" color={colors.red} onPress={() => doExport('pdf')} style={{ flex: 1, opacity: exporting ? 0.7 : 1 }} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, marginBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  thead: { backgroundColor: '#E6EEF1', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  row: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  bar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
});