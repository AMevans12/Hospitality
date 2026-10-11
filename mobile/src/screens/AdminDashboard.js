
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, StatTile, ActionTile } from '../components/ui';
import DepartmentPicker from '../components/DepartmentPicker';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../api/client';
import PullToRefresh from '../components/PullToRefresh';
import { openAccountMenu } from '../utils/accountMenu';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

export default function AdminDashboard({ navigation }) {
  const { logout, user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [dept, setDept] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');

      const [dash, deps] = await Promise.all([
        api.get('/dashboard/', {
          params: dept ? { department: dept } : {},
        }),
        api.get('/departments/'),
      ]);

      setData(dash.data);
      setDepartments(deps.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [dept]);

  // Reload whenever the screen is shown or the department changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const v = (key) => (data ? data[key] : '-');

  return (
    <Screen
      header={
        <Header
          title="Yahya Hospital"
          subtitle="Admin Dashboard"
          onMenu={() => openAccountMenu({ user, navigation, logout })}
          right={
            <TouchableOpacity onPress={logout}>
              <Ionicons
                name="log-out-outline"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          }
        />
      }
    >
      <PullToRefresh
        onRefresh={load}
        contentContainerStyle={{ padding: 14 }}
      >
        <Card style={s.today}>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.text,
              }}
            >
              Today
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {data ? fmtDate(data.date) : ' '}
            </Text>
          </View>

          <DepartmentPicker
            departments={departments}
            value={dept}
            onChange={setDept}
            style={{ maxWidth: 170 }}
          />
        </Card>

        {error ? (
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.red, marginBottom: 8 }}>
              {error}
            </Text>
            <TouchableOpacity onPress={load}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                Try again
              </Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        <View style={s.row}>
          <StatTile
            value={v('present')}
            label="Present"
            icon="people"
            color={colors.green}
            bg={colors.greenBg}
          />
          <View style={{ width: 12 }} />
          <StatTile
            value={v('absent')}
            label="Absent"
            icon="person-remove"
            color={colors.red}
            bg={colors.redBg}
          />
        </View>

        <View style={s.row}>
          <StatTile
            value={v('late')}
            label="Late"
            icon="time"
            color={colors.amber}
            bg={colors.amberBg}
          />
          <View style={{ width: 12 }} />
          <StatTile
            value={v('leave')}
            label="On Leave"
            icon="airplane"
            color={colors.blue}
            bg={colors.blueBg}
          />
        </View>

        <View style={s.row}>
          <ActionTile
            icon="calendar-outline"
            label="View Attendance"
            onPress={() => navigation.navigate('AttendanceReport')}
          />
          <View style={{ width: 12 }} />
          <ActionTile
            icon="people-outline"
            label="Manage Employees"
            onPress={() => navigation.navigate('EmployeeManagement')}
          />
        </View>

        <View style={s.row}>
          <ActionTile
            icon="bar-chart-outline"
            label="Reports"
            onPress={() => navigation.navigate('AttendanceReport')}
          />
          <View style={{ width: 12 }} />
          <ActionTile
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </PullToRefresh>
    </Screen>
  );
}

const s = StyleSheet.create({
  today: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});
