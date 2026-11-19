from django.db import migrations


def create_row(apps, schema_editor):
    """The settings table always has its one row (id = 1), so the admin screen never meets an empty table."""
    apps.get_model("main", "SiteSettings").objects.get_or_create(id=1)


class Migration(migrations.Migration):
    dependencies = [("main", "0002_settings_defaults")]
    operations = [migrations.RunPython(create_row, migrations.RunPython.noop)]
