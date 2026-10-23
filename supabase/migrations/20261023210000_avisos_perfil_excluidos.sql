-- Aviso de perfil incompleto: cuentas excluidas a mano.
--
-- public.avisos_perfil_excluidos lista las cuentas que no deben recibir el
-- aviso aunque les falte algo (cuentas de prueba, del entorno del equipo…).
-- Así no hace falta escribir correos personales en el código. Solo la usa el
-- servidor (service_role): RLS activada y sin políticas.

create table if not exists public.avisos_perfil_excluidos (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  motivo text,
  created_at timestamptz not null default now()
);

alter table public.avisos_perfil_excluidos enable row level security;

revoke all on public.avisos_perfil_excluidos from anon, authenticated;
grant select, insert, update, delete on public.avisos_perfil_excluidos to service_role;

comment on table public.avisos_perfil_excluidos is
  'Cuentas que no reciben el aviso «completa tu perfil». Solo service_role.';
