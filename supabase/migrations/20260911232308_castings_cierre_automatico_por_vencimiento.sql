-- Castings: cierre automatico de convocatorias vencidas.
--
-- El ciclo de vida quedaba abierto por un extremo. 'borrador',
-- 'pendiente_revision', 'publicado' y 'rechazado' los produce siempre la
-- escritura de alguien, y por eso el trigger basta para gobernarlos. 'cerrado'
-- no: lo produce el paso del tiempo. Que llegue la fecha de cierre no es un
-- evento de escritura -- nadie toca la fila cuando avanza el reloj --, de modo
-- que ningun trigger puede reaccionar a ello. Hace falta algo que mire la hora
-- por su cuenta.
--
-- Se usa pg_cron y no una tarea en Vercel porque el hecho que hay que observar
-- (una columna de esta tabla frente a la fecha de hoy) vive entero dentro de
-- esta base de datos: sacarlo fuera anadiria una pieza de infraestructura, una
-- credencial y un modo de fallo nuevos para no observar nada que no se vea
-- desde aqui.

-- 1. pg_cron.
--
--    Estaba disponible pero no instalada en este proyecto (pg_available_extensions
--    la daba en 1.6.4 con installed_version nula). Se instala por SQL, sin
--    necesidad del panel de Supabase; aterriza en pg_catalog, que es como
--    Supabase la tiene configurada, y crea el esquema `cron` con sus tablas.
create extension if not exists pg_cron;

-- 2. La operacion de cierre.
--
--    SECURITY DEFINER porque la ejecuta el planificador, no una sesion de
--    usuario: no hay auth.uid() a quien pedirle permisos, y no debe pasar por
--    RLS. Es una operacion del sistema sobre el reloj, no la accion de nadie.
--
--    SOBRE LA COMPARACION DE FECHAS. `fecha_cierre` es de tipo date, y aqui se
--    compara con current_date, NO con now(). No es un detalle de estilo:
--    `fecha_cierre < now()` habria convertido la fecha a las 00:00 de ese dia,
--    de modo que una convocatoria que cierra HOY se habria cerrado a la
--    medianoche de hoy -- perdiendo su ultimo dia entero. Con current_date solo
--    se cierran las fechas estrictamente anteriores a hoy, que es lo que
--    significa "ya paso".
--
--    El dia lo marca la zona horaria del servidor (UTC en Supabase), asi que
--    una convocatoria se cierra a las 00:00 UTC -- 01:00 o 02:00 en horario
--    peninsular. Si algun dia importa cerrar a medianoche espanola, el cambio
--    es comparar contra (now() at time zone 'Europe/Madrid')::date.
create or replace function public.cerrar_castings_vencidos()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.castings
  set estado = 'cerrado'
  where estado = 'publicado'
    and fecha_cierre < current_date;
end;
$$;

comment on function public.cerrar_castings_vencidos() is
  'Cierra las convocatorias publicadas cuya fecha_cierre es anterior a hoy. La invoca el job pg_cron cerrar-castings-vencidos; no la llama la aplicacion.';

-- 3. El job.
--
--    Se desprograma primero cualquier job homonimo para que reaplicar esta
--    migracion no deje dos. Se hace por jobid via SELECT y no con
--    cron.unschedule('nombre'), que lanza excepcion si el job no existe y
--    haria fallar la primera aplicacion.
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'cerrar-castings-vencidos';
end;
$$;

select cron.schedule(
  'cerrar-castings-vencidos',
  '*/15 * * * *',
  $job$select public.cerrar_castings_vencidos();$job$
);
