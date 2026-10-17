import React, { useEffect, useRef } from 'react';
import { View, Text, ImageBackground, Animated, StyleSheet } from 'react-native';
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
  const pop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const rows = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
    Animated.stagger(
      130,
      rows.map((v) => Animated.timing(v, { toValue: 1, duration: 380, delay: 350, useNativeDriver: true }))
    ).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <ImageBackground source={BG} style={s.root} resizeMode="cover">
      <View style={[s.top, { paddingTop: insets.top + 30 }]}>
        <Animated.View
          style={{
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}
        >
          <Animated.View
            style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}
          >
            <BrandLogo size={120} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={s.panel}>
        <View style={s.inner}>
          <Text style={s.title}>Staff Attendance App</Text>

          <View style={s.card}>
            {FEATURES.map(([icon, label], i) => (
              <Animated.View
                key={label}
                style={[
                  s.row,
                  {
                    opacity: rows[i],
                    transform: [{ translateY: rows[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                  },
                ]}
              >
                <View style={s.iconBox}>
                  <Ionicons name={icon} size={20} color={colors.primary} />
                </View>
                <Text style={s.label}>{label}</Text>
              </Animated.View>
            ))}
          </View>
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
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center' },
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