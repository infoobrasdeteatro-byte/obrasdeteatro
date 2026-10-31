-- Elenco Fundador: una persona solo es colega activa si, además del correo
-- confirmado y la foto, tiene al menos una profesión elegida. Los perfiles de
-- «público general» pueden quedar atribuidos como referidos, pero no suman.
--
-- 1. elenco_colegas: nueva clase 'publico' (nunca activa, 0 puntos) y la
--    condición de profesión para 'persona'. Mismas columnas y en el mismo
--    orden, para que CREATE OR REPLACE VIEW la sustituya sin más.
-- 2. Comprobación inmediata también al elegir una profesión
--    (profile_specialties), con el mismo trigger de la escalera.
-- 3. El suelo de plan del Elenco se ejecuta ANTES que profiles_sello_sigue_plan
--    (los triggers BEFORE se disparan por orden alfabético). Antes iba
--    después: si Stripe dejaba en «gratuito» a un fundador con un tramo
--    vigente, el sello «✓ Verificado» se retiraba aunque el plan se quedara
--    en el del tramo. Solo cambia el nombre del trigger; la función es la misma.
--
-- Organizaciones, salas, puntos, escalera y Embajadores: sin cambios.

-- 1 ─────────────────────────────────────────────────────────────────────────
create or replace view public.elenco_colegas
with (security_invoker = true)
as
select r.fundador_id,
       r.profile_id,
       r.creado_at,
       p.created_at as alta,
       coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre) as nombre,
       p.tipo_perfil::text as tipo_perfil,
       c.clase,
       a.activo,
       case when a.activo then (case c.clase when 'persona' then 1 else 3 end) else 0 end as puntos
from public.elenco_referidos r
join public.profiles p on p.id = r.profile_id
cross join lateral (
  select case when p.tipo_perfil::text = 'teatro' then 'sala'
              when public.elenco_es_organizacion(p.tipo_perfil::text) then 'organizacion'
              when p.tipo_perfil::text = 'publico' then 'publico'
              else 'persona' end as clase
) c
cross join lateral (
  select p.deleted_at is null and case c.clase
    when 'persona' then p.verificado
                        and coalesce(btrim(p.avatar_url), '') <> ''
                        and exists (select 1 from public.profile_specialties s where s.profile_id = p.id)
    when 'organizacion' then coalesce(btrim(p.avatar_url), '') <> '' and coalesce(btrim(p.bio), '') <> '' and coalesce(btrim(p.ciudad), '') <> ''
    when 'sala' then exists (select 1 from public.espacios_reclamaciones er where er.profile_id = p.id and er.estado = 'aprobada')
    else false
  end as activo
) a;

comment on view public.elenco_colegas is
  'Elenco Fundador: colegas referidos, si están activos y sus puntos. Persona: correo confirmado + foto + al menos una profesión (1). Organización: logo, presentación y ciudad (3). Sala: reclamación aprobada (3). Público general: 0. Calculado siempre a partir de los datos reales. Solo service_role.';

revoke all on public.elenco_colegas from anon, authenticated;
grant select on public.elenco_colegas to service_role;

-- 2 ─────────────────────────────────────────────────────────────────────────
drop trigger if exists profile_specialties_elenco_colega on public.profile_specialties;
create trigger profile_specialties_elenco_colega
  after insert on public.profile_specialties
  for each row execute function public.elenco_revisar_colega();

-- 3 ─────────────────────────────────────────────────────────────────────────
drop trigger if exists profiles_suelo_elenco on public.profiles;
drop trigger if exists profiles_plan_suelo_elenco on public.profiles;
create trigger profiles_plan_suelo_elenco
  before update of plan on public.profiles
  for each row when (new.plan is distinct from old.plan)
  execute function public.profiles_suelo_elenco();
