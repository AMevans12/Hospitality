import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Card, Button, InfoRow } from '../components/ui';

export default function AttendanceSuccess({ navigation }) {
  return (
    <Screen header={null} style={{ backgroundColor: colors.primary }}>
      <ScrollView contentContainerStyle={{ padding: 18, flexGrow: 1 }}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View style={s.circle}>
            <Ionicons name="checkmark" size={70} color="#fff" />
          </View>
          <Text style={s.title}>Check-In Successful</Text>
          <Text style={s.sub}>Welcome Dr. Ahmad Khan</Text>
        </View>

        <Card style={{ marginTop: 24, marginBottom: 20 }}>
          <InfoRow icon="calendar-outline" label="Date" value="Tue, 29 Sep 2026" />
          <InfoRow icon="time-outline" label="Time" value="08:02 AM" />
          <InfoRow icon="location-outline" label="Location" value="Yahya Hospital (45 m)" />
          <InfoRow icon="scan-outline" label="Face Verification" value="Verified" />
        </Card>

        <Button title="OK" onPress={() => navigation.popToTop()} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  circle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 18 },
  sub: { color: '#cfe0e6', marginTop: 4 },
});
