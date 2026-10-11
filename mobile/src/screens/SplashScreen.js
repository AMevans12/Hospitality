
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Logo } from '../components/ui';

export default function SplashScreen() {
  const features = [
    ['shield-checkmark-outline', 'Secure Attendance'],
    ['scan-outline', 'Face Verification'],
    ['location-outline', 'Location Based'],
    ['people-outline', 'For A Better Team'],
  ];

  return (
    <View style={s.root}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Logo size={90} light />
      </View>

      <Text style={s.title}>Staff Attendance App</Text>

      <View style={s.card}>
        {features.map(([icon, label]) => (
          <View key={label} style={s.row}>
            <Ionicons
              name={icon}
              size={20}
              color={colors.primary}
            />
            <Text style={s.label}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={s.footer}>
        <Text style={s.footText}>
          Care | Service | Teamwork
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 18,
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  label: {
    marginLeft: 14,
    fontSize: 15,
    color: colors.text,
  },
  footer: {
    backgroundColor: colors.green,
    paddingVertical: 16,
    marginTop: 24,
  },
  footText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
});
