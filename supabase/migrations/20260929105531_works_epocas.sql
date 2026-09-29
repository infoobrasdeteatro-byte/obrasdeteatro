-- SCENAIA-007, PR 1: la epoca como dimension propia de la obra.
--
-- POR QUE. Hoy "teatro clasico" se interpreta como genero y solo encuentra 1
-- de las 10 obras del Siglo de Oro: las otras nueve llevan la epoca en
-- secondary_genres, texto libre que ningun filtro consulta. Esta migracion
-- crea la columna works.epocas con una lista cerrada de claves, su indice y
-- el relleno de las obras actuales. La aplicacion NO la usa todavia (PR 2,
-- Repository Layer; PR 3, interprete detras de SCENAIA_EPOCA_ENABLED).
--
-- Acta: docs/gobernanza/acta-autorizacion-scenaia-007-epoca.md (§4.1 y §4.7).
-- Reversion: supabase/reversiones/ (mismo nombre, sufijo _inversa).

-- 1. Columna. Con valor por defecto constante, PostgreSQL 17 no reescribe la
-- tabla: las obras existentes y las que se den de alta sin nombrarla (los
-- formularios y las importaciones actuales) quedan en '{}', nunca en NULL.
alter table public.works
  add column if not exists epocas text[] not null default '{}'::text[];

comment on column public.works.epocas is
  'Epocas de la obra (0..n), claves de la lista cerrada de works_epocas_check. Separada del genero (SCENAIA-007).';

-- 2. Lista cerrada. Cualquier clave fuera de la lista, en mayusculas, vacia o
-- NULL dentro del array hace fallar la escritura (23514): una errata en una
-- carga masiva no puede dejar una epoca que ningun filtro encontraria.
-- Ampliar la lista exige una migracion nueva, y por tanto una decision expresa.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'works_epocas_check' and conrelid = 'public.works'::regclass
  ) then
    alter table public.works add constraint works_epocas_check check (
      epocas <@ array['grecolatino','medieval','renacimiento','siglo_de_oro','barroco',
                      'isabelino','neoclasico','romanticismo','realismo_naturalismo',
                      'vanguardias','posguerra','contemporaneo']::text[]
    );
  end if;
end
$$;

comment on constraint works_epocas_check on public.works is
  'Lista cerrada de epocas (SCENAIA-007, §4.7). Ampliarla exige migracion.';

-- 3. Indice GIN con la clase de operadores por defecto para arrays
-- (array_ops): sirve a && ("pertenece a alguna de estas epocas") y a @>.
create index if not exists works_epocas_gin_idx
  on public.works using gin (epocas);

comment on index public.works_epocas_gin_idx is
  'GIN sobre works.epocas para el filtro por solapamiento (SCENAIA-007).';

-- 4. Relleno (acta §4.1 y §4.7). Las 10 obras del Siglo de Oro de los lotes
-- 001 (Calderon) y 002 (Lope), identificadas por su id tras una consulta de
-- solo lectura del 2026-09-29, reciben {siglo_de_oro, barroco}. Incluye
-- anadir barroco a El alcalde de Zalamea, decidido por Direccion. Ninguna otra
-- obra recibe epoca: Teresa's Ecstasy queda en '{}' hasta que su titular la
-- edite. Si no se actualizan exactamente 10 filas, la migracion entera aborta.
--
-- works_updated_at se desactiva solo durante el relleno y dentro de esta misma
-- transaccion: asignar la epoca no es una edicion de la obra, y updated_at (y
-- con el, la huella de las demas columnas) debe quedar intacto.
alter table public.works disable trigger works_updated_at;

do $$
declare
  n integer;
begin
  update public.works
     set epocas = array['siglo_de_oro','barroco']::text[]
   where id in (
     '2f7a12a0-9a50-47e7-b87d-f1dd8ee7da33', -- Casa con dos puertas mala es de guardar
     '3a06cfdf-78cc-45de-a078-513a27b9b5a2', -- El alcalde de Zalamea
     'a47b87c4-3cf6-4eea-9c1f-2dd9f86932c8', -- El caballero de Olmedo
     'f531ebd7-14f5-46d3-b9a6-61a7068ef9c9', -- El gran teatro del mundo
     'ea4abd51-2956-406a-a524-b56c7c5a3353', -- El perro del hortelano
     '4ff1e163-30ea-4a05-b3ca-35b06823e3c9', -- Fuente Ovejuna
     '2f5de386-85e4-4659-8d69-151e92cf94b6', -- La dama boba
     'e580a304-184f-4b6c-8365-cb34c6a29229', -- La dama duende
     '4bfbe073-a590-4974-8dca-95d26187d76a', -- La vida es sueño
     '7bdcd0d5-7ea5-4976-a370-396e8729c1f7'  -- Peribáñez y el Comendador de Ocaña
   );
  get diagnostics n = row_count;
  if n <> 10 then
    raise exception 'SCENAIA-007: el relleno debia actualizar 10 obras y actualizo %', n;
  end if;
end
$$;

alter table public.works enable trigger works_updated_at;
