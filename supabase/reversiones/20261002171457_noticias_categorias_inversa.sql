-- Reversión de la migración noticias_categorias (Noticias 1/5).
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir, y DESPUÉS de revertir la 3/5.

begin;

drop table if exists public.noticias_categorias;

commit;
