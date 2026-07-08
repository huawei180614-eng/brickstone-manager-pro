alter table users_roles add column if not exists password text;
alter table users_roles add column if not exists active boolean default true;
update users_roles set password='1234', active=true where email='piatrata@yandex.com';
update users_roles set password='1111', active=true where email='Serghei';
insert into users_roles (email, role, password, active)
select 'piatrata@yandex.com','admin','1234',true
where not exists (select 1 from users_roles where email='piatrata@yandex.com');
insert into users_roles (email, role, password, active)
select 'Serghei','operator','1111',true
where not exists (select 1 from users_roles where email='Serghei');
alter table workers add column if not exists active boolean default true;
alter table advances add column if not exists code text;
alter table advances add column if not exists operator_name text;
alter table sms_logs add column if not exists status text default 'pending';
