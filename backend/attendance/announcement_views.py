from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Announcement, AnnouncementRead
from .views import audit


def can_post(user):
    return user.is_superuser or user.role in ('admin', 'hr')


def ann_json(a, read):
    by = a.created_by
    return {
        'id': a.id,
        'title': a.title,
        'body': a.body,
        'created_at': timezone.localtime(a.created_at).isoformat(),
        'author': (by.get_full_name() or by.username) if by else '',
        'read': read,
    }


def unread_count(user):
    seen = AnnouncementRead.objects.filter(employee=user).values('announcement_id')
    return Announcement.objects.exclude(id__in=seen).count()


class AnnouncementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seen = set(AnnouncementRead.objects.filter(employee=request.user)
                   .values_list('announcement_id', flat=True))
        rows = [ann_json(a, a.id in seen)
                for a in Announcement.objects.select_related('created_by')[:100]]
        return Response({'unread': unread_count(request.user), 'items': rows})

    def post(self, request):
        if not can_post(request.user):
            return Response({'detail': 'Only HR or admin can post announcements.'}, status=403)
        title = str(request.data.get('title', '')).strip()
        body = str(request.data.get('body', '')).strip()
        if not title or not body:
            return Response({'detail': 'Enter a title and a message.'}, status=400)
        if len(title) > 120 or len(body) > 2000:
            return Response({'detail': 'Title or message is too long.'}, status=400)
        a = Announcement.objects.create(title=title, body=body, created_by=request.user)
        AnnouncementRead.objects.create(announcement=a, employee=request.user)
        audit(request, 'announcement_post', a.title)
        return Response(ann_json(a, True), status=201)


class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not can_post(request.user):
            return Response({'detail': 'Only HR or admin can delete announcements.'}, status=403)
        a = get_object_or_404(Announcement, pk=pk)
        title = a.title
        a.delete()
        audit(request, 'announcement_delete', title)
        return Response(status=204)


class AnnouncementReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        a = get_object_or_404(Announcement, pk=pk)
        AnnouncementRead.objects.get_or_create(announcement=a, employee=request.user)
        return Response({'unread': unread_count(request.user)})


class AnnouncementUnreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'unread': unread_count(request.user)})