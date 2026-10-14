import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Badge, StatTile, BottomTabs } from '../components/ui';
import PullToRefresh from '../components/PullToRefresh';
import { clock } from '../utils/time';
import { api, errorMessage } from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BADGE = {
  present: ['Present', 'green'],
  late: ['Late', 'amber'],
  absent: ['Absent', 'red'],
  leave: ['Leave', 'blue'],
  holiday: ['Holiday', 'blue'],
  pending: ['Today', 'amber'],
};

const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function AttendanceHistory({ navigation }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const latest = useRef('');
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth() + 1;

  const load = useCallback(async () => {
    const k = monthKey(ym.y, ym.m);
    latest.current = k;
    try {
      setError('');
      const r = await api.get('/attendance/history/', { params: { month: k } });
      if (latest.current === k) setData(r.data);      // ignore a slow reply for a month we already left
    } catch (e) {
      if (latest.current === k) setError(errorMessage(e));
    } finally {
      if (latest.current === k) setLoading(false);
    }
  }, [ym]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const move = (delta) => {
    let { y, m } = ym;
    m += delta;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setLoading(true);
    setYm({ y, m });
  };

  const sm = data?.summary;

  return (
    <>
      <Screen header={<Header title="My Attendance" onBack={() => navigation.goBack()} />}>
        <PullToRefresh onRefresh={load} contentContainerStyle={{ padding: 14 }}>
          <Card style={s.monthBar}>
            <TouchableOpacity onPress={() => move(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={s.monthText}>{MONTHS_FULL[ym.m - 1]} {ym.y}</Text>
            <TouchableOpacity disabled={isCurrent} onPress={() => move(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-forward" size={24} color={isCurrent ? colors.border : colors.primary} />
            </TouchableOpacity>
          </Card>

          {error ? (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>
              <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
            </Card>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} size="large" color={colors.green} />
          ) : data ? (
            <>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {[[sm.present, 'Present', colors.green, colors.greenBg], [sm.absent, 'Absent', colors.red, colors.redBg],
                  [sm.late, 'Late', colors.amber, colors.amberBg], [sm.leave, 'Leave', colors.blue, colors.blueBg]].map(([v, l, c, b], i) => (
                  <StatTile key={l} value={v} label={l} color={c} bg={b} style={{ marginLeft: i ? 8 : 0, flexDirection: 'column', paddingVertical: 12 }} />
                ))}
              </View>
              <Text style={s.rate}>Attendance rate: <Text style={{ fontWeight: '800', color: colors.text }}>{sm.percent}%</Text></Text>

              {data.days.length === 0 ? (
                <Card><Text style={{ color: colors.muted }}>No records for this month.</Text></Card>
              ) : (
                data.days.map((d) => {
                  const dt = parse(d.date);
                  const [label, tone] = BADGE[d.status] || [d.status, 'blue'];
                  return (
                    <Card key={d.date} style={s.row}>
                      <View style={{ width: 62 }}>
                        <Text style={s.day}>{DAYS[dt.getDay()]}</Text>
                        <Text style={s.date}>{String(dt.getDate()).padStart(2, '0')} {MONTHS[dt.getMonth()]}</Text>
                      </View>
                      <Text style={s.time}>{d.check_in ? clock(d.check_in) : '--'}</Text>
                      <Text style={s.time}>{d.check_out ? clock(d.check_out) : '--'}</Text>
                      <Badge text={label} type={tone} />
                    </Card>
                  );
                })
              )}
            </>
          ) : null}
        </PullToRefresh>
      </Screen>
      <BottomTabs active="att" navigation={navigation} />
    </>
  );
}

const s = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthText: { fontSize: 17, fontWeight: '700', color: colors.text },
  rate: { color: colors.muted, marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  day: { fontWeight: '700', color: colors.text },
  date: { color: colors.muted, fontSize: 12 },
  time: { color: colors.text, fontSize: 13, width: 74, textAlign: 'center' },
});