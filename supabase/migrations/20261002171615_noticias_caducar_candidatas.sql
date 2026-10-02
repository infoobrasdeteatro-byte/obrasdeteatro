-- Noticias (5/5): caducidad de candidatas.
--
-- Una candidata que nadie revisa en 7 días ya no es actualidad. Una vez al
-- día pasan a 'descartada' con motivo 'caducada'. Mismo patrón que el cierre
-- de castings y convocatorias: pg_cron dentro de la base, porque lo que hay
-- que observar (created_at frente al reloj) vive entero aquí.
--
-- SECURITY DEFINER: la ejecuta el planificador, sin sesión de usuario. Dentro
-- de la función current_user es el propietario, y noticias_guarda() lo trata
-- como sistema, así que la transición candidata -> descartada se permite.
-- revisado_por queda null (no hay persona) y el trigger de registro deja la
-- entrada 'descartada' con motivo 'caducada'.
--
-- Hora: 03:30 UTC (05:30 en Madrid en verano, 04:30 en invierno), fuera del
-- horario de revisión.

create function public.caducar_noticias_candidatas()
returns integer
language plpgsql
security definer
set search_path = 'public'
as $fn$
declare
  v_n integer;
begin
  update public.noticias
  set estado = 'descartada',
      motivo_descarte = 'caducada'
  where estado = 'candidata'
    and created_at < now() - interval '7 days';

  get diagnostics v_n = row_count;
  return v_n;
end;
$fn$;

comment on function public.caducar_noticias_candidatas() is
  'Descarta con motivo ''caducada'' las candidatas con más de 7 días sin revisar. La invoca el job pg_cron caducar-noticias-candidatas; no la llama la aplicación.';

-- Solo el planificador (propietario) la ejecuta.
revoke execute on function public.caducar_noticias_candidatas() from public, anon, authenticated;

-- Se desprograma primero cualquier job homónimo para que reaplicar la
-- migración no deje dos. Por jobid vía SELECT y no con unschedule('nombre'),
-- que lanza excepción si el job no existe.
select cron.unschedule(jobid)
from cron.job
where jobname = 'caducar-noticias-candidatas';

select cron.schedule(
  'caducar-noticias-candidatas',
  '30 3 * * *',
  $job$select public.caducar_noticias_candidatas();$job$
);
