from django.contrib.auth.models import AbstractUser
from django.db import models


class Department(models.Model):
    CATEGORIES = [('doctors', 'Doctors'), ('nursing', 'Nursing'),
                  ('admin', 'Admin'), ('lab', 'Lab'), ('other', 'Other')]
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORIES, default='other')

    def __str__(self):
        return self.name


class Shift(models.Model):
    name = models.CharField(max_length=50)
    start_time = models.TimeField()
    end_time = models.TimeField()

    @property
    def crosses_midnight(self):
        return self.end_time <= self.start_time

    def __str__(self):
        return f'{self.name} ({self.start_time:%H:%M}-{self.end_time:%H:%M})'


class Employee(AbstractUser):
    """username = employee ID, e.g. YH-0123"""
    ROLES = [('admin', 'Super Admin'), ('hr', 'HR'),
             ('head', 'Department Head'), ('staff', 'Staff')]
    role = models.CharField(max_length=10, choices=ROLES, default='staff')
    designation = models.CharField(max_length=100, blank=True)
    department = models.ForeignKey(Department, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='employees')
    shift = models.ForeignKey(Shift, null=True, blank=True, on_delete=models.SET_NULL)
    phone = models.CharField(max_length=20, blank=True)
    face_image = models.ImageField(upload_to='faces/', null=True, blank=True)
    face_embedding = models.JSONField(null=True, blank=True)   # filled by face step
    device_id = models.CharField(max_length=100, blank=True)   # one phone per employee

    must_change_pin = models.BooleanField(default=True)  

    @property
    def employee_id(self):
        return self.username

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.username})'


class Attendance(models.Model):
    STATUS = [('present', 'Present'), ('late', 'Late'),
              ('absent', 'Absent'), ('leave', 'On Leave')]
    SOURCE = [('app', 'App'), ('offline', 'Offline sync'), ('manual', 'Manual (admin)')]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance')
    date = models.DateField()                       # shift start date
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default='present')
    in_lat = models.FloatField(null=True, blank=True)
    in_lng = models.FloatField(null=True, blank=True)
    in_distance_m = models.FloatField(null=True, blank=True)
    face_score = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=10, choices=SOURCE, default='app')
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('employee', 'date')
        ordering = ['-date']

    def __str__(self):
        return f'{self.employee.username} {self.date} {self.status}'


class LeaveRequest(models.Model):
    STATUS = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leaves')
    from_date = models.DateField()
    to_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default='pending')
    decided_by = models.ForeignKey(Employee, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)


class Holiday(models.Model):
    date = models.DateField(unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f'{self.date} {self.name}'


class AuditLog(models.Model):
    actor = models.ForeignKey(Employee, null=True, on_delete=models.SET_NULL, related_name='+')
    action = models.CharField(max_length=100)
    target = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Setting(models.Model):
    """Single row: hospital geofence and rules."""
    hospital_lat = models.FloatField(default=33.99522)
    hospital_lng = models.FloatField(default=72.92849)
    radius_m = models.PositiveIntegerField(default=100)
    late_after_min = models.PositiveIntegerField(default=10)
    max_gps_accuracy_m = models.PositiveIntegerField(default=50)
    min_face_score = models.FloatField(default=0.45)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Hospital settings'