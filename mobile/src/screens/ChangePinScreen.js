import React, { useRef, useState } from 'react';
import { Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';

export default function ChangePinScreen({ navigation }) {
  const { user, changePin, logout } = useAuth();
  const forced = useRef(user.must_change_pin).current;   // first-login screen vs. voluntary change
  const [oldPin, setOld] = useState('');
  const [newPin, setNew] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (newPin.length < 4) return setError('New PIN must be at least 4 characters');
    if (newPin !== again) return setError('The new PINs do not match');
    setBusy(true);
    setError('');
    try {
      await changePin(oldPin, newPin);
      if (!forced) {
        Alert.alert('Done', 'Your PIN was changed.');
        navigation.goBack();
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header title={forced ? 'Set Your PIN' : 'Change PIN'} onBack={forced ? undefined : () => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={s.info}>
            {forced ? 'For your security, replace the temporary PIN you were given with your own.' : 'Enter your current PIN, then choose a new one.'}
          </Text>
          <PasswordInput style={s.gap} placeholder={forced ? 'Temporary / current PIN' : 'Current PIN'} value={oldPin} onChangeText={setOld} />
          <PasswordInput style={s.gap} placeholder="New PIN" value={newPin} onChangeText={setNew} />
          <PasswordInput style={s.gap} placeholder="Repeat new PIN" value={again} onChangeText={setAgain} />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Button title={busy ? 'Please wait...' : 'Save PIN'} onPress={submit} style={{ marginTop: 6, opacity: busy ? 0.7 : 1 }} />
        </Card>
        {forced ? (
          <TouchableOpacity onPress={logout} style={{ alignSelf: 'center', marginTop: 18 }}>
            <Text style={{ color: colors.muted }}>Log out</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  info: { color: colors.muted, marginBottom: 14, lineHeight: 20 },
  gap: { marginBottom: 12 },
  error: { color: colors.red, marginBottom: 8 },
});