-- Reversión de la migración noticias_registro_y_guarda (Noticias 4/5).
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir, y DESPUÉS de revertir la 5/5.
--
-- Se pierde el registro de eventos. Sin el trigger de guarda, la tabla
-- noticias queda sin reglas de estado: no dejarla así en producción, revertir
-- también la 3/5 o volver a aplicar esta.

begin;

drop trigger if exists trg_noticias_registro on public.noticias;
drop trigger if exists trg_noticias_guarda on public.noticias;
drop function if exists public.noticias_registrar_cambio();
drop function if exists public.noticias_guarda();
drop table if exists public.noticias_registro;

commit;
