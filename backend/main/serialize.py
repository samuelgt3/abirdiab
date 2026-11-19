"""Turn database rows into the JSON shape the website expects (same as PostgREST/Supabase gave it)."""
import datetime
import decimal
import uuid


def jsonable(v):
    if isinstance(v, decimal.Decimal):
        return float(v)
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    return v


def row_dict(obj, columns=None) -> dict:
    """Column name -> value. Foreign keys appear as `<name>_id`, exactly like the database column."""
    out = {}
    for f in obj._meta.concrete_fields:
        if columns is None or f.attname in columns:
            out[f.attname] = jsonable(getattr(obj, f.attname))
    return out
