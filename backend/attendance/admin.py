from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (Department, Shift, Employee, Attendance,
                     LeaveRequest, Holiday, AuditLog, Setting)


@admin.register(Employee)
class EmployeeAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'designation',
                    'department', 'role', 'is_active')
    list_filter = ('department', 'department__category', 'role', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'designation')
    fieldsets = UserAdmin.fieldsets + (
        ('Hospital', {'fields': ('role', 'designation', 'department', 'shift',
                                 'phone', 'face_image', 'device_id')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Hospital', {'fields': ('first_name', 'last_name', 'role', 'designation',
                                 'department', 'shift')}),
    )


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'check_in', 'check_out', 'status',
                    'in_distance_m', 'face_score', 'source')
    list_filter = ('status', 'source', 'date', 'employee__department')
    search_fields = ('employee__username', 'employee__first_name')
    date_hierarchy = 'date'


@admin.register(LeaveRequest)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ('employee', 'from_date', 'to_date', 'status')
    list_filter = ('status',)


@admin.register(AuditLog)
class AuditAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor', 'action', 'target')
    readonly_fields = ('actor', 'action', 'target', 'details', 'created_at')


admin.site.register([Department, Shift, Holiday, Setting])