import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, Animated, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Avatar } from './ui';
import { useAuth } from '../auth/AuthContext';

const PANEL_W = 290;

const roleLabel = (u) => {
  if (!u) return '';
  if (u.role === 'admin') return 'Administrator';
  if (u.role === 'hr') return 'HR';
  if (u.role === 'head') return 'Department Head';
  return u.designation || 'Staff';
};

/**
 * Slide-in menu from the left. Tap outside it (or press Android back) to close.
 * To add a new option later, add one object to `items` below.
 */
export default function SideMenu({ visible, onClose, navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-PANEL_W - 20)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(x, { toValue: -PANEL_W - 20, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  // ---- menu options: add more here later ----
  // ---- menu options: add more here later ----
  const canApprove = ['admin', 'hr', 'head'].includes(user?.role);
  const items = [
    ...(user?.role !== 'admin'
      ? [{ icon: 'calendar-outline', label: 'My Leave', onPress: () => navigation.navigate('Leave') }]
      : []),
    ...(canApprove
      ? [{ icon: 'document-text-outline', label: 'Leave Requests', onPress: () => navigation.navigate('LeaveApprovals') }]
      : []),
    { icon: 'key-outline', label: 'Change PIN', onPress: () => navigation.navigate('ChangePin') },
  ];

  const go = (fn) => {
    onClose();
    setTimeout(fn, 150);
  };

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: fade }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[s.panel, { width: PANEL_W, transform: [{ translateX: x }] }]}>
          <View style={[s.head, { paddingTop: insets.top + 18 }]}>
            <Avatar size={56} />
            <Text style={s.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={s.meta}>{user?.employee_id}  ·  {roleLabel(user)}</Text>
          </View>

          <View style={{ flex: 1, paddingTop: 8 }}>
            {items.map((it) => (
              <TouchableOpacity key={it.label} style={s.row} onPress={() => go(it.onPress)}>
                <Ionicons name={it.icon} size={22} color={colors.primary} style={{ width: 34 }} />
                <Text style={s.label}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ paddingBottom: insets.bottom + 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity style={s.row} onPress={() => go(confirmLogout)}>
              <Ionicons name="log-out-outline" size={22} color={colors.red} style={{ width: 34 }} />
              <Text style={[s.label, { color: colors.red }]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#fff', maxWidth: '85%' },
  head: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingBottom: 18 },
  name: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 12 },
  meta: { color: '#cfe0e6', fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15 },
  label: { fontSize: 15, color: colors.text, fontWeight: '500' },
});