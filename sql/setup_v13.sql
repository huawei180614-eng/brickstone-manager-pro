create extension if not exists pgcrypto;

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  pin text,
  salary numeric default 0,
  site text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists advances (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(id) on delete cascade,
  amount numeric not null,
  comment text,
  operator_name text,
  code text,
  sms_sent boolean default false,
  created_at timestamptz default now()
);

create table if not exists users_roles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password text,
  role text not null check (role in ('admin','operator')),
  active boolean default true,
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

alter table workers add column if not exists active boolean default true;
alter table workers add column if not exists pin text;
alter table workers add column if not exists salary numeric default 0;
alter table advances add column if not exists operator_name text;
alter table advances add column if not exists code text;
alter table advances add column if not exists sms_sent boolean default false;
alter table users_roles add column if not exists name text;
alter table users_roles add column if not exists password text;
alter table users_roles add column if not exists active boolean default true;

alter table workers enable row level security;
alter table advances enable row level security;
alter table users_roles enable row level security;
alter table sms_logs enable row level security;

drop policy if exists "public read workers" on workers;
drop policy if exists "public insert workers" on workers;
drop policy if exists "public update workers" on workers;
drop policy if exists "public read advances" on advances;
drop policy if exists "public insert advances" on advances;
drop policy if exists "public read users" on users_roles;
drop policy if exists "public insert users" on users_roles;
drop policy if exists "public update users" on users_roles;
drop policy if exists "public read sms" on sms_logs;
drop policy if exists "public insert sms" on sms_logs;

create policy "public read workers" on workers for select using (true);
create policy "public insert workers" on workers for insert with check (true);
create policy "public update workers" on workers for update using (true);
create policy "public read advances" on advances for select using (true);
create policy "public insert advances" on advances for insert with check (true);
create policy "public read users" on users_roles for select using (true);
create policy "public insert users" on users_roles for insert with check (true);
create policy "public update users" on users_roles for update using (true);
create policy "public read sms" on sms_logs for select using (true);
create policy "public insert sms" on sms_logs for insert with check (true);

insert into users_roles (email,name,password,role,active)
values ('piatrata@yandex.com','Admin Brickstone','1234','admin',true)
on conflict (email) do update set name=excluded.name, password=excluded.password, role=excluded.role, active=true;

insert into users_roles (email,name,password,role,active)
values ('serghei','Serghei','1111','operator',true)
on conflict (email) do update set name=excluded.name, password=excluded.password, role=excluded.role, active=true;
