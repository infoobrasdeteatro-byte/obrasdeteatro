-- Limpieza de las pruebas del Elenco Fundador (31-10-2026). NO lo ejecuta Claude.
--
-- Ya relleno con las cuentas de prueba:
--   info.obrasdeteatro@gmail.com          fundadora 001 (cuenta de administración y equipo)
--   viajeseutour@gmail.com                fundadora 002, con el bono de Empresas activo
--   info.obrasdeteatro+prueba3@gmail.com
--   info.obrasdeteatro+prueba4@gmail.com
--   info.obrasdeteatro+prueba5@gmail.com  referida de 001
--
-- Solo se borran datos del Elenco: plazas de fundador, atribuciones de
-- referidos, tramos de cortesía, recompensas y semanas de Cartelera aplicadas
-- desde el Elenco. Las cuentas NO se eliminan.
--
-- Plan de las cuentas:
--   · Solo se recalcula el plan de las cuentas a las que el Elenco aplicó algún
--     tramo de cortesía (hoy, solo viajeseutour: bono de Empresas). Vuelven al
--     plan que les corresponde sin el Elenco (su suscripción de pago o su
--     cortesía de Embajador; si no tienen, gratuito).
--   · Las demás cuentas no se tocan.
--   · info.obrasdeteatro@gmail.com tiene Premium asignado a mano antes de las
--     pruebas (sin suscripción de Stripe ni cortesía de Embajador; última
--     modificación del perfil el 23-10-2026, antes de existir el Elenco), y el
--     Elenco nunca le aplicó ningún tramo. El cálculo automático le daría
--     «gratuito», así que queda EXCLUIDA del recálculo de forma explícita, y
--     la PARTE B comprueba al final que su plan, is_premium y
--     verificado_profesional son exactamente los de antes. Si algo cambiara,
--     la transacción se deshace entera.
--
-- Cómo usarlo:
--   1. Ejecuta solo la PARTE A (solo lectura) y revisa qué filas borraría.
--   2. Si es correcto, ejecuta la PARTE B entera (de «begin;» a «commit;»).

-- ═══ PARTE A · Solo lectura: qué se borraría ═══════════════════════════════
with correos(email) as (values
  ('info.obrasdeteatro@gmail.com'),
  ('viajeseutour@gmail.com'),
  ('info.obrasdeteatro+prueba3@gmail.com'),
  ('info.obrasdeteatro+prueba4@gmail.com'),
  ('info.obrasdeteatro+prueba5@gmail.com')
),
conservar(email) as (values
  ('info.obrasdeteatro@gmail.com')
),
numeros(n) as (values (0)),
cuentas as (
  select p.id, p.email from public.profiles p join correos c on lower(p.email) = lower(c.email)
),
fund as (
  select f.* from public.elenco_fundadores f
  where f.aceptada_por in (select id from cuentas) or f.numero in (select n from numeros)
),
-- Cuentas cuyo plan tocó el Elenco (tienen tramos), salvo las protegidas.
recalcular as (
  select distinct c.profile_id as id from public.elenco_cortesias c
  where (c.fundador_id in (select id from fund) or c.profile_id in (select id from cuentas))
    and c.profile_id not in (select p.id from public.profiles p join conservar k on lower(p.email) = lower(k.email))
)
select 1 as orden, 'Cuenta de prueba encontrada' as que, null::text as numero, c.email as detalle
from cuentas c
union all
select 2, 'Invitación / plaza de fundador', lpad(f.numero::text, 3, '0'),
       f.nombre || ' · ' || f.tipo || ' · ' || f.estado || coalesce(' · cuenta ' || (select email from public.profiles where id = f.aceptada_por), '')
from fund f
union all
select 3, 'Atribución de referido', lpad(f.numero::text, 3, '0'),
       coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre) || ' (' || p.email || ')'
from public.elenco_referidos r
join public.elenco_fundadores f on f.id = r.fundador_id
join public.profiles p on p.id = r.profile_id
where r.profile_id in (select id from cuentas) or r.fundador_id in (select id from fund)
union all
select 4, 'Tramo de cortesía', lpad(f.numero::text, 3, '0'),
       c.motivo || ' · ' || c.plan || ' · ' || to_char(c.desde, 'YYYY-MM-DD') || ' → ' ||
       case when c.hasta = 'infinity' then 'para siempre' else to_char(c.hasta, 'YYYY-MM-DD') end
from public.elenco_cortesias c
join public.elenco_fundadores f on f.id = c.fundador_id
where c.fundador_id in (select id from fund) or c.profile_id in (select id from cuentas)
union all
select 5, 'Recompensa (escalón)', lpad(f.numero::text, 3, '0'),
       r.escalon || ' puntos · ' || to_char(r.otorgada_at, 'YYYY-MM-DD') ||
       case when r.correo_enviado_at is null then ' · sin aviso enviado' else ' · aviso enviado' end
from public.elenco_recompensas r join fund f on f.id = r.fundador_id
union all
select 6, 'Semana de Cartelera aplicada (se borra el destacado)', lpad(f.numero::text, 3, '0'),
       d.desde || ' → ' || d.hasta || ' · espectáculo ' || d.espectaculo_id
from public.elenco_cartelera_usos u
join fund f on f.id = u.fundador_id
join public.cartelera_destacados d on d.id = u.destacado_id
union all
select 7, 'Plan: actual → tras la limpieza', null,
       p.email || ': ' || p.plan || ' (is_premium ' || p.is_premium || ') → ' ||
       case
         when p.id not in (select id from recalcular) then 'sin cambios'
         else coalesce((select x.plan from (
           select public.plan_tras_cortesia(p.id) as plan
           union all
           select m.plan from public.membresias_cortesia m
           where m.profile_id = p.id and m.hasta > now() and m.renunciada_at is null
         ) x order by public.plan_rango(x.plan) desc limit 1), 'gratuito')
       end
from public.profiles p where p.id in (select id from cuentas)
union all
select 8, 'Cuenta protegida (plan intacto)', null,
       p.email || ': plan ' || p.plan || ' · is_premium ' || p.is_premium || ' · verificado_profesional ' || p.verificado_profesional ||
       ' · suscripciones ' || (select count(*) from public.subscriptions s where s.profile_id = p.id) ||
       ' · cortesías de Embajador ' || (select count(*) from public.membresias_cortesia m where m.profile_id = p.id) ||
       ' · tramos del Elenco ' || (select count(*) from public.elenco_cortesias c where c.profile_id = p.id) ||
       ' · perfil modificado ' || to_char(p.updated_at, 'YYYY-MM-DD')
from public.profiles p join conservar k on lower(p.email) = lower(k.email)
union all
select 9, 'Plazas que seguirán vivas tras la limpieza', null,
       coalesce(string_agg(lpad(f.numero::text, 3, '0') || ' ' || f.nombre, ', ' order by f.numero), 'ninguna')
from public.elenco_fundadores f
where f.estado <> 'anulada' and f.id not in (select id from fund)
union all
select 10, 'Siguiente número que se asignará', lpad(min(g)::text, 3, '0'), null
from generate_series(1, 100) g
where not exists (
  select 1 from public.elenco_fundadores f
  where f.numero = g and f.estado <> 'anulada' and f.id not in (select id from fund)
)
order by 1, 3, 4;


-- ═══ PARTE B · Borrado (ejecutar solo tras revisar la PARTE A) ═════════════
begin;

create temp table _correos (email text) on commit drop;
insert into _correos values
  ('info.obrasdeteatro@gmail.com'),
  ('viajeseutour@gmail.com'),
  ('info.obrasdeteatro+prueba3@gmail.com'),
  ('info.obrasdeteatro+prueba4@gmail.com'),
  ('info.obrasdeteatro+prueba5@gmail.com');

-- Cuentas cuyo plan no se toca nunca (administración y equipo).
create temp table _conservar on commit drop as
  select p.id, p.plan::text as plan, p.is_premium, p.verificado_profesional
  from public.profiles p
  where lower(p.email) in ('info.obrasdeteatro@gmail.com');

create temp table _numeros (n integer) on commit drop;
insert into _numeros values (0);

create temp table _cuentas on commit drop as
  select p.id from public.profiles p join _correos c on lower(p.email) = lower(c.email);

create temp table _fund on commit drop as
  select f.id, f.aceptada_por from public.elenco_fundadores f
  where f.aceptada_por in (select id from _cuentas) or f.numero in (select n from _numeros);

-- Solo las cuentas a las que el Elenco aplicó algún tramo (se calcula ANTES de
-- borrar los tramos), sin las protegidas.
create temp table _recalcular on commit drop as
  select distinct c.profile_id as id from public.elenco_cortesias c
  where (c.fundador_id in (select id from _fund) or c.profile_id in (select id from _cuentas))
    and c.profile_id not in (select id from _conservar);

-- Semanas de Cartelera aplicadas desde el Elenco (borra el uso en cascada).
delete from public.cartelera_destacados
where id in (select destacado_id from public.elenco_cartelera_usos where fundador_id in (select id from _fund));

delete from public.elenco_referidos
where profile_id in (select id from _cuentas) or fundador_id in (select id from _fund);

delete from public.elenco_cortesias
where fundador_id in (select id from _fund) or profile_id in (select id from _cuentas);

delete from public.elenco_recompensas where fundador_id in (select id from _fund);

delete from public.elenco_fundadores where id in (select id from _fund);

-- Plan sin el Elenco, solo para las cuentas con tramos: el mayor entre su
-- suscripción de pago y su cortesía de Embajador vigente; si no, gratuito.
update public.profiles p
set plan = o.plan::public.plan_suscripcion, is_premium = (o.plan <> 'gratuito'), updated_at = now()
from (select r.id, public.elenco_plan_objetivo(r.id) as plan from _recalcular r) o
where p.id = o.id and p.id not in (select id from _conservar) and p.plan::text <> o.plan;

-- Garantía: las cuentas protegidas conservan exactamente su plan. Si no, se
-- deshace todo.
do $$
begin
  if exists (
    select 1 from _conservar k join public.profiles p on p.id = k.id
    where p.plan::text <> k.plan or p.is_premium <> k.is_premium or p.verificado_profesional <> k.verificado_profesional
  ) then
    raise exception 'La cuenta protegida ha cambiado de plan: no se aplica la limpieza';
  end if;
end $$;

-- Comprobación: lo que queda (todo a 0), el plan de cada cuenta y el siguiente número.
select
  (select count(*) from public.elenco_fundadores where id in (select id from _fund)) as fundadores_restantes,
  (select count(*) from public.elenco_referidos where profile_id in (select id from _cuentas)) as atribuciones_restantes,
  (select count(*) from public.elenco_cortesias where profile_id in (select id from _cuentas)) as tramos_restantes,
  (select string_agg(p.email || ' ' || p.plan, ' · ' order by p.email) from public.profiles p where p.id in (select id from _cuentas)) as planes,
  (select lpad(min(g)::text, 3, '0') from generate_series(1, 100) g
   where not exists (select 1 from public.elenco_fundadores f where f.numero = g and f.estado <> 'anulada')) as siguiente_numero;

commit;
