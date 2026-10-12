import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Card, Button, InfoRow } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { dateLabel, clock, duration } from '../utils/time';

export default function AttendanceSuccess({ navigation, route }) {
  const { user } = useAuth();
  const { mode = 'in', record } = route.params || {};
  const out = mode === 'out';
  const when = out ? record?.check_out : record?.check_in;
  const dist = out ? record?.out_distance_m : record?.in_distance_m;

  return (
    <Screen header={null} style={{ backgroundColor: colors.primary }}>
      <ScrollView contentContainerStyle={{ padding: 18, flexGrow: 1 }}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View style={[s.circle, record?.status === 'late' && !out && { backgroundColor: colors.amber }]}>
            <Ionicons name="checkmark" size={70} color="#fff" />
          </View>
          <Text style={s.title}>{out ? 'Check-Out Successful' : 'Check-In Successful'}</Text>
          <Text style={s.sub}>{out ? `Thank you, ${user?.name}` : `Welcome ${user?.name}`}</Text>
        </View>

        <Card style={{ marginTop: 24, marginBottom: 20 }}>
          <InfoRow icon="calendar-outline" label="Date" value={dateLabel(when ? new Date(when) : new Date())} />
          <InfoRow icon="time-outline" label="Time" value={clock(when)} />
          <InfoRow icon="location-outline" label="Location" value={`Yahya Hospital${dist != null ? ` (${Math.round(dist)} m)` : ''}`} />
          {out
            ? <InfoRow icon="hourglass-outline" label="Time worked" value={duration(record?.worked_minutes)} />
            : <InfoRow icon="flag-outline" label="Status" value={record?.status === 'late' ? 'Late' : 'On time'} />}
        </Card>

        <Button title="OK" onPress={() => navigation.navigate('EmployeeDashboard')} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  circle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 18 },
  sub: { color: '#cfe0e6', marginTop: 4 },
});