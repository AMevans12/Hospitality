import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';
import PullToRefresh from '../components/PullToRefresh';
import EmployeeTabs from '../components/EmployeeTabs';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (iso) => {
  const d = new Date(iso);
  const h = d.getHours();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function AnnouncementsScreen({ navigation }) {
  const { user } = useAuth();
  const canPost = user?.role === 'admin' || user?.role === 'hr';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const r = await api.get('/announcements/');
      setItems(r.data.items);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = (a) => {
    setOpenId(openId === a.id ? null : a.id);
    if (!a.read) {
      setItems((list) => list.map((x) => (x.id === a.id ? { ...x, read: true } : x)));
      api.post(`/announcements/${a.id}/read/`).catch(() => {});
    }
  };

  const remove = (a) =>
    Alert.alert('Delete announcement?', a.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/announcements/${a.id}/`); load(); }
          catch (e) { Alert.alert('Could not delete', errorMessage(e)); }
        },
      },
    ]);

  const post = async () => {
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      await api.post('/announcements/', { title, body });
      setComposing(false);
      setTitle('');
      setBody('');
      load();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Screen
        header={
          <Header
            title="Announcements"
            onBack={canPost ? () => navigation.goBack() : undefined}
            right={
              canPost ? (
                <TouchableOpacity onPress={() => setComposing(true)} style={{ padding: 4 }}>
                  <Ionicons name="add-circle-outline" size={28} color="#fff" />
                </TouchableOpacity>
              ) : undefined
            }
          />
        }
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
        ) : (
          <PullToRefresh onRefresh={load} contentContainerStyle={{ padding: 14 }}>
            {error ? (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>
                <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
              </Card>
            ) : null}

            {!error && items.length === 0 ? (
              <Text style={s.empty}>No announcements yet.</Text>
            ) : null}

            {items.map((a) => {
              const open = openId === a.id;
              return (
                <TouchableOpacity key={a.id} activeOpacity={0.85} onPress={() => toggle(a)}>
                  <Card style={{ marginBottom: 12 }}>
                    <View style={s.head}>
                      {!a.read ? <View style={s.dot} /> : null}
                      <Text style={[s.title, !a.read && { fontWeight: '800' }]} numberOfLines={open ? undefined : 1}>
                        {a.title}
                      </Text>
                      {canPost ? (
                        <TouchableOpacity onPress={() => remove(a)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="trash-outline" size={20} color={colors.red} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={s.meta}>{a.author ? `${a.author}  •  ` : ''}{fmt(a.created_at)}</Text>
                    <Text style={s.body} numberOfLines={open ? undefined : 2}>{a.body}</Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </PullToRefresh>
        )}
      </Screen>

      {!canPost ? <EmployeeTabs active="news" navigation={navigation} /> : null}

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New announcement</Text>
            <TextInput
              style={s.input} placeholder="Title" placeholderTextColor={colors.muted}
              value={title} onChangeText={setTitle} maxLength={120}
            />
            <TextInput
              style={[s.input, { height: 130, textAlignVertical: 'top' }]} placeholder="Message"
              placeholderTextColor={colors.muted} value={body} onChangeText={setBody} multiline maxLength={2000}
            />
            {formError ? <Text style={{ color: colors.red, marginBottom: 8 }}>{formError}</Text> : null}
            <Button title={busy ? 'Posting...' : 'Post to everyone'} onPress={post} />
            <TouchableOpacity onPress={() => setComposing(false)} style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={{ color: colors.muted, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  head: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626', marginRight: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3, marginBottom: 8 },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 12, color: colors.text, fontSize: 15,
  },
});