-- Reversión de la migración noticias (Noticias 3/5).
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir, y DESPUÉS de revertir la 4/5.
--
-- Se pierden todas las noticias.

begin;

drop view if exists public.noticias_fuentes_publicas;
drop table if exists public.noticias;
drop function if exists public.noticias_normalizar_url(text);

commit;
