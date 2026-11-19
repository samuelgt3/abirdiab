"""
One endpoint that lets the website (and the admin screen) read and change tables, under strict rules.

  POST /api/db/<table>   {op, select, count, head, filters, order, limit, mode, values, onConflict, ignoreDuplicates, returning}

The rules below replace the "row level security" of the previous backend:
  * visitors: read PUBLISHED content only; add themselves to the newsletter
  * admins (confirmed email on the allow-list): read/write what the admin screen needs
  * everything else (orders of customers, payments, notes, private links...) is admin-only
Nothing else is reachable, whatever the browser asks for.
"""
from dataclasses import dataclass, field

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from . import models as m
from .permissions import ApiError, api, is_admin_user, json_body
from .security import client_ip, rate_limited
from .serialize import jsonable, row_dict

MAX_ROWS = 2000


@dataclass
class Table:
    model: type
    read: str = "admin"                 # "admin" | "public_published"
    admin_ops: tuple = ("select", "insert", "update", "delete", "upsert")
    public_insert: tuple = ()           # columns a visitor may set when adding a row
    update_columns: tuple = None        # None = any column; otherwise only these
    redact_audit: bool = False          # keep secret values out of the audit trail


CONTENT = ("select", "insert", "update", "delete", "upsert")

TABLES = {
    "courses": Table(m.Course, read="public_published"),
    "workshops": Table(m.Workshop, read="public_published"),
    "journal_posts": Table(m.JournalPost, read="public_published"),
    "meditation_samples": Table(m.MeditationSample, read="public_published"),
    "testimonials": Table(m.Testimonial, read="public_published"),
    "newsletter_subscribers": Table(m.NewsletterSubscriber, public_insert=("email", "lang")),
    "testimonial_submissions": Table(m.TestimonialSubmission),
    "availability_slots": Table(m.AvailabilitySlot),
    "site_settings": Table(m.SiteSettings, admin_ops=("select", "update")),
    "orders": Table(m.Order, admin_ops=("select", "update"),
                    update_columns=("status", "join_url", "notes", "join_sent_at", "thanks_sent_at", "updated_at")),
    "order_admin_notes": Table(m.OrderAdminNote, admin_ops=("select", "upsert", "update", "delete")),
    "workshop_links": Table(m.WorkshopLink, redact_audit=True),
    "course_files": Table(m.CourseFile, redact_audit=True),
    "admin_audit": Table(m.AdminAudit, admin_ops=("select",)),
    "payment_events": Table(m.PaymentEvent, admin_ops=("select",)),
    "gifts": Table(m.Gift, admin_ops=("select",)),
}

FILTER_OPS = {"eq": "", "neq": "", "gt": "__gt", "gte": "__gte", "lt": "__lt", "lte": "__lte", "in": "__in"}


# ----------------------------------------------------------------------------- helpers

def _columns(model):
    by = {}
    for f in model._meta.concrete_fields:
        by[f.name] = f
        by[f.attname] = f
    return by


def _coerce(field, value):
    if value is None:
        if field.null:
            return None
        if field.has_default():
            return field.get_default()
        raise ApiError(f"null value in column {field.attname}", 400, "23502")
    try:
        return field.to_python(value)
    except (ValidationError, ValueError, TypeError):
        raise ApiError(f"invalid value for column {field.attname}", 400, "22P02")


def _col(by, name):
    f = by.get(name)
    if f is None:
        raise ApiError(f"unknown column {name}", 400, "42703")
    return f


def _filters(by, items):
    q = {}
    excl = []
    for item in items or []:
        if not (isinstance(item, (list, tuple)) and len(item) == 3 and item[0] in FILTER_OPS):
            raise ApiError("invalid filter")
        op, name, val = item
        f = _col(by, name)
        val = [_coerce(f, v) for v in val] if op == "in" else _coerce(f, val)
        if op == "neq":
            excl.append({f.attname: val})
        else:
            q[f.attname + FILTER_OPS[op]] = val
    return q, excl


def _queryset(spec, by, body, force_published=False):
    qs = spec.model.objects.all()
    q, excl = _filters(by, body.get("filters"))
    qs = qs.filter(**q)
    for e in excl:
        qs = qs.exclude(**e)
    if force_published:
        qs = qs.filter(published=True)  # applied last so a visitor's own filter can never widen it
    return qs


def _db_code(exc):
    cause = getattr(exc, "__cause__", None)
    return getattr(cause, "sqlstate", None) or "23000"


def _audit(user, table, op, row_id, summary, changes):
    m.AdminAudit.objects.create(
        actor=user.id, actor_email=user.email, table_name=table, op=op, row_id=str(row_id)[:100],
        summary=str(summary)[:300], changes=changes,
    )


def _title(obj):
    for k in ("title", "name", "email", "ref"):
        v = getattr(obj, k, None)
        if v:
            return str(v)[:120]
    return str(obj.pk)


def _clean_values(spec, by, row, writing_as_admin, allowed=None):
    if not isinstance(row, dict):
        raise ApiError("invalid values")
    out = {}
    for name, v in row.items():
        f = _col(by, name)
        if allowed is not None and f.attname not in allowed:
            raise ApiError(f"column {name} not allowed", 403, "42501")
        out[f.attname] = _coerce(f, v)
    return out


# ----------------------------------------------------------------------------- the endpoint

@api()
def db(request, table):
    spec = TABLES.get(table)
    if spec is None:
        raise ApiError("unknown table", 404)
    body = json_body(request)
    op = body.get("op", "select")
    user = request.api_user
    admin = is_admin_user(user)
    by = _columns(spec.model)

    if op == "select":
        public_ok = spec.read == "public_published"
        if not (admin and "select" in spec.admin_ops) and not public_ok:
            raise ApiError("permission denied", 403, "42501")
        return _select(spec, by, body, force_published=public_ok and not admin)

    if op == "insert" and not admin and spec.public_insert:
        return _public_insert(request, spec, by, body)

    if not admin or op not in spec.admin_ops:
        raise ApiError("permission denied", 403, "42501")
    try:
        with transaction.atomic():
            if op == "insert":
                return _insert(user, table, spec, by, body)
            if op == "update":
                return _update(user, table, spec, by, body)
            if op == "delete":
                return _delete(user, table, spec, by, body)
            if op == "upsert":
                return _upsert(user, table, spec, by, body)
    except IntegrityError as e:
        code = _db_code(e)
        msg = "duplicate key value violates unique constraint" if code == "23505" else "could not save: it conflicts with other data"
        raise ApiError(msg, 409, code)
    raise ApiError("unknown operation")


def _shape(rows, mode):
    if mode == "single":
        if len(rows) != 1:
            raise ApiError("JSON object requested, multiple (or no) rows returned", 406, "PGRST116")
        return rows[0]
    if mode == "maybe":
        if len(rows) > 1:
            raise ApiError("JSON object requested, multiple rows returned", 406, "PGRST116")
        return rows[0] if rows else None
    return rows


def _select(spec, by, body, force_published=False):
    qs = _queryset(spec, by, body, force_published)
    out = {}
    if body.get("count") == "exact":
        out["count"] = qs.count()
    if body.get("head"):
        out["data"] = None
        return out
    for name, asc in body.get("order") or []:
        f = _col(by, name)
        qs = qs.order_by(("" if asc else "-") + f.attname)
    limit = min(int(body.get("limit") or MAX_ROWS), MAX_ROWS)
    sel = (body.get("select") or "*").replace(" ", "")
    cols = None if sel == "*" else {_col(by, c).attname for c in sel.split(",") if c}
    rows = [row_dict(o, cols) for o in qs[:limit]]
    out["data"] = _shape(rows, body.get("mode"))
    return out


def _public_insert(request, spec, by, body):
    if rate_limited("public_insert", client_ip(request), 20, 3600):
        raise ApiError("rate_limited", 429)
    rows = body.get("values")
    rows = rows if isinstance(rows, list) else [rows]
    if len(rows) != 1:
        raise ApiError("invalid values")
    vals = _clean_values(spec, by, rows[0], False, allowed=set(spec.public_insert))
    if "email" in vals:
        vals["email"] = str(vals["email"]).strip().lower()
    try:
        with transaction.atomic():
            spec.model.objects.create(**vals)
    except IntegrityError as e:
        raise ApiError("duplicate key value violates unique constraint", 409, _db_code(e))
    except ValidationError:
        raise ApiError("invalid values")
    return {"data": None}  # visitors can add a row but never read it back


def _returning(objs, body):
    sel = body.get("returning")
    if not sel:
        return {"data": None}
    cols = None if sel == "*" else {c for c in sel.replace(" ", "").split(",")}
    rows = [row_dict(o, cols) for o in objs]
    return {"data": _shape(rows, body.get("mode"))}


def _insert(user, table, spec, by, body):
    rows = body.get("values")
    rows = rows if isinstance(rows, list) else [rows]
    created = []
    for r in rows:
        vals = _clean_values(spec, by, r, True)
        obj = spec.model.objects.create(**vals)
        created.append(obj)
        _audit(user, table, "insert", obj.pk, f"Added {_title(obj)}", {})
    return _returning(created, body)


def _update(user, table, spec, by, body):
    if not body.get("filters"):
        raise ApiError("update needs a filter")
    vals = _clean_values(spec, by, body.get("values") or {}, True, allowed=spec.update_columns)
    objs = list(_queryset(spec, by, body)[:MAX_ROWS])
    for obj in objs:
        changes = {}
        for k, v in vals.items():
            old = getattr(obj, k)
            if old != v:
                changes[k] = "(hidden)" if spec.redact_audit else {"from": jsonable(old), "to": jsonable(v)}
                setattr(obj, k, v)
        if changes:
            obj.save()
            _audit(user, table, "update", obj.pk, f"Changed {_title(obj)}", changes)
    return _returning(objs, body)


def _delete(user, table, spec, by, body):
    if not body.get("filters"):
        raise ApiError("delete needs a filter")
    objs = list(_queryset(spec, by, body)[:MAX_ROWS])
    for obj in objs:
        _audit(user, table, "delete", obj.pk, f"Deleted {_title(obj)}", {})
        obj.delete()
    return _returning(objs, body)


def _upsert(user, table, spec, by, body):
    rows = body.get("values")
    rows = rows if isinstance(rows, list) else [rows]
    conflict = [c for c in str(body.get("onConflict") or "").replace(" ", "").split(",") if c]
    keys = [_col(by, c).attname for c in conflict] or [spec.model._meta.pk.attname]
    ignore = bool(body.get("ignoreDuplicates"))
    out = []
    for r in rows:
        vals = _clean_values(spec, by, r, True)
        lookup = {k: vals[k] for k in keys if k in vals}
        if len(lookup) != len(keys):
            raise ApiError("upsert row is missing its key")
        existing = spec.model.objects.filter(**lookup).first()
        if existing is None:
            obj = spec.model.objects.create(**vals)
            _audit(user, table, "insert", obj.pk, f"Added {_title(obj)}", {})
        elif ignore:
            continue
        else:
            changes = {}
            for k, v in vals.items():
                old = getattr(existing, k)
                if old != v:
                    changes[k] = "(hidden)" if spec.redact_audit else {"from": jsonable(old), "to": jsonable(v)}
                    setattr(existing, k, v)
            if changes:
                existing.save()
                _audit(user, table, "update", existing.pk, f"Changed {_title(existing)}", changes)
            obj = existing
        out.append(obj)
    return _returning(out, body)
