-- Brickstone Manager Pro v1.4 - completări pentru Supabase
alter table users_roles add column if not exists name text;
alter table users_roles add column if not exists password text;
alter table users_roles add column if not exists active boolean default true;
alter table workers add column if not exists salary numeric default 0;
alter table workers add column if not exists active boolean default true;
alter table advances add column if not exists code text;
alter table advances add column if not exists comment text;

insert into users_roles (email, name, password, role, active)
select 'piatrata@yandex.com', 'Admin Brickstone', '1234', 'admin', true
where not exists (select 1 from users_roles where email='piatrata@yandex.com');

insert into users_roles (email, name, password, role, active)
select 'Serghei', 'Serghei', '1111', 'operator', true
where not exists (select 1 from users_roles where email='Serghei');
