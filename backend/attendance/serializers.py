from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import Employee, Department, Shift, Setting

class EmployeeSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='username', read_only=True)
    name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    category = serializers.CharField(source='department.category', read_only=True, default=None)

    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'name', 'first_name', 'last_name', 'designation',
                  'department', 'department_name', 'category', 'shift', 'role',
                  'phone', 'is_active']

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
    }


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)          # rejects wrong PIN / inactive users
        data['user'] = user_payload(self.user)
        data['must_change_pin'] = self.user.must_change_pin
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