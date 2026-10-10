import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, StatTile, ActionTile } from '../components/ui';

export default function AdminDashboard({ navigation }) {
  return (
    <Screen
      header={
        <Header
          title="Yahya Hospital"
          subtitle="Admin Dashboard"
          onMenu={() => {}}
          right={<Ionicons name="notifications" size={24} color="#fff" />}
        />
      }
    >
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={s.today}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Today</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Tue, 29 Sep 2026</Text>
          </View>
          <TouchableOpacity style={s.dropdown}>
            <Text style={{ color: colors.text, fontSize: 13 }}>All Departments</Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>
        </Card>

        <View style={s.row}>
          <StatTile value="42" label="Present" icon="people" color={colors.green} bg={colors.greenBg} />
          <View style={{ width: 12 }} />
          <StatTile value="6" label="Absent" icon="person-remove" color={colors.red} bg={colors.redBg} />
        </View>
        <View style={s.row}>
          <StatTile value="8" label="Late" icon="time" color={colors.amber} bg={colors.amberBg} />
          <View style={{ width: 12 }} />
          <StatTile value="2" label="On Leave" icon="airplane" color={colors.blue} bg={colors.blueBg} />
        </View>

        <View style={s.row}>
          <ActionTile icon="calendar-outline" label="View Attendance" onPress={() => navigation.navigate('AttendanceReport')} />
          <View style={{ width: 12 }} />
          <ActionTile icon="people-outline" label="Manage Employees" onPress={() => navigation.navigate('EmployeeManagement')} />
        </View>
        <View style={s.row}>
          <ActionTile icon="bar-chart-outline" label="Reports" onPress={() => navigation.navigate('AttendanceReport')} />
          <View style={{ width: 12 }} />
          <ActionTile icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  today: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', marginBottom: 12 },
});
