import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { Screen, Header, Card } from '../components/ui';
import DepartmentPicker from '../components/DepartmentPicker';
import PullToRefresh from '../components/PullToRefresh';
import { api, errorMessage } from '../api/client';

const TABS = [
  { key: 'present', label: 'Present' },
  { key: 'late', label: 'Late' },
  { key: 'absent', label: 'Absent' },
  { key: 'leave', label: 'On Leave' },
];

const clock = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function DayListScreen({ navigation, route }) {
  const [status, setStatus] = useState('present');
  const [dept, setDept] = useState(route.params?.dept ?? null);
  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const req = useRef(0);

  useEffect(() => {
    api.get('/departments/').then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const id = ++req.current;
    try {
      setError('');
      const r = await api.get('/dashboard/list/', { params: { status, ...(dept ? { department: dept } : {}) } });
      if (id === req.current) setRows(r.data.items);
    } catch (e) {
      if (id === req.current) setError(errorMessage(e));
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, [status, dept]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const showTimes = status === 'present' || status === 'late';

  return (
    <Screen header={<Header title="Today's List" onBack={() => navigation.goBack()} />}>
      <View style={s.top}>
        <View style={s.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.pill, status === t.key && s.pillOn]}
              onPress={() => setStatus(t.key)}
            >
              <Text style={[s.pillText, status === t.key && { color: '#fff' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <DepartmentPicker departments={departments} value={dept} onChange={setDept} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
      ) : (
        <PullToRefresh onRefresh={load} contentContainerStyle={{ padding: 14, paddingTop: 4 }}>
          {error ? (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>
              <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
            </Card>
          ) : (
            <Text style={s.count}>{rows.length} {rows.length === 1 ? 'person' : 'people'}</Text>
          )}

          {!error && rows.length === 0 ? <Text style={s.empty}>Nobody in this list.</Text> : null}

          {rows.map((r) => (
            <Card key={r.id} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.name}</Text>
                <Text style={s.meta}>
                  {r.employee_id}{r.designation ? `  •  ${r.designation}` : ''}{r.department ? `  •  ${r.department}` : ''}
                </Text>
              </View>
              {showTimes ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.time}>In {clock(r.check_in)}</Text>
                  <Text style={s.time}>Out {clock(r.check_out)}</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </PullToRefresh>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { padding: 14, paddingBottom: 8 },
  tabs: { flexDirection: 'row', marginBottom: 10 },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 9, marginRight: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  count: { color: colors.muted, marginBottom: 10, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30 },
  card: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  time: { color: colors.text, fontSize: 12.5, marginTop: 1 },
});