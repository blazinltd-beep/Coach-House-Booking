# Coach House Music Studios — Booking System

## Vercel Environment Variables (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (re_xxx...) |
| `FROM_EMAIL` | bookings@coachhousemusic.uk |
| `APP_URL` | https://booking.coachhousemusic.uk |
| `EMAIL_BLAZE` | blaze@coachhousemusic.uk |
| `EMAIL_MATTHEW` | matthew@coachhousemusic.uk |
| `EMAIL_SAM` | sam@coachhousemusic.uk |

## Local Dev
```bash
npm install
npm run dev
```

## Supabase Setup

1. Go to supabase.com → new project
2. Go to SQL Editor and run this:

```sql
create table bookings (
  id text primary key,
  client_name text,
  client_email text,
  client_phone text,
  room text,
  service text,
  date text,
  start_time text,
  hours integer,
  notes text,
  staff_needed jsonb,
  staff_responses jsonb,
  tokens jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);
```

3. Go to Project Settings → API → copy:
   - Project URL → SUPABASE_URL
   - service_role key → SUPABASE_SERVICE_KEY

4. Add both to Vercel Environment Variables
