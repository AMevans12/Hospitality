import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme';

const LOGO = require('../../assets/images/Logo.png');   // 472 x 515

export default function BrandLogo({ size = 90, nameColor = colors.primary, subColor = colors.muted }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Image source={LOGO} style={{ width: size * (472 / 515), height: size }} resizeMode="contain" />
      <Text style={[s.name, { fontSize: size * 0.27, color: nameColor, marginTop: size * 0.12 }]}>YAHYA HOSPITAL</Text>
      <Text style={[s.sub, { fontSize: size * 0.13, color: subColor }]}>HARIPUR</Text>
    </View>
  );
}

const s = StyleSheet.create({
  name: { fontWeight: '800', letterSpacing: 1 },
  sub: { letterSpacing: 5, marginTop: 2 },
});