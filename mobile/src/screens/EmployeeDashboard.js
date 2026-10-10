import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Screen, Header, Card, Badge, Avatar, ActionTile, BottomTabs } from '../components/ui';

export default function EmployeeDashboard({ navigation }) {
  return (
    <>
      <Screen header={<Header title="Dashboard" right={null} onMenu={() => {}} />}>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <Card style={s.profile}>
            <Avatar size={64} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={s.name}>Dr. Ahmad Khan</Text>
              <Text style={s.meta}>Employee ID: YH-0123</Text>
              <Text style={s.meta}>Designation: Medical Officer</Text>
              <Text style={s.meta}>Department: Medicine</Text>
            </View>
          </Card>

          <Card style={s.today}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Today</Text>
              <Text style={s.meta}>Tue, 29 Sep 2026</Text>
            </View>
            <Badge text="Not Checked In" type="red" />
          </Card>

          <View style={s.row}>
            <ActionTile icon="log-in-outline" label="Check In" bg={colors.green} color="#fff" textColor="#fff" onPress={() => navigation.navigate('FaceVerification')} />
            <View style={{ width: 12 }} />
            <ActionTile icon="log-out-outline" label="Check Out" bg={colors.red} color="#fff" textColor="#fff" onPress={() => navigation.navigate('FaceVerification')} />
          </View>
          <View style={s.row}>
            <ActionTile icon="calendar-outline" label="My Attendance" onPress={() => navigation.navigate('AttendanceHistory')} />
            <View style={{ width: 12 }} />
            <ActionTile icon="bar-chart-outline" label="Monthly Report" onPress={() => navigation.navigate('AttendanceHistory')} />
          </View>
          <View style={s.row}>
            <ActionTile icon="person-outline" label="Profile" />
            <View style={{ width: 12 }} />
            <ActionTile icon="megaphone-outline" label="Announcements" />
          </View>
        </ScrollView>
      </Screen>
      <BottomTabs active="home" navigation={navigation} />
    </>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 1 },
  today: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
});
