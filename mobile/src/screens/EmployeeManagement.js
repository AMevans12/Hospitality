import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Modal, Alert, Share,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Badge, Chip, Avatar, Button } from '../components/ui';
import SelectField from '../components/SelectField';
import { useRefresh } from '../components/PullToRefresh';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../api/client';

const CHIPS = [['All', ''], ['Doctors', 'doctors'], ['Nursing', 'nursing'], ['Admin', 'admin'], ['Lab', 'lab']];
const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'head', label: 'Department Head' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Super Admin' },
];

// ---- text field (defined outside the screen so typing never loses focus) ----
function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

// ---- add / edit form ----
function EmployeeForm({ employee, departments, shifts, canAssignAdmin, onClose, onSaved }) {
  const editing = !!employee;
  const [f, setF] = useState({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    designation: employee?.designation || '',
    phone: employee?.phone || '',
    department: employee?.department ?? null,
    shift: employee?.shift ?? null,
    role: employee?.role || 'staff',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const roles = ROLES.filter((r) => canAssignAdmin || r.value === 'staff' || r.value === 'head');
  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }));
  const shiftOptions = shifts.map((x) => ({ value: x.id, label: `${x.name} (${x.start_time.slice(0, 5)} - ${x.end_time.slice(0, 5)})` }));

  const save = async () => {
    if (busy) return;
    if (!f.first_name.trim()) return setError('First name is required');
    setBusy(true);
    setError('');
    try {
      const payload = {
        first_name: f.first_name.trim(), last_name: f.last_name.trim(),
        designation: f.designation.trim(), phone: f.phone.trim(),
        department: f.department, shift: f.shift,
      };
      if (!editing || f.role !== employee.role) payload.role = f.role;   // only send role when it changes
      const res = editing
        ? await api.patch(`/employees/${employee.id}/`, payload)
        : await api.post('/employees/', payload);
      onSaved(res.data, !editing);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.formSheet}>
          <View style={s.formHead}>
            <Text style={s.formTitle}>{editing ? `Edit ${employee.employee_id}` : 'Add Employee'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.muted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
            <Field label="First name *" value={f.first_name} onChangeText={set('first_name')} />
            <Field label="Last name" value={f.last_name} onChangeText={set('last_name')} />
            <Field label="Designation" value={f.designation} onChangeText={set('designation')} placeholder="e.g. Medical Officer" />
            <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <SelectField label="Department" options={deptOptions} value={f.department} onChange={set('department')} clearable />
            <SelectField label="Shift" options={shiftOptions} value={f.shift} onChange={set('shift')} clearable />
            <SelectField label="Role" options={roles} value={f.role} onChange={set('role')} />
            {error ? <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text> : null}
            <Button title={busy ? 'Saving...' : editing ? 'Save Changes' : 'Create Employee'} onPress={save} style={{ opacity: busy ? 0.7 : 1 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---- temporary PIN shown once ----
function PinModal({ info, onClose }) {
  const share = () =>
    Share.share({
      message: `Yahya Hospital Attendance App\nEmployee ID: ${info.employee_id}\nTemporary PIN: ${info.temp_pin}\nYou will be asked to set your own PIN when you first log in.`,
    });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[s.backdrop, { justifyContent: 'center', padding: 24 }]}>
        <View style={s.pinCard}>
          <Ionicons name="key" size={34} color={colors.primary} />
          <Text style={s.formTitle}>{info.name}</Text>
          <Text style={{ color: colors.muted, marginTop: 14 }}>Employee ID</Text>
          <Text style={s.bigText}>{info.employee_id}</Text>
          <Text style={{ color: colors.muted, marginTop: 10 }}>Temporary PIN</Text>
          <Text style={[s.bigText, { letterSpacing: 6, color: colors.green }]}>{info.temp_pin}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginVertical: 14 }}>
            This is shown only once. Give it to the employee; they must set their own PIN at first login.
          </Text>
          <Button title="Share" icon="share-social" onPress={share} color={colors.primary} style={{ alignSelf: 'stretch' }} />
          <Button title="Done" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

// ---- row menu ----
function ActionMenu({ emp, onClose, onEdit, onReset, onToggle }) {
  const Item = ({ icon, label, onPress, color = colors.text }) => (
    <TouchableOpacity style={s.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ marginLeft: 14, fontSize: 15, color }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[s.backdrop, { justifyContent: 'center', padding: 30 }]} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet}>
          <Text style={[s.formTitle, { padding: 16, paddingBottom: 6 }]}>{emp.name}</Text>
          <Item icon="create-outline" label="Edit details" onPress={onEdit} />
          <Item icon="key-outline" label="Reset PIN" onPress={onReset} />
          {emp.is_active
            ? <Item icon="person-remove-outline" label="Deactivate" color={colors.red} onPress={onToggle} />
            : <Item icon="person-add-outline" label="Activate" color={colors.green} onPress={onToggle} />}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---- screen ----
export default function EmployeeManagement({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(null);    // null = closed, {} = add, employee = edit
  const [menu, setMenu] = useState(null);
  const [pin, setPin] = useState(null);

  // wait 350ms after typing before searching
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (search) params.search = search;
      if (cat) params.category = cat;
      const { data } = await api.get('/employees/', { params });
      setItems(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [search, cat]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    (async () => {
      try {
        const [d, sh] = await Promise.all([api.get('/departments/'), api.get('/shifts/')]);
        setDepartments(d.data);
        setShifts(sh.data);
      } catch (e) { /* dropdowns stay empty */ }
    })();
  }, []);

  const refreshControl = useRefresh(load);

  const fail = (e) => Alert.alert('Error', errorMessage(e));

  const askReset = (emp) =>
    Alert.alert('Reset PIN', `Create a new temporary PIN for ${emp.name}? Their old PIN stops working.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            const { data } = await api.post(`/employees/${emp.id}/reset-pin/`);
            setPin({ employee_id: data.employee_id, name: emp.name, temp_pin: data.temp_pin });
          } catch (e) { fail(e); }
        },
      },
    ]);

  const toggleActive = (emp) => {
    if (!emp.is_active) {
      api.patch(`/employees/${emp.id}/`, { is_active: true }).then(load).catch(fail);
      return;
    }
    Alert.alert('Deactivate employee', `${emp.name} will no longer be able to log in. Attendance history is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => api.delete(`/employees/${emp.id}/`).then(load).catch(fail) },
    ]);
  };

  const onSaved = (data, created) => {
    setForm(null);
    load();
    if (created) setPin({ employee_id: data.employee_id, name: data.name, temp_pin: data.temp_pin });
  };

  return (
    <Screen header={<Header title="Employees" onBack={() => navigation.goBack()} />}>
      <View style={s.searchRow}>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: colors.text }}
            placeholder="Search by name, ID or department"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
          />
          {q ? <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={colors.muted} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={s.add} onPress={() => setForm({})}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}> Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, alignItems: 'center' }}>
          {CHIPS.map(([label, key]) => <Chip key={label} label={label} active={cat === key} onPress={() => setCat(key)} />)}
        </ScrollView>
      </View>

      {error ? (
        <Card style={{ margin: 14 }}>
          <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
        </Card>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.green} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => String(e.id)}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No employees found</Text>}
          renderItem={({ item }) => (
            <Card style={[s.item, !item.is_active && { opacity: 0.6 }]}>
              <Avatar size={46} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{item.name}</Text>
                <Text style={s.meta}>{item.employee_id} | {item.designation || '-'}</Text>
                <Text style={s.meta}>{item.department_name || 'No department'}</Text>
              </View>
              <Badge text={item.is_active ? 'Active' : 'Inactive'} type={item.is_active ? 'green' : 'red'} />
              <TouchableOpacity onPress={() => setMenu(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      {form ? (
        <EmployeeForm
          employee={form.id ? form : null}
          departments={departments}
          shifts={shifts}
          canAssignAdmin={user.role === 'admin'}
          onClose={() => setForm(null)}
          onSaved={onSaved}
        />
      ) : null}
      {menu ? (
        <ActionMenu
          emp={menu}
          onClose={() => setMenu(null)}
          onEdit={() => { const e = menu; setMenu(null); setForm(e); }}
          onReset={() => { const e = menu; setMenu(null); askReset(e); }}
          onToggle={() => { const e = menu; setMenu(null); toggleActive(e); }}
        />
      ) : null}
      {pin ? <PinModal info={pin} onClose={() => setPin(null)} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, height: 44 },
  add: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 14, height: 44, marginLeft: 10 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, backgroundColor: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sheet: { backgroundColor: '#fff', borderRadius: 14, paddingBottom: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  pinCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center' },
  bigText: { fontSize: 26, fontWeight: '800', color: colors.primary, marginTop: 2 },
});