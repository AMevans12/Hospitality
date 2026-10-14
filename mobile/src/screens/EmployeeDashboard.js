import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { Screen, Header, Card, Badge, Avatar, ActionTile, BottomTabs } from '../components/ui';
import PullToRefresh from '../components/PullToRefresh';
import { fmtTime } from '../components/TimeField';
import { useAuth } from '../auth/AuthContext';
import SideMenu from '../components/SideMenu';
import { api, errorMessage } from '../api/client';


const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dateLabel = (d) =>
  `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const clock = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export default function EmployeeDashboard({ navigation }) {
  const { user, updateUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

useFocusEffect(
  useCallback(() => {
    if (user?.face_required && !user?.face_enrolled) {
      navigation.replace('FaceEnroll');
    }
  }, [user?.face_required, user?.face_enrolled])
);

  const load = useCallback(async () => {
    try {
      setError('');
      const r = await api.get('/attendance/today/');
      setData(r.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const state = data?.state;
  const rec = data?.record;
  const shift = data?.shift;
  

  let badge = <Badge text="Not Checked In" type="red" />;
  if (state === 'checked_in') badge = <Badge text={rec?.status === 'late' ? 'Checked In (Late)' : 'Checked In'} type={rec?.status === 'late' ? 'amber' : 'green'} />;
  if (state === 'done') badge = <Badge text="Completed" type="blue" />;

  const worked = rec?.worked_minutes == null ? '--' : `${Math.floor(rec.worked_minutes / 60)}h ${rec.worked_minutes % 60}m`;

  return (
    <>
      <Screen header={<Header title="Dashboard" onMenu={() => setMenuOpen(true)} />}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
        ) : (
          <PullToRefresh onRefresh={load} contentContainerStyle={{ padding: 14 }}>
            <Card style={s.profile}>
              <Avatar size={64} />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={s.name}>{user?.name}</Text>
                <Text style={s.meta}>Employee ID: {user?.employee_id}</Text>
                <Text style={s.meta}>Designation: {user?.designation || '-'}</Text>
                <Text style={s.meta}>Department: {user?.department || '-'}</Text>
              </View>
            </Card>

            {error ? (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>
                <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
              </Card>
            ) : null}

            <Card style={{ marginBottom: 12 }}>
              <View style={s.todayRow}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Today</Text>
                  <Text style={s.meta}>{dateLabel(data?.server_time ? new Date(data.server_time) : new Date())}</Text>
                </View>
                {data ? badge : null}
              </View>
              {data ? (
                <>
                  <View style={s.divider} />
                  <Text style={[s.meta, { marginBottom: 10 }]}>
                    {shift
                      ? `Shift: ${shift.name}  (${fmtTime(shift.start_time)} - ${fmtTime(shift.end_time)}${shift.crosses_midnight ? ', next day' : ''})`
                      : 'No shift assigned yet. Ask HR.'}
                  </Text>
                  <View style={{ flexDirection: 'row' }}>
                    <Stat label="Check In" value={clock(rec?.check_in)} />
                    <Stat label="Check Out" value={clock(rec?.check_out)} />
                    <Stat label="Worked" value={worked} />
                  </View>
                </>
              ) : null}
            </Card>

            <View style={s.row}>
              <ActionTile
                icon="log-in-outline" label="Check In" bg={colors.green} color="#fff" textColor="#fff"
                disabled={state !== 'not_started'}
                onPress={() => navigation.navigate('LocationVerification', { mode: 'in' })}
              />
              <View style={{ width: 12 }} />
              <ActionTile
                icon="log-out-outline" label="Check Out" bg={colors.red} color="#fff" textColor="#fff"
                disabled={state !== 'checked_in'}
                onPress={() => navigation.navigate('LocationVerification', { mode: 'out' })}
              />
            </View>
            <View style={s.row}>
              <ActionTile icon="calendar-outline" label="My Attendance" onPress={() => navigation.navigate('AttendanceHistory')} />
              <View style={{ width: 12 }} />
              <ActionTile icon="bar-chart-outline" label="Monthly Report" onPress={() => navigation.navigate('AttendanceHistory')} />
            </View>
            <View style={s.row}>
              <ActionTile icon="person-outline" label="Profile" onPress={() => setMenuOpen(true)} />
              <View style={{ width: 12 }} />
              <ActionTile icon="megaphone-outline" label="Announcements" />
            </View>
          </PullToRefresh>
        )}
      </Screen>
      <BottomTabs active="home" navigation={navigation} />
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} navigation={navigation} />      
    </>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 1 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
});