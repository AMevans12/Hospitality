from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (Department, Shift, Employee, Attendance, LeaveRequest,
                     Holiday, Setting, AuditLog)


def rows(r):
    return r.data if isinstance(r.data, list) else r.data['results']


class Base(TestCase):
    def setUp(self):
        self.cardio = Department.objects.create(name='Cardiology', category='doctors')
        self.lab = Department.objects.create(name='Lab', category='lab')
        self.shift = Shift.objects.create(name='Morning', start_time='08:00', end_time='16:00')
        self.admin = Employee.objects.create_superuser('YH-0001', password='admin1',
                                                       role='admin', must_change_pin=False)
        self.hr = self.mk('YH-0002', role='hr')
        self.staff = self.mk('YH-0003')
        self.today = timezone.localdate()

    def mk(self, username, dept=None, pin='1234', **kw):
        kw.setdefault('must_change_pin', False)
        return Employee.objects.create_user(username, password=pin, department=dept, **kw)

    def login_as(self, user, pin):
        c = APIClient()
        r = c.post('/api/auth/login/', {'username': user.username, 'password': pin}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        c.credentials(HTTP_AUTHORIZATION='Bearer ' + r.data['access'])
        return c

    @property
    def admin_c(self):
        return self.login_as(self.admin, 'admin1')

    @property
    def hr_c(self):
        return self.login_as(self.hr, '1234')

    @property
    def staff_c(self):
        return self.login_as(self.staff, '1234')

# ---------------------------------------------------------------- AUTH
class AuthTests(Base):
    def test_login_ok_returns_tokens_and_user(self):
        r = APIClient().post('/api/auth/login/', {'username': 'YH-0001', 'password': 'admin1'}, format='json')
        self.assertEqual(r.status_code, 200)
        for k in ('access', 'refresh', 'user', 'must_change_pin'):
            self.assertIn(k, r.data)
        self.assertEqual(r.data['user']['employee_id'], 'YH-0001')

    def test_wrong_pin_rejected(self):
        r = APIClient().post('/api/auth/login/', {'username': 'YH-0003', 'password': '9999'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_unknown_id_rejected(self):
        r = APIClient().post('/api/auth/login/', {'username': 'YH-9999', 'password': '1234'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_inactive_cannot_login(self):
        Employee.objects.filter(pk=self.staff.pk).update(is_active=False)
        r = APIClient().post('/api/auth/login/', {'username': 'YH-0003', 'password': '1234'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_no_token_blocked_everywhere(self):
        c = APIClient()
        for url in ('/api/me/', '/api/employees/', '/api/dashboard/', '/api/reports/attendance/',
                    '/api/settings/', '/api/shifts/', '/api/departments/'):
            self.assertEqual(c.get(url).status_code, 401, url)

    def test_garbage_token_blocked(self):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION='Bearer abc.def.ghi')
        self.assertEqual(c.get('/api/me/').status_code, 401)

    def test_me_returns_current_user(self):
        r = self.staff_c.get('/api/me/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['employee_id'], 'YH-0003')

    def test_refresh_gives_new_access(self):
        r = APIClient().post('/api/auth/login/', {'username': 'YH-0003', 'password': '1234'}, format='json')
        r2 = APIClient().post('/api/auth/refresh/', {'refresh': r.data['refresh']}, format='json')
        self.assertEqual(r2.status_code, 200)
        self.assertIn('access', r2.data)

    def test_change_pin_rules(self):
        c = self.staff_c
        post = lambda o, n: c.post('/api/auth/change-pin/', {'old_pin': o, 'new_pin': n}, format='json')
        self.assertEqual(post('0000', '5678').status_code, 400)   # wrong current
        self.assertEqual(post('1234', '12').status_code, 400)     # too short
        self.assertEqual(post('1234', '1234').status_code, 400)   # same
        self.assertEqual(post('1234', '5678').status_code, 200)
        # old PIN dead, new PIN works, flag cleared
        self.assertEqual(APIClient().post('/api/auth/login/', {'username': 'YH-0003', 'password': '1234'},
                                          format='json').status_code, 401)
        r = APIClient().post('/api/auth/login/', {'username': 'YH-0003', 'password': '5678'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['must_change_pin'])


# ---------------------------------------------------------------- PERMISSIONS
class PermissionTests(Base):
    def test_staff_blocked_from_admin_endpoints(self):
        c = self.staff_c
        for url in ('/api/employees/', '/api/dashboard/', '/api/reports/attendance/', '/api/settings/'):
            self.assertEqual(c.get(url).status_code, 403, url)
        self.assertEqual(c.post('/api/shifts/', {'name': 'X', 'start_time': '08:00', 'end_time': '16:00'},
                                format='json').status_code, 403)
        self.assertEqual(c.patch('/api/settings/', {'radius_m': 50}, format='json').status_code, 403)

    def test_hr_allowed(self):
        c = self.hr_c
        for url in ('/api/employees/', '/api/dashboard/', '/api/reports/attendance/', '/api/settings/'):
            self.assertEqual(c.get(url).status_code, 200, url)

    def test_superuser_hidden_from_api(self):
        c = self.admin_c
        self.assertNotIn('YH-0001', [e['employee_id'] for e in rows(c.get('/api/employees/'))])
        self.assertEqual(c.get(f'/api/employees/{self.admin.id}/').status_code, 404)
        self.assertEqual(c.post(f'/api/employees/{self.admin.id}/reset-pin/').status_code, 404)


# ---------------------------------------------------------------- EMPLOYEES
class EmployeeTests(Base):
    def create(self, c, **kw):
        body = dict(first_name='Ali', last_name='Raza', designation='Nurse',
                    department=self.cardio.id, shift=self.shift.id, role='staff', phone='0300')
        body.update(kw)
        return c.post('/api/employees/', body, format='json')

    def test_create_generates_id_and_temp_pin(self):
        r = self.create(self.hr_c)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.data['employee_id'].startswith('YH-'))
        self.assertTrue(str(r.data['temp_pin']).isdigit() and len(str(r.data['temp_pin'])) == 6)
        login = APIClient().post('/api/auth/login/', {'username': r.data['employee_id'],
                                                      'password': str(r.data['temp_pin'])}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.data['must_change_pin'])          # forced change at first login

    def test_ids_are_unique_and_increasing(self):
        c = self.hr_c
        a = self.create(c).data['employee_id']
        b = self.create(c, first_name='Sara').data['employee_id']
        self.assertNotEqual(a, b)
        self.assertLess(int(a[3:]), int(b[3:]))

    def test_temp_pin_not_stored_in_list(self):
        self.create(self.hr_c)
        self.assertNotIn('temp_pin', rows(self.hr_c.get('/api/employees/'))[0])

    def test_hr_cannot_make_admin_or_hr_but_admin_can(self):
        self.assertEqual(self.create(self.hr_c, role='admin').status_code, 400)
        self.assertEqual(self.create(self.hr_c, role='hr').status_code, 400)
        self.assertEqual(self.create(self.admin_c, role='hr').status_code, 201)

    def test_search_and_filters(self):
        self.mk('YH-0100', self.cardio, first_name='Ahmad', last_name='Khan')
        self.mk('YH-0101', self.lab, first_name='Sara', last_name='Malik')
        c = self.hr_c
        names = lambda q: [e['employee_id'] for e in rows(c.get('/api/employees/' + q))]
        self.assertEqual(names('?search=ahmad'), ['YH-0100'])
        self.assertEqual(names('?search=YH-0101'), ['YH-0101'])
        self.assertEqual(names('?search=cardio'), ['YH-0100'])
        self.assertEqual(names('?category=lab'), ['YH-0101'])
        self.assertEqual(names(f'?department={self.cardio.id}'), ['YH-0100'])
        self.assertEqual(names('?search=zzzz'), [])

    def test_update(self):
        e = self.mk('YH-0100', self.cardio)
        r = self.hr_c.patch(f'/api/employees/{e.id}/', {'designation': 'Consultant'}, format='json')
        self.assertEqual(r.status_code, 200)
        e.refresh_from_db()
        self.assertEqual(e.designation, 'Consultant')

    def test_delete_only_deactivates_and_keeps_history(self):
        e = self.mk('YH-0100', self.cardio)
        Attendance.objects.create(employee=e, date=self.today, status='present')
        self.assertEqual(self.hr_c.delete(f'/api/employees/{e.id}/').status_code, 204)
        e.refresh_from_db()
        self.assertFalse(e.is_active)
        self.assertEqual(Attendance.objects.filter(employee=e).count(), 1)
        self.assertEqual(APIClient().post('/api/auth/login/', {'username': 'YH-0100', 'password': '1234'},
                                          format='json').status_code, 401)

    def test_reset_pin(self):
        e = self.mk('YH-0100', self.cardio)
        r = self.hr_c.post(f'/api/employees/{e.id}/reset-pin/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(APIClient().post('/api/auth/login/', {'username': 'YH-0100', 'password': '1234'},
                                          format='json').status_code, 401)
        l = APIClient().post('/api/auth/login/', {'username': 'YH-0100', 'password': str(r.data['temp_pin'])},
                             format='json')
        self.assertEqual(l.status_code, 200)
        self.assertTrue(l.data['must_change_pin'])

    def test_audit_log_written(self):
        self.create(self.hr_c)
        self.assertTrue(AuditLog.objects.exists())


# ---------------------------------------------------------------- DASHBOARD
class DashboardTests(Base):
    def test_counts(self):
        a, b, c_, d = [self.mk(f'YH-010{i}', self.cardio) for i in range(4)]
        gone = self.mk('YH-0109', self.cardio, is_active=False)
        Attendance.objects.create(employee=a, date=self.today, status='present')
        Attendance.objects.create(employee=b, date=self.today, status='late')
        LeaveRequest.objects.create(employee=c_, from_date=self.today, to_date=self.today, status='approved')
        LeaveRequest.objects.create(employee=d, from_date=self.today, to_date=self.today, status='pending')
        r = self.hr_c.get(f'/api/dashboard/?department={self.cardio.id}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.data['total'], r.data['present'], r.data['late'], r.data['leave'], r.data['absent']),
                         (4, 1, 1, 1, 1))                       # inactive excluded, pending leave ignored

    def test_other_department_not_mixed(self):
        self.mk('YH-0100', self.lab)
        self.assertEqual(self.hr_c.get(f'/api/dashboard/?department={self.cardio.id}').data['total'], 0)

    def test_specific_date(self):
        a = self.mk('YH-0100', self.cardio)
        y = self.today - timedelta(days=1)
        Attendance.objects.create(employee=a, date=y, status='present')
        r = self.hr_c.get(f'/api/dashboard/?department={self.cardio.id}&date={y}')
        self.assertEqual(r.data['present'], 1)


# ---------------------------------------------------------------- REPORT
class ReportTests(Base):
    def d(self, n):
        return self.today - timedelta(days=n)

    def setUp(self):
        super().setUp()
        self.a = self.mk('YH-0100', self.cardio, first_name='A')
        self.b = self.mk('YH-0101', self.cardio, first_name='B')
        self.c = self.mk('YH-0102', self.cardio, first_name='C')     # joins today
        old = timezone.now() - timedelta(days=30)
        Employee.objects.filter(pk__in=[self.a.pk, self.b.pk]).update(date_joined=old)
        Holiday.objects.create(date=self.d(1), name='Test holiday')
        for n in (6, 5, 4):
            Attendance.objects.create(employee=self.a, date=self.d(n), status='present')
        Attendance.objects.create(employee=self.a, date=self.d(3), status='late')
        LeaveRequest.objects.create(employee=self.a, from_date=self.d(2), to_date=self.d(2), status='approved')
        Attendance.objects.create(employee=self.b, date=self.d(6), status='present')

    def get(self, extra=''):
        return self.hr_c.get(f'/api/reports/attendance/?from={self.d(6)}&to={self.d(1)}'
                             f'&department={self.cardio.id}{extra}')

    def row(self, r, eid):
        return next(x for x in r.data['rows'] if x['employee_id'] == eid)

    def test_numbers_and_percentage(self):
        r = self.get()
        self.assertEqual(r.status_code, 200)
        a, b = self.row(r, 'YH-0100'), self.row(r, 'YH-0101')
        # 6 days - 1 holiday = 5 scheduled. A: 3 present, 1 late, 1 leave -> 0 absent, 4/(5-1)=100%
        self.assertEqual((a['present'], a['late'], a['leave'], a['absent'], a['percent']), (3, 1, 1, 0, 100))
        # B: 1 present, 4 absent -> 1/5 = 20%
        self.assertEqual((b['present'], b['absent'], b['percent']), (1, 4, 20))

    def test_counted_from_join_date(self):
        c = self.row(self.get(), 'YH-0102')
        self.assertEqual((c['absent'], c['percent']), (0, 0))

    def test_totals_match_rows(self):
        r = self.get()
        for k in ('present', 'absent', 'late', 'leave'):
            self.assertEqual(r.data['totals'][k], sum(x[k] for x in r.data['rows']), k)

    def test_department_summary_present(self):
        self.assertEqual(self.get().data['departments'][0]['employees'], 3)

    def test_future_days_not_counted(self):
        r = self.hr_c.get(f'/api/reports/attendance/?from={self.d(6)}&to={self.today + timedelta(days=10)}'
                          f'&department={self.cardio.id}')
        self.assertEqual(str(r.data['to']), str(self.today))

    def test_reversed_range_is_empty(self):
        r = self.hr_c.get(f'/api/reports/attendance/?from={self.d(1)}&to={self.d(6)}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rows'], [])

    def test_category_and_department_filters(self):
        self.mk('YH-0200', self.lab)
        r = self.hr_c.get(f'/api/reports/attendance/?from={self.d(6)}&to={self.d(1)}&category=lab')
        self.assertEqual([x['employee_id'] for x in r.data['rows']], ['YH-0200'])

    def test_exports(self):
        for fmt, magic in (('excel', b'PK'), ('pdf', b'%PDF')):
            r = self.hr_c.get(f'/api/reports/attendance/export/{fmt}/?from={self.d(6)}&to={self.d(1)}')
            self.assertEqual(r.status_code, 200, fmt)
            body = b''.join(r.streaming_content) if r.streaming else r.content
            self.assertTrue(body.startswith(magic), fmt)


# ---------------------------------------------------------------- SETTINGS + SHIFTS
class SettingsTests(Base):
    def test_defaults(self):
        r = self.hr_c.get('/api/settings/')
        self.assertEqual(float(r.data['hospital_lat']), 33.99522)
        self.assertEqual(float(r.data['hospital_lng']), 72.92849)
        self.assertEqual(r.data['radius_m'], 100)

    def test_singleton(self):
        self.assertEqual(Setting.get().pk, Setting.get().pk)
        self.assertEqual(Setting.objects.count(), 1)

    def test_valid_update_persists(self):
        c = self.hr_c
        self.assertEqual(c.patch('/api/settings/', {'radius_m': 120, 'late_after_min': 15}, format='json').status_code, 200)
        r = c.get('/api/settings/')
        self.assertEqual((r.data['radius_m'], r.data['late_after_min']), (120, 15))

    def test_invalid_values_rejected(self):
        c = self.hr_c
        bad = [{'radius_m': 5}, {'radius_m': 5000}, {'hospital_lat': 100}, {'hospital_lat': -91},
               {'hospital_lng': 181}, {'late_after_min': 200}, {'late_after_min': -1}]
        for body in bad:
            self.assertEqual(c.patch('/api/settings/', body, format='json').status_code, 400, body)
        self.assertEqual(c.get('/api/settings/').data['radius_m'], 100)   # nothing changed


class ShiftTests(Base):
    def test_night_shift_crosses_midnight(self):
        r = self.hr_c.post('/api/shifts/', {'name': 'Night', 'start_time': '20:00', 'end_time': '08:00'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.data['crosses_midnight'])

    def test_day_shift_does_not(self):
        self.assertFalse(next(s for s in rows(self.hr_c.get('/api/shifts/')))['crosses_midnight'])

    def test_edit_and_delete_leave_employees_intact(self):
        e = self.mk('YH-0100', self.cardio, shift=self.shift)
        c = self.hr_c
        self.assertEqual(c.patch(f'/api/shifts/{self.shift.id}/', {'name': 'Day'}, format='json').status_code, 200)
        self.assertEqual(c.delete(f'/api/shifts/{self.shift.id}/').status_code, 204)
        e.refresh_from_db()
        self.assertIsNone(e.shift)
        self.assertTrue(e.is_active)

    def test_missing_name_rejected(self):
        r = self.hr_c.post('/api/shifts/', {'start_time': '08:00', 'end_time': '16:00'}, format='json')
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------- DATA RULES
class ModelTests(Base):
    def test_one_attendance_per_day(self):
        Attendance.objects.create(employee=self.staff, date=self.today, status='present')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Attendance.objects.create(employee=self.staff, date=self.today, status='late')

    def test_employee_id_property(self):
        self.assertEqual(self.staff.employee_id, 'YH-0003')