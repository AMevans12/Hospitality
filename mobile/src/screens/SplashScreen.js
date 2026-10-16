import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import BrandLogo from '../components/BrandLogo';

const BG = require('../../assets/images/Background.png');

const FEATURES = [
  ['shield-checkmark-outline', 'Secure Attendance'],
  ['scan-outline', 'Face Verification'],
  ['location-outline', 'Location Based'],
  ['people-outline', 'For A Better Team'],
];

export default function SplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={BG} style={s.root} resizeMode="cover">
      <View style={[s.top, { paddingTop: insets.top + 30 }]}>
        <BrandLogo size={120} />
      </View>

      <View style={s.panel}>
        <Text style={s.title}>Staff Attendance App</Text>

        <View style={s.card}>
          {FEATURES.map(([icon, label]) => (
            <View key={label} style={s.row}>
              <View style={s.iconBox}>
                <Ionicons name={icon} size={20} color={colors.primary} />
              </View>
              <Text style={s.label}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.footText}>Care  |  Service  |  Teamwork</Text>
      </View>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  top: { flex: 1, alignItems: 'center' },
  panel: { backgroundColor: 'rgba(255,255,255,0.78)', paddingTop: 18, paddingBottom: 22 },
  title: { color: colors.primary, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 14 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 24, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 18,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E6F2F4', alignItems: 'center', justifyContent: 'center' },
  label: { marginLeft: 14, fontSize: 15, color: colors.text, fontWeight: '500' },
  footer: { backgroundColor: colors.green, paddingTop: 16 },
  footText: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 15 },
});