"""Who may open which material."""
from django.core.exceptions import ValidationError

from .models import Course, CourseAccess, CourseFile
from .permissions import is_admin_user


def owns_course(user, course_id) -> bool:
    return bool(user and CourseAccess.objects.filter(user=user, course_id=course_id).exists())


def course_unlocked(user, course_id) -> bool:
    """Free + published, or bought / gifted / claimed by this member, or an admin previewing."""
    try:
        course = Course.objects.filter(pk=course_id).first()
    except (ValidationError, ValueError, TypeError):
        return False
    if course is None:
        return False
    if course.is_free and course.published:
        return True
    return owns_course(user, course.pk) or is_admin_user(user)


def can_read_course_file(user, name: str) -> bool:
    ids = CourseFile.objects.filter(file_path=name).values_list("course_id", flat=True)
    return any(course_unlocked(user, cid) for cid in ids)
