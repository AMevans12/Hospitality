import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';

export default function LocationVerification({ navigation }) {
  return (
    <Screen header={<Header title="Location Verification" onBack={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={s.status}>
          <Ionicons name="checkmark-circle" size={40} color={colors.green} />
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: colors.muted }}>You are at</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Yahya Hospital</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Location verified successfully</Text>
          </View>
        </Card>

        {/* Map placeholder - real map / GPS comes later */}
        <View style={s.map}>
          <View style={s.circle}>
            <Ionicons name="location" size={40} color={colors.red} />
            <Text style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>Yahya Hospital</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>Haripur</Text>
            <View style={s.dot} />
          </View>
          <Text style={s.within}>Within 45 metres</Text>
        </View>

        <Card style={{ marginTop: 14, marginBottom: 14 }}>
          <View style={s.row}>
            <Ionicons name="location" size={22} color={colors.blue} />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.label}>Hospital Location</Text>
              <Text style={s.value}>33.99522° N, 72.92849° E</Text>
            </View>
          </View>
          <View style={[s.row, { marginTop: 14 }]}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.label}>Allowed Radius</Text>
              <Text style={s.value}>100 metres</Text>
            </View>
          </View>
        </Card>

        <Button title="Confirm Attendance" onPress={() => navigation.navigate('AttendanceSuccess')} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  map: { height: 260, borderRadius: 14, backgroundColor: '#DDE7EA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circle: { width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(30,142,62,0.18)', borderWidth: 2, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#fff', marginTop: 8 },
  within: { position: 'absolute', bottom: 10, fontWeight: '700', color: colors.green },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
