# Abir Diab backend (Django + PostgreSQL)

## First-time setup on your computer (step by step)

1. Install **Python 3.12 or newer** and **PostgreSQL** (postgresql.org/download). Remember the password you choose for the `postgres` user.
2. Create an empty database called `abirdiab`. In **SQL Shell (psql)** type: `CREATE DATABASE abirdiab;`
3. Open a terminal in this `backend` folder and run:
   ```
   python -m venv venv
   venv\Scripts\activate          (Windows)      or      source venv/bin/activate   (Mac/Linux)
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to a new file named `.env`. Fill in `SECRET_KEY` (make one with
   `python -c "import secrets; print(secrets.token_urlsafe(50))"`) and put your Postgres password in `DATABASE_URL`.
5. Create the tables: `python manage.py migrate`
6. Make yourself an admin: `python manage.py make_admin you@example.com --password "ChooseAGoodOne1"`
7. Start the server: `python manage.py runserver` (it answers at http://localhost:8000/api/).

Run the tests any time with `python manage.py test`.

## What is here so far
- All database tables from `BACKEND_HANDOFF.md` section 3.1 (`main/models.py`).
- Sign up / sign in / password reset / email confirmation / sign out everywhere (`main/authviews.py`).
- Admin allow-list (`admins` table, `make_admin` command).
- Rate limiting, password rules (same as the website), leaked-password check.
