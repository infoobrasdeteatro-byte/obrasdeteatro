-- SCENAIA-006: reversion de las dos migraciones.
--
-- NO es una migracion: esta fuera de supabase/migrations a proposito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Direccion decide revertir.
--
-- Orden: la migracion 2 primero y despues la 1, en sentido inverso al de
-- aplicacion. Con SCENAIA_GENERO_SQL_ENABLED apagado (o sin el PR 2), la
-- aplicacion no lee genre_normalizado: revertir no exige desplegar codigo.
--
-- La extension unaccent se deja instalada: retirarla no aporta nada y otra
-- funcion podria depender de ella. Si hiciera falta:
--   drop extension if exists unaccent;  -- falla si algo la usa, y es lo correcto

begin;

-- Migracion 2
drop index if exists public.works_publicadas_titulo_id_idx;

-- Migracion 1
drop index if exists public.works_genre_normalizado_trgm_idx;
alter table public.works drop column if exists genre_normalizado;
drop function if exists public.f_unaccent(text);

commit;
