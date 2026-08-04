-- AEC-003B Fase 1: modelo de datos base para la Extinción de Identidad Digital
-- (PA-001, DA-001 a DA-006). Puramente aditivo: no se invoca todavía desde
-- ningún endpoint ni trigger. No toca patrimonio compartido, no toca el
-- Núcleo de ScenaIA, no toca auth.users.

-- Marcadores de estado (DA-004). Su sola presencia con valor no nulo indica
-- el estado; ninguno tiene valor por defecto.
alter table public.profiles
  add column if not exists extincion_solicitada_at timestamptz,
  add column if not exists identidad_extinguida_at timestamptz;

-- Función de anonimización del Plano 2 (Identidad Personal, DA-002).
-- No toca el Plano 1 (auth.users) ni el Plano 3 (patrimonio compartido:
-- ninguna tabla ajena a profiles). No se invoca todavía desde ningún sitio.
create or replace function public.extinguish_personal_identity(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.profiles
  set
    nombre = 'Identidad extinguida',
    apellidos = null,
    nombre_artistico = null,
    email = 'identidad-extinguida-' || p_profile_id || '@obrasdeteatro.invalid',
    bio = null,
    avatar_url = null,
    cover_url = null,
    phone = null,
    website_url = null,
    social_links = null,
    slug = 'usuario-' || substr(p_profile_id::text, 1, 8),
    scenaia_analisis = false,
    scenaia_recomendaciones = false
  where id = p_profile_id;
end;
$$;
