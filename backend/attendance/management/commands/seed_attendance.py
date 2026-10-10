import random
from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import Employee, Attendance


class Command(BaseCommand):
    help = 'TESTING ONLY: create fake attendance for the last N days'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30)
        parser.add_argument('--clear', action='store_true', help='delete ALL attendance first')

    def handle(self, *args, **o):
        if o['clear']:
            Attendance.objects.all().delete()
        today, tz, rows = timezone.localdate(), timezone.get_current_timezone(), []
        for emp in Employee.objects.filter(is_active=True, is_superuser=False):
            for i in range(o['days']):
                d = today - timedelta(days=i)
                if Attendance.objects.filter(employee=emp, date=d).exists():
                    continue
                r = random.random()
                if r < 0.08:
                    continue                                   # absent = no record
                late = r < 0.20
                cin = datetime.combine(d, time(8, 0), tz) + timedelta(
                    minutes=random.randint(11, 45) if late else random.randint(-15, 8))
                cout = None if d == today else cin + timedelta(hours=8, minutes=random.randint(0, 20))
                rows.append(Attendance(employee=emp, date=d, check_in=cin, check_out=cout,
                                       status='late' if late else 'present',
                                       in_distance_m=random.uniform(5, 80),
                                       face_score=random.uniform(0.6, 0.9), source='app'))
        Attendance.objects.bulk_create(rows)
        self.stdout.write(f'Created {len(rows)} attendance records')