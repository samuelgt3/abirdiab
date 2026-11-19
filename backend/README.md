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

## Phase 2: content, admin data and files
- `POST /api/db/<table>` : one door for reading/writing tables, with the access rules in `main/tableapi.py`
  (visitors: published content only; admins: what the admin screen needs; everything private is admin-only; every admin change is written to the audit trail).
- `POST /api/rpc/<name>` : the named functions (`main/rpc.py`). Done so far: `public_settings`, `is_admin`, `available_slots`,
  `workshop_seats`, `submit_story`, `newsletter_subscribed`, `set_newsletter`, `my_progress`, `touch_course`, `set_lesson_done`,
  `course_unlocked`, `can_read_course_file`, `course_access`. The booking / order / gift ones come in Phase 3 and 4.
- `POST /api/fn/geo` and `/api/fn/setup-status`.
- Files: public pictures/audio and private paid files (`main/storage.py`), plus signed Bunny video links (`main/bunny.py`).
  Files are kept in `backend/data/` (or `MEDIA_ROOT` / `PRIVATE_FILES_ROOT` in `.env`). On a real server that folder must be on a disk that survives restarts.
- The settings row (`site_settings`, id 1) is created automatically with the website's defaults.

### Running the website against this backend on your computer
1. Terminal 1, in `backend` (with `(venv)` on): `python manage.py runserver`
2. Make yourself an admin: `python manage.py make_admin your@email.com --password "ChooseAGoodOne1"`
3. Terminal 2, in `frontend`: copy `.env.example` to `.env.local` (it already points at `http://localhost:8000/api`), then `npm install` and `npm run dev`
4. Open http://localhost:5173 (the site) and http://localhost:5173/admin (the admin screen; sign in with the account from step 2).

### Before going live
- Add the API's address to `connect-src` in `frontend/public/_headers` (it still lists the old Supabase address), or the browser will block the calls.
- Add `BUNNY_TOKEN_KEY` (Bunny library > Security > Token Authentication) to `.env` so paid videos use expiring links.
