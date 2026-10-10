import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card } from '../components/ui';

function Field({ icon, label, value, onChange }) {
  return (
    <View style={s.field}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 30 }} />
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const [lat, setLat] = useState('33.99522');
  const [lon, setLon] = useState('72.92849');
  const [radius, setRadius] = useState('100');
  const [start, setStart] = useState('08:00 AM');
  const [end, setEnd] = useState('04:00 PM');
  const [late, setLate] = useState('10');

  return (
    <Screen header={<Header title="Settings" onBack={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={{ marginBottom: 14 }}>
          <Text style={s.section}>Hospital Location (Geofence)</Text>
          <Field icon="location" label="Latitude" value={lat} onChange={setLat} />
          <Field icon="navigate-outline" label="Longitude" value={lon} onChange={setLon} />
          <Field icon="radio-button-on-outline" label={'Allowed Radius\n(metres)'} value={radius} onChange={setRadius} />
          <TouchableOpacity style={s.update}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Update</Text>
          </TouchableOpacity>
        </Card>

        <Card>
          <Text style={s.section}>Work Schedule</Text>
          <Field icon="time-outline" label="Shift Start Time" value={start} onChange={setStart} />
          <Field icon="person" label="Shift End Time" value={end} onChange={setEnd} />
          <Field icon="alarm-outline" label={'Late After\n(minutes)'} value={late} onChange={setLate} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  section: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  label: { flex: 1, color: colors.muted, fontSize: 13 },
  input: { width: 130, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, borderWidth: 1, borderColor: colors.border },
  update: { alignSelf: 'flex-end', backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 10, marginTop: 6 },
});
