from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import LoginSerializer
from . import views
from .attendance_views import TodayView, CheckInView, CheckOutView, HistoryView, FaceEnrollView, FaceResetView

urlpatterns = [
    path('auth/login/', TokenObtainPairView.as_view(serializer_class=LoginSerializer)),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/change-pin/', views.ChangePinView.as_view()),
    path('me/', views.MeView.as_view()),
    path('employees/', views.EmployeeList.as_view()),
    path('employees/<int:pk>/', views.EmployeeDetail.as_view()),
    path('employees/<int:pk>/reset-pin/', views.ResetPin.as_view()),
    path('departments/', views.DepartmentList.as_view()),
    path('shifts/', views.ShiftList.as_view()),
    path('shifts/<int:pk>/', views.ShiftDetail.as_view()),
    path('dashboard/', views.DashboardView.as_view()),
    path('reports/attendance/', views.AttendanceReportView.as_view()),
    path('settings/', views.SettingsView.as_view()),
    path('reports/attendance/export/<str:fmt>/', views.ReportExport.as_view()),
    path('attendance/today/', TodayView.as_view()),
    path('attendance/check-in/', CheckInView.as_view()),
    path('attendance/check-out/', CheckOutView.as_view()),
    path('attendance/history/', HistoryView.as_view()),
    path('face/enroll/', FaceEnrollView.as_view()),
    path('employees/<int:pk>/face/reset/', FaceResetView.as_view()),
]