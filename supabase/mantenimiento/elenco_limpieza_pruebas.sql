-- Limpieza de las pruebas del Elenco Fundador. NO lo ejecuta Claude.
--
-- Borra, de las cuentas de prueba que indiques, sus invitaciones/plazas de
-- fundador, sus tramos de cortesía, sus recompensas, las semanas de Cartelera
-- aplicadas y las atribuciones de referidos (las suyas como referido y las de
-- sus fundadores). Después devuelve el plan de esas cuentas al que les
-- corresponde sin el Elenco (su suscripción de pago o su cortesía de
-- Embajador, si la tienen; si no, gratuito).
--
-- La numeración se calcula como «el número más bajo sin una plaza viva»: en
-- cuanto no quede ninguna fila en elenco_fundadores, la siguiente invitación
-- será la 001. La PARTE A lo comprueba antes de borrar.
--
-- Cómo usarlo:
--   1. Rellena las DOS listas de cada parte (son iguales en A y en B):
--      · correos de las cuentas de prueba;
--      · números de invitaciones de prueba que no se aceptaron con ninguna
--        de esas cuentas (pendientes o anuladas). Si no hay, deja (0).
--   2. Ejecuta solo la PARTE A (solo lectura) y revisa qué filas borraría.
--   3. Si es correcto, ejecuta la PARTE B.

-- ═══ PARTE A · Solo lectura: qué se borraría ═══════════════════════════════
with correos(email) as (values
  ('prueba1@ejemplo.com'),
  ('prueba2@ejemplo.com')
),
numeros(n) as (values (0)),
cuentas as (
  select p.id, p.email from public.profiles p join correos c on lower(p.email) = lower(c.email)
),
fund as (
  select f.* from public.elenco_fundadores f
  where f.aceptada_por in (select id from cuentas) or f.numero in (select n from numeros)
),
afectados as (
  select id from cuentas
  union select aceptada_por from fund where aceptada_por is not null
)
select 1 as orden, 'Cuenta de prueba encontrada' as que, null::text as numero, c.email as detalle
from cuentas c
union all
select 2, 'Invitación / plaza de fundador', lpad(f.numero::text, 3, '0'),
       f.nombre || ' · ' || f.estado || coalesce(' · cuenta ' || (select email from public.profiles where id = f.aceptada_por), '')
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
       p.email || ': ' || p.plan || ' → ' ||
       coalesce((select x.plan from (
         select public.plan_tras_cortesia(p.id) as plan
         union all
         select m.plan from public.membresias_cortesia m
         where m.profile_id = p.id and m.hasta > now() and m.renunciada_at is null
       ) x order by public.plan_rango(x.plan) desc limit 1), 'gratuito')
from public.profiles p where p.id in (select id from afectados)
union all
select 8, 'Plazas que seguirán vivas tras la limpieza', null,
       coalesce(string_agg(lpad(f.numero::text, 3, '0') || ' ' || f.nombre, ', ' order by f.numero), 'ninguna')
from public.elenco_fundadores f
where f.estado <> 'anulada' and f.id not in (select id from fund)
union all
select 9, 'Siguiente número que se asignará', lpad(min(g)::text, 3, '0'), null
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
  ('prueba1@ejemplo.com'),
  ('prueba2@ejemplo.com');

create temp table _numeros (n integer) on commit drop;
insert into _numeros values (0);

create temp table _cuentas on commit drop as
  select p.id from public.profiles p join _correos c on lower(p.email) = lower(c.email);

create temp table _fund on commit drop as
  select f.id, f.aceptada_por from public.elenco_fundadores f
  where f.aceptada_por in (select id from _cuentas) or f.numero in (select n from _numeros);

create temp table _afectados on commit drop as
  select id from _cuentas
  union select aceptada_por from _fund where aceptada_por is not null;

-- Semanas de Cartelera aplicadas desde el Elenco (borra el uso en cascada).
delete from public.cartelera_destacados
where id in (select destacado_id from public.elenco_cartelera_usos where fundador_id in (select id from _fund));

delete from public.elenco_referidos
where profile_id in (select id from _cuentas) or fundador_id in (select id from _fund);

delete from public.elenco_cortesias
where fundador_id in (select id from _fund) or profile_id in (select id from _cuentas);

delete from public.elenco_recompensas where fundador_id in (select id from _fund);

delete from public.elenco_fundadores where id in (select id from _fund);

-- Plan sin el Elenco: el mayor entre su suscripción de pago y su cortesía de
-- Embajador vigente; si no tiene ninguna, gratuito.
update public.profiles p
set plan = o.plan::public.plan_suscripcion, is_premium = (o.plan <> 'gratuito'), updated_at = now()
from (select a.id, public.elenco_plan_objetivo(a.id) as plan from _afectados a) o
where p.id = o.id and p.plan::text <> o.plan;

-- Comprobación: lo que queda de esas cuentas (todo a 0) y el siguiente número.
select
  (select count(*) from public.elenco_fundadores where id in (select id from _fund)) as fundadores_restantes,
  (select count(*) from public.elenco_referidos where profile_id in (select id from _cuentas)) as atribuciones_restantes,
  (select count(*) from public.elenco_cortesias where profile_id in (select id from _afectados)) as tramos_restantes,
  (select lpad(min(g)::text, 3, '0') from generate_series(1, 100) g
   where not exists (select 1 from public.elenco_fundadores f where f.numero = g and f.estado <> 'anulada')) as siguiente_numero;

commit;
