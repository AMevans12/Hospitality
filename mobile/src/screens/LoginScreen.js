import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Logo, Button } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';
import PasswordInput from '../components/PasswordInput';

export default function LoginScreen() {
  const { login, notice, setNotice, lastId } = useAuth();
  const [empId, setEmpId] = useState(lastId || '');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!empId.trim() || !pin) return setError('Enter your employee ID and PIN');
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await login(empId, pin);      // navigation switches automatically
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: 40 }}><Logo size={70} /></View>
          <Text style={s.title}>Staff Attendance</Text>
          <Text style={s.sub}>Login to your account</Text>

          <View style={s.input}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <TextInput style={s.field} placeholder="Employee ID" placeholderTextColor={colors.muted}
              value={empId} onChangeText={setEmpId} autoCapitalize="characters" autoCorrect={false} />
          </View>
          <PasswordInput icon="lock-closed" placeholder="PIN / Password" value={pin}
            onChangeText={setPin} style={{ width: '100%', marginBottom: 14 }} />

          {notice ? <Text style={s.notice}>{notice}</Text> : null}
          {error ? <Text style={s.error}>{error}</Text> : null}

          <Button title={busy ? 'Please wait...' : 'Login'} style={{ width: '100%', marginTop: 8, opacity: busy ? 0.7 : 1 }} onPress={submit} />
          <Text style={s.hint}>Forgot your PIN? Contact HR to reset it.</Text>

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
  notice: { color: colors.green, alignSelf: 'flex-start', marginBottom: 10, fontWeight: '600' },
  error: { color: colors.red, alignSelf: 'flex-start', marginBottom: 8 },
  hint: { color: colors.muted, marginTop: 18, fontSize: 12 },
  bottom: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 50 },
  tag: { color: colors.green, fontSize: 16, fontStyle: 'italic' },
});