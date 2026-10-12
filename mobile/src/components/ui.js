import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

// Top bar used on most screens
export function Header({ title, subtitle, onBack, onMenu, right }) {
  return (
    <View style={s.header}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={s.headerSide}>
        {onBack ? (
          <TouchableOpacity onPress={onBack}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
        ) : onMenu ? (
          <TouchableOpacity onPress={onMenu}><Ionicons name="menu" size={26} color="#fff" /></TouchableOpacity>
        ) : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={s.headerTitle}>{title}</Text>
        {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}
      </View>
      <View style={[s.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

// Screen wrapper: dark top safe area + header + content area
export function Screen({ children, header, style }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top']}>
      {header}
      <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function Button({ title, onPress, color = colors.green, icon, style, textColor = '#fff' }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.btn, { backgroundColor: color }, style]}>
      {icon ? <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: 8 }} /> : null}
      <Text style={[s.btnText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, shadow, style]}>{children}</View>;
}

export function Badge({ text, type = 'green' }) {
  const map = {
    green: [colors.greenBg, colors.green],
    red: [colors.redBg, colors.red],
    amber: [colors.amberBg, '#B27300'],
    blue: [colors.blueBg, colors.blue],
  };
  const [bg, fg] = map[type];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Big coloured number tile (admin dashboard + report)
export function StatTile({ value, label, color, bg, icon, style }) {
  return (
    <View style={[s.stat, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={30} color={color} /> : null}
      <View style={{ alignItems: 'center', flex: icon ? 0 : 1 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color }}>{value}</Text>
        <Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text>
      </View>
    </View>
  );
}

// Square action button (dashboards)
export function ActionTile({ icon, label, onPress, bg = colors.card, color = colors.primary, textColor = colors.text, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[s.action, shadow, { backgroundColor: bg }, disabled && { opacity: 0.35 }]}
    >
      <Ionicons name={icon} size={30} color={color} />
      <Text style={{ marginTop: 8, color: textColor, fontWeight: '600', fontSize: 13, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}


// Label + value row with icon (success screen, settings)
export function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={22} color={colors.primary} style={{ width: 34 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
  );
}

// Logo placeholder - replace with your real logo image later
export function Logo({ size = 80, light = false }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name="leaf" size={size} color={light ? '#fff' : colors.green} />
      <Text style={{ fontSize: size * 0.32, fontWeight: '800', color: light ? '#fff' : colors.primary, letterSpacing: 1 }}>
        YAHYA HOSPITAL
      </Text>
      <Text style={{ fontSize: size * 0.14, letterSpacing: 4, color: light ? '#dfe9ec' : colors.muted }}>HARIPUR</Text>
    </View>
  );
}

// Bottom tab bar (Home / Attendance / History / Profile)
export function BottomTabs({ active, navigation }) {
  const tabs = [
    { key: 'home', label: 'Home', icon: 'home', go: 'EmployeeDashboard' },
    { key: 'att', label: 'Attendance', icon: 'calendar-outline', go: 'AttendanceHistory' },
    { key: 'hist', label: 'History', icon: 'time-outline', go: 'AttendanceHistory' },
    { key: 'prof', label: 'Profile', icon: 'person-outline', go: 'EmployeeDashboard' },
  ];
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
      <View style={s.tabs}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <TouchableOpacity key={t.key} style={{ alignItems: 'center', flex: 1 }} onPress={() => navigation.navigate(t.go)}>
              <Ionicons name={t.icon} size={22} color={on ? colors.green : colors.muted} />
              <Text style={{ fontSize: 11, color: on ? colors.green : colors.muted, marginTop: 2 }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// Round avatar placeholder
export function Avatar({ size = 52, icon = 'person' }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#CFE0E6', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.55} color={colors.primary} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  headerSide: { width: 40 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#cfe0e6', fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10 },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 8 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 18, borderRadius: 12 },
  action: { flex: 1, aspectRatio: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabs: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
});
