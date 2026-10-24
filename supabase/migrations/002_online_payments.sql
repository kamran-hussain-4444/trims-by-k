-- Online payments (Stripe). Paste into Supabase > SQL Editor and click Run.
alter table bookings add column if not exists paid_at timestamptz;
alter table bookings add column if not exists stripe_session_id text;
