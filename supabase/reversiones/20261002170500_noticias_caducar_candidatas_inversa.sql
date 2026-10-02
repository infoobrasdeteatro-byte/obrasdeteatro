-- Reversión de la migración noticias_caducar_candidatas (Noticias 5/5).
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir.
--
-- Orden de reversión del módulo: 5 -> 4 -> 3 -> 2 -> 1.

begin;

select cron.unschedule(jobid)
from cron.job
where jobname = 'caducar-noticias-candidatas';

drop function if exists public.caducar_noticias_candidatas();

commit;
