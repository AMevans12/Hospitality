import React from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Screen, Header, Card, Avatar, Button } from '../components/ui';
import EmployeeTabs from '../components/EmployeeTabs';
import { useAuth } from '../auth/AuthContext';

const ROLES = { staff: 'Staff', head: 'Department Head', hr: 'HR', admin: 'Admin' };

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || '-'}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need your PIN to log in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  const face = user?.face_required ? (user?.face_enrolled ? 'Enrolled' : 'Not enrolled') : 'Not required';

  return (
    <>
      <Screen header={<Header title="Profile" />}>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <Card style={{ alignItems: 'center', marginBottom: 12 }}>
            <Avatar size={84} />
            <Text style={s.name}>{user?.name}</Text>
            <Text style={s.role}>{ROLES[user?.role] || ''}</Text>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Row label="Employee ID" value={user?.employee_id} />
            <Row label="Designation" value={user?.designation} />
            <Row label="Department" value={user?.department} />
            <Row label="Face verification" value={face} />
          </Card>

          <Button title="Change PIN" onPress={() => navigation.navigate('ChangePin')} style={{ marginBottom: 12 }} />
          <Button title="Log out" color={colors.red} onPress={confirmLogout} />
        </ScrollView>
      </Screen>
      <EmployeeTabs active="profile" navigation={navigation} />
    </>
  );
}

const s = StyleSheet.create({
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 10 },
  role: { color: colors.muted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.muted, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
});