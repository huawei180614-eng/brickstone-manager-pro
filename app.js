create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  pin text,
  salary numeric default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists advances (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(id) on delete set null,
  amount numeric not null,
  comment text,
  operator_name text,
  sms_sent boolean default false,
  code text,
  created_at timestamptz default now()
);

create table if not exists sms_logs (
  id uuid primary key default gen_random_uuid(),
  advance_id uuid references advances(id) on delete set null,
  phone text,
  message text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table workers enable row level security;
alter table advances enable row level security;
alter table sms_logs enable row level security;

create policy if not exists "public read workers" on workers for select using (true);
create policy if not exists "public insert workers" on workers for insert with check (true);
create policy if not exists "public read advances" on advances for select using (true);
create policy if not exists "public insert advances" on advances for insert with check (true);
create policy if not exists "public read sms_logs" on sms_logs for select using (true);
create policy if not exists "public insert sms_logs" on sms_logs for insert with check (true);
