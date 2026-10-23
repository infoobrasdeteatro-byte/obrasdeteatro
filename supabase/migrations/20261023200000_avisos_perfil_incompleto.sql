-- Aviso por correo a las cuentas con el perfil incompleto.
--
-- public.avisos_perfil_enviados guarda a quién se le ha enviado ya el aviso,
-- para que nadie lo reciba dos veces aunque se pulse otra vez «Enviar».
-- Solo la usa el servidor (service_role) desde /admin/avisos-perfil: RLS
-- activada y sin políticas, así que anon y authenticated no la ven.

create table if not exists public.avisos_perfil_enviados (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  enviado_at timestamptz not null default now(),
  faltas text[] not null default '{}'
);

alter table public.avisos_perfil_enviados enable row level security;

revoke all on public.avisos_perfil_enviados from anon, authenticated;
grant select, insert, update, delete on public.avisos_perfil_enviados to service_role;

comment on table public.avisos_perfil_enviados is
  'Aviso «completa tu perfil» (oct 2026): a quién se envió y qué le faltaba. Solo service_role.';
