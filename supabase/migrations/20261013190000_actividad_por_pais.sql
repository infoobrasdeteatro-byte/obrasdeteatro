-- Actividad por país para el mapa de la portada («Comunidad hispana»).
--
-- Una sola llamada que cuenta, por país, lo mismo que enseñan los listados
-- públicos:
--   profesionales → /directorio  (perfil público, verificado, activo, sin
--                                  extinción ni borrado, con slug)
--   castings      → /castings    (publicados y con el plazo abierto)
--   convocatorias → /convocatoria (publicadas, sin borrar, abiertas)
--   espacios      → /espacios    (publicados)
--   noticias      → /noticias    (vista noticias_publicas, últimos 30 días)
--
-- SECURITY INVOKER a propósito: la portada la llama con la clave anónima y
-- la RLS decide igual que en los listados; no cuenta nada que un visitante
-- no pueda ver. castings.pais guarda el nombre del país; el resto, el código.

create or replace function public.actividad_por_pais()
returns table (tipo text, pais text, total bigint)
language sql
stable
security invoker
set search_path = 'public'
as $$
  select 'profesionales', country_code, count(*)
    from public.profiles
   where perfil_publico and verificado and activo
     and extincion_solicitada_at is null and deleted_at is null
     and slug is not null and country_code is not null
   group by country_code
  union all
  select 'castings', pais, count(*)
    from public.castings
   where estado = 'publicado' and pais is not null
     and fecha_cierre >= (now() at time zone 'Europe/Madrid')::date
   group by pais
  union all
  select 'convocatorias', pais_code, count(*)
    from public.calls
   where estado = 'publicado' and deleted_at is null and pais_code is not null
     and (deadline is null or deadline >= now())
   group by pais_code
  union all
  select 'espacios', pais_code, count(*)
    from public.espacios_escenicos
   where estado = 'publicado' and pais_code is not null
   group by pais_code
  union all
  select 'noticias', pais_code, count(*)
    from public.noticias_publicas
   where pais_code is not null and publicado_at >= now() - interval '30 days'
   group by pais_code
$$;

comment on function public.actividad_por_pais() is
  'Cuántos profesionales, castings abiertos, convocatorias abiertas, espacios y noticias (30 días) hay por país, con la RLS de quien llama. Para el mapa de la portada.';

revoke all on function public.actividad_por_pais() from public;
grant execute on function public.actividad_por_pais() to anon, authenticated;
