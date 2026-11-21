from django.db import migrations, models


def switch_on(apps, schema_editor):
    apps.get_model("main", "SiteSettings").objects.update(emails_enabled=True)


class Migration(migrations.Migration):
    dependencies = [("main", "0004_payments_and_links")]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="emails_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(switch_on, migrations.RunPython.noop),
    ]
