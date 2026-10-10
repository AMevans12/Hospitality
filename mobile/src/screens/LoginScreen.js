import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Logo, Button } from '../components/ui';

export default function LoginScreen({ navigation }) {
  const [empId, setEmpId] = useState('');
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: 40 }}><Logo size={70} /></View>
          <Text style={s.title}>Staff Attendance</Text>
          <Text style={s.sub}>Login to your account</Text>

          <View style={s.input}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <TextInput style={s.field} placeholder="Employee ID" placeholderTextColor={colors.muted} value={empId} onChangeText={setEmpId} autoCapitalize="characters" />
          </View>
          <View style={s.input}>
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <TextInput style={s.field} placeholder="PIN / Password" placeholderTextColor={colors.muted} secureTextEntry={!show} value={pin} onChangeText={setPin} />
            <TouchableOpacity onPress={() => setShow(!show)}>
              <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Button title="Login" style={{ width: '100%', marginTop: 8 }} onPress={() => navigation.replace('EmployeeDashboard')} />
          <TouchableOpacity style={{ marginTop: 18 }}>
            <Text style={{ color: colors.primary }}>Forgot PIN?</Text>
          </TouchableOpacity>

          {/* Temporary shortcut so you can open the admin UI - remove after login logic */}
          <TouchableOpacity style={{ marginTop: 14 }} onPress={() => navigation.replace('AdminDashboard')}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Open Admin Dashboard (dev shortcut)</Text>
          </TouchableOpacity>

          <View style={s.bottom}>
            <Ionicons name="medical" size={70} color="#D4ECEF" />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.tag}>Our People</Text>
              <Text style={[s.tag, { fontSize: 22, color: colors.primary }]}>Our Strength</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, marginTop: 28 },
  sub: { color: colors.muted, marginBottom: 22, marginTop: 4 },
  input: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14, backgroundColor: '#fff' },
  field: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, color: colors.text, fontSize: 15 },
  bottom: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 50 },
  tag: { color: colors.green, fontSize: 16, fontStyle: 'italic' },
});
