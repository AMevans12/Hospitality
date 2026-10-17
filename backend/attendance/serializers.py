from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import Employee, Department, Shift, Setting
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from math import ceil
 

class EmployeeSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='username', read_only=True)
    name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    category = serializers.CharField(source='department.category', read_only=True, default=None)

    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'name', 'first_name', 'last_name', 'designation',
                  'department', 'department_name', 'category', 'shift', 'role',
                  'phone', 'is_active', 'face_enrolled', 'device_bound', 'device_name']
        
    face_enrolled = serializers.SerializerMethodField()
    device_bound = serializers.SerializerMethodField()
    
    def get_face_enrolled(self, o):
        return bool(o.face_embedding)

    def get_device_bound(self, o):
        return bool(o.device_id)

    def get_name(self, o):
        return o.get_full_name() or o.username

    def validate_role(self, v):
        u = self.context['request'].user
        if v in ('admin', 'hr') and not (u.is_superuser or u.role == 'admin'):
            raise serializers.ValidationError('Only an admin can assign this role')
        return v


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'category']


class ShiftSerializer(serializers.ModelSerializer):
    crosses_midnight = serializers.ReadOnlyField()

    class Meta:
        model = Shift
        fields = ['id', 'name', 'start_time', 'end_time', 'crosses_midnight']


def user_payload(u):
    return {
        'id': u.id,
        'employee_id': u.username,
        'name': u.get_full_name() or u.username,
        'role': 'admin' if u.is_superuser else u.role,
        'designation': u.designation,
        'department': u.department.name if u.department else None,
        'face_enrolled': bool(u.face_embedding),  
        'face_required': bool(getattr(Setting.objects.first(), 'face_required', False)),      
    }

MAX_ATTEMPTS = 5
LOCK_MINUTES = 10


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        emp = Employee.objects.filter(username=attrs.get(self.username_field)).first()

        # locked after too many wrong PINs
        if emp and emp.locked_until and emp.locked_until > timezone.now():
            mins = ceil((emp.locked_until - timezone.now()).total_seconds() / 60)
            raise PermissionDenied(f'Too many wrong attempts. Try again in {mins} minute(s).')

        try:
            data = super().validate(attrs)          # rejects wrong PIN / inactive users
        except AuthenticationFailed:
            if emp:
                emp.failed_logins += 1
                if emp.failed_logins >= MAX_ATTEMPTS:
                    emp.locked_until = timezone.now() + timedelta(minutes=LOCK_MINUTES)
                    emp.failed_logins = 0
                emp.save(update_fields=['failed_logins', 'locked_until'])
            raise

        u = self.user
        if u.failed_logins or u.locked_until:
            u.failed_logins = 0
            u.locked_until = None
            u.save(update_fields=['failed_logins', 'locked_until'])

        request = self.context.get('request')
        dev = str(request.data.get('device_id', '')).strip()[:100] if request else ''
        name = str(request.data.get('device_name', '')).strip()[:100] if request else ''

        # one phone per staff member (admin / HR are exempt)
        if Setting.get().device_binding and u.role in ('staff', 'head') and not u.is_superuser:
            if not dev:
                raise PermissionDenied('Could not identify this phone. Please update the app.')
            if not u.device_id:
                u.device_id = dev
                u.device_name = name
                u.device_bound_at = timezone.now()
                u.save(update_fields=['device_id', 'device_name', 'device_bound_at'])
            elif u.device_id != dev:
                raise PermissionDenied('This account is linked to another phone. Please contact HR to reset it.')

        data['user'] = user_payload(u)
        data['must_change_pin'] = u.must_change_pin
        return data
    
class SettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setting
        exclude = ['id']

    def validate_hospital_lat(self, v):
        if not -90 <= v <= 90:
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return v

    def validate_hospital_lng(self, v):
        if not -180 <= v <= 180:
            raise serializers.ValidationError('Longitude must be between -180 and 180')
        return v

    def validate_radius_m(self, v):
        if not 20 <= v <= 1000:
            raise serializers.ValidationError('Radius must be between 20 and 1000 metres')
        return v

    def validate_late_after_min(self, v):
        if not 0 <= v <= 180:
            raise serializers.ValidationError('Late grace must be between 0 and 180 minutes')
        return v