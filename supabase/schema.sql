-- Trims by K database. Paste this whole file into Supabase > SQL Editor and click Run.
-- The app only talks to the database from the server with the service role key,
-- so RLS is switched on with no policies: nothing is readable from the browser.

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

create table if not exists closed_dates (
  date date primary key,
  note text
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null,
  private_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  service_id text not null,
  service_name text not null,
  mode text not null check (mode in ('studio', 'travel')),
  postcode text,
  address text,
  distance_miles numeric,
  service_price_pence int not null,
  travel_fee_pence int not null default 0,
  total_pence int not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  -- start_at/end_at widened by driving time, used to stop overlapping bookings
  block_start timestamptz not null,
  block_end timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  haircut_notes text not null default '',
  source text not null default 'web' check (source in ('web', 'chat')),
  created_at timestamptz not null default now(),
  -- The database itself refuses two live bookings whose diary time overlaps,
  -- even if two people press "send" at the same moment.
  constraint no_overlapping_bookings exclude using gist (
    tstzrange(block_start, block_end) with &&
  ) where (status in ('pending', 'confirmed'))
);

create index if not exists bookings_start_idx on bookings (start_at);
create index if not exists bookings_client_idx on bookings (client_id);

-- Per-visitor daily message count for the AI assistant.
create table if not exists chat_usage (
  visitor text not null,
  day date not null,
  count int not null default 0,
  primary key (visitor, day)
);

create or replace function bump_chat_usage(p_visitor text, p_day date)
returns int language sql as $$
  insert into chat_usage (visitor, day, count) values (p_visitor, p_day, 1)
  on conflict (visitor, day) do update set count = chat_usage.count + 1
  returning count;
$$;

alter table availability_blocks enable row level security;
alter table closed_dates enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table chat_usage enable row level security;

-- Starting hours: Thursday & Friday evenings, Saturday & Sunday daytime.
-- Change these any time from the admin page.
insert into availability_blocks (weekday, start_time, end_time)
select * from (values
  (4, time '17:00', time '22:00'),
  (5, time '17:00', time '22:00'),
  (6, time '09:00', time '18:00'),
  (0, time '10:00', time '17:00')
) as v(weekday, start_time, end_time)
where not exists (select 1 from availability_blocks);
