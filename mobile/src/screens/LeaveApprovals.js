import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Alert, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { Screen, Header, Card, Chip, Avatar, Button } from '../components/ui';
import { useRefresh } from '../components/PullToRefresh';
import { api, errorMessage } from '../api/client';

const TABS = [['Pending', 'pending'], ['Approved', 'approved'], ['Rejected', 'rejected']];
const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmt = (s) => fromIso(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function LeaveApprovals({ navigation }) {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/leaves/manage/', { params: { status } });
      setItems(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refreshControl = useRefresh(load);

  const decide = (l, action) =>
    Alert.alert(
      action === 'approve' ? 'Approve leave' : 'Reject leave',
      `${l.name}: ${fmt(l.from_date)}${l.from_date === l.to_date ? '' : ' to ' + fmt(l.to_date)} (${l.days} day${l.days > 1 ? 's' : ''})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () =>
            api.post(`/leaves/${l.id}/decide/`, { action }).then(load).catch((e) => Alert.alert('Error', errorMessage(e))),
        },
      ]
    );

  return (
    <Screen header={<Header title="Leave Requests" onBack={() => navigation.goBack()} />}>
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, alignItems: 'center' }}>
          {TABS.map(([label, key]) => (
            <Chip key={key} label={label} active={status === key} onPress={() => { setLoading(true); setStatus(key); }} />
          ))}
        </ScrollView>
      </View>

      {error ? <Text style={{ color: colors.red, margin: 14 }}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => String(l.id)}
          refreshControl={refreshControl}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No {status} requests</Text>}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar size={42} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{item.name}</Text>
                  <Text style={s.meta}>{item.employee_id} | {item.department || 'No department'}</Text>
                </View>
              </View>
              <Text style={{ marginTop: 10, fontWeight: '600', color: colors.text }}>
                {fmt(item.from_date)}{item.from_date === item.to_date ? '' : `  to  ${fmt(item.to_date)}`}  ({item.days} day{item.days > 1 ? 's' : ''})
              </Text>
              {item.reason ? <Text style={s.meta}>{item.reason}</Text> : null}
              {item.status !== 'pending' && item.decided_by ? <Text style={s.meta}>Decided by {item.decided_by}</Text> : null}
              {item.status === 'pending' ? (
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <Button title="Approve" onPress={() => decide(item, 'approve')} style={{ flex: 1, marginRight: 8 }} />
                  <Button title="Reject" color={colors.red} onPress={() => decide(item, 'reject')} style={{ flex: 1 }} />
                </View>
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});