# Brickstone Manager Pro

Aplicație web pentru evidența muncitorilor și avansurilor Brickstone.

## Conține
- Admin / Operator
- Muncitori
- Avansuri
- Rapoarte Admin
- Export CSV
- Pregătire SMS Moldova prin `sms_logs`
- Supabase + fallback localStorage

## Pași
1. Rulează `sql/setup.sql` în Supabase.
2. În `app.js`, înlocuiește `PASTE_SUPABASE_PUBLISHABLE_KEY_HERE` cu cheia Publishable Key.
3. Publică proiectul pe Vercel.

## Login demo
Admin: `piatrata@yandex.com` / `1234`
Operator: `Serghei` / `1111`
