import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../api/client';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home', route: 'EmployeeDashboard' },
  { key: 'history', label: 'History', icon: 'calendar', route: 'AttendanceHistory' },
  { key: 'news', label: 'Announcements', icon: 'megaphone', route: 'Announcements' },
  { key: 'profile', label: 'Profile', icon: 'person', route: 'Profile' },
];

export default function EmployeeTabs({ active, navigation }) {
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const pull = () =>
        api.get('/announcements/unread-count/')
          .then((r) => { if (alive) setUnread(r.data.unread); })
          .catch(() => {});
      pull();
      const t = setInterval(pull, 60000);
      return () => { alive = false; clearInterval(t); };
    }, [])
  );

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.inner}>
        {TABS.map((t) => {
          const on = t.key === active;
          const color = on ? colors.primary : colors.muted;
          return (
            <TouchableOpacity
              key={t.key}
              style={s.tab}
              activeOpacity={0.7}
              onPress={() => { if (!on) navigation.replace(t.route); }}
            >
              <View>
                <Ionicons name={on ? t.icon : `${t.icon}-outline`} size={24} color={color} />
                {t.key === 'news' && unread > 0 ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[s.label, { color }, on && { fontWeight: '700' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: 640, alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, marginTop: 2 },
  badge: {
    position: 'absolute', top: -5, right: -11, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});