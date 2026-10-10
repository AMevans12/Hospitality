import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Screen, Header, Card, Badge, Chip, BottomTabs } from '../components/ui';

const DATA = [
  { day: 'Tue', date: '29 Sep', in: '08:02 AM', out: '--', status: 'Present' },
  { day: 'Mon', date: '28 Sep', in: '08:05 AM', out: '04:10 PM', status: 'Present' },
  { day: 'Sun', date: '27 Sep', in: '--', out: '--', status: 'Absent' },
  { day: 'Sat', date: '26 Sep', in: '08:12 AM', out: '04:05 PM', status: 'Present' },
  { day: 'Fri', date: '25 Sep', in: '08:00 AM', out: '04:20 PM', status: 'Present' },
];

export default function AttendanceHistory({ navigation }) {
  const [tab, setTab] = useState('This Week');
  return (
    <>
      <Screen header={<Header title="My Attendance" onBack={() => navigation.goBack()} />}>
        <View style={{ flexDirection: 'row', padding: 14 }}>
          {['This Week', 'This Month', 'All'].map((t) => (
            <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          {DATA.map((d) => (
            <Card key={d.date} style={s.row}>
              <View style={{ width: 62 }}>
                <Text style={s.day}>{d.day}</Text>
                <Text style={s.date}>{d.date}</Text>
              </View>
              <Text style={s.time}>{d.in}</Text>
              <Text style={s.time}>{d.out}</Text>
              <Badge text={d.status} type={d.status === 'Present' ? 'green' : 'red'} />
            </Card>
          ))}
        </ScrollView>
      </Screen>
      <BottomTabs active="att" navigation={navigation} />
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  day: { fontWeight: '700', color: colors.text },
  date: { color: colors.muted, fontSize: 12 },
  time: { color: colors.text, fontSize: 13, width: 78, textAlign: 'center' },
});
