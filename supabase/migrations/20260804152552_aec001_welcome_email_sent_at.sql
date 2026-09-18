-- AEC-001: columna aditiva para garantizar que el correo de bienvenida se
-- envía como mucho una vez por cuenta, disparado únicamente tras la
-- confirmación real del email (app/auth/callback/route.ts), nunca en el
-- momento del registro.

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;
