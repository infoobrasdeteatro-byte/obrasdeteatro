-- Reversión de la migración noticias_vista_publica_y_sin_borrado.
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir.
--
-- ATENCIÓN: la sección pública /noticias lee de noticias_publicas; sin la
-- vista deja de funcionar. Revertir solo junto con el código que la usa.

begin;

drop view if exists public.noticias_publicas;

grant delete on public.noticias to authenticated;

commit;
