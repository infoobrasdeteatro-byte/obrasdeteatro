-- Recordatorio a las cuentas que no han confirmado su correo.
--
-- public.avisos_confirmacion_enviados anota a quién se le ha enviado, para
-- que nadie lo reciba dos veces. Solo la usa el servidor (service_role)
-- desde /admin/recordatorio-confirmacion: RLS activada y sin políticas.
-- Las exclusiones a mano reutilizan public.avisos_perfil_excluidos.

create table if not exists public.avisos_confirmacion_enviados (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  enviado_at timestamptz not null default now()
);

alter table public.avisos_confirmacion_enviados enable row level security;

revoke all on public.avisos_confirmacion_enviados from anon, authenticated;
grant select, insert, update, delete on public.avisos_confirmacion_enviados to service_role;

comment on table public.avisos_confirmacion_enviados is
  'Recordatorio «confirma tu correo» (oct 2026): a quién se envió. Solo service_role.';
