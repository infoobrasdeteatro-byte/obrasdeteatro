-- SCENAIA-007: reversion de la migracion works_epocas.
--
-- NO es una migracion: esta fuera de supabase/migrations a proposito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Direccion decide revertir.
--
-- ANTES de ejecutarla, SCENAIA_EPOCA_ENABLED debe estar apagado (acta §6.6):
-- con el PR 2 desplegado, Repository Layer referencia la columna en cuanto
-- recibe el criterio epocas. Sin el PR 2, o con el interruptor apagado, la
-- aplicacion no la lee y revertir no exige desplegar codigo.
--
-- El relleno se pierde con la columna; se reconstruye volviendo a aplicar la
-- migracion.

begin;

drop index if exists public.works_epocas_gin_idx;
alter table public.works drop constraint if exists works_epocas_check;
alter table public.works drop column if exists epocas;

commit;
