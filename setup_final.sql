create extension if not exists pgcrypto;

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  pin text,
  salary numeric default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists users_roles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text,
  role text not null check (role in ('admin','operator')),
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

create table if not exists sms_logs (
  id uuid primary key default gen_random_uuid(),
  advance_id uuid references advances(id) on delete set null,
  phone text,
  message text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table users_roles add column if not exists password text;
alter table users_roles add column if not exists active boolean default true;
alter table advances add column if not exists code text;
alter table workers add column if not exists active boolean default true;

insert into users_roles (email,password,role,active)
values ('piatrata@yandex.com','1234','admin',true)
on conflict (email) do update set password='1234', role='admin', active=true;

insert into users_roles (email,password,role,active)
values ('Serghei','1111','operator',true)
on conflict (email) do update set password='1111', role='operator', active=true;

alter table workers enable row level security;
alter table advances enable row level security;
alter table users_roles enable row level security;
alter table sms_logs enable row level security;

drop policy if exists "all workers" on workers;
drop policy if exists "all advances" on advances;
drop policy if exists "all users_roles" on users_roles;
drop policy if exists "all sms_logs" on sms_logs;

create policy "all workers" on workers for all using (true) with check (true);
create policy "all advances" on advances for all using (true) with check (true);
create policy "all users_roles" on users_roles for all using (true) with check (true);
create policy "all sms_logs" on sms_logs for all using (true) with check (true);
