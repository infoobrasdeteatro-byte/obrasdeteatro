-- Test de works.genre_normalizado (20260928193651, SCENAIA-006).
--
-- Cómo se ejecuta: pegar el bloque entero en el SQL editor de Supabase (o
-- ejecutarlo con execute_sql). No deja datos: termina SIEMPRE con una
-- excepción, y eso deshace todo lo que ha hecho.
--   - Si todo va bien, el error dice:  GENERO_OK: <casos superados>
--   - Si algo falla, el error dice:    GENERO_FALLO: <caso> ...
--
-- Comprueba:
--   1. Que todas las filas guardadas siguen cumpliendo la expresión de la
--      columna. Si el diccionario de unaccent cambiara (actualización de la
--      extensión o de PostgreSQL), las filas antiguas no se recalcularían
--      solas y este caso fallaría: habría que regenerar la columna
--      (drop + add) y reindexar works_genre_normalizado_trgm_idx.
--   2. La normalización: minúsculas, sin acentos, ñ -> n, ü -> u; nulo -> ''.
--   3. Que un alta y una edición como las de los formularios recalculan la
--      columna sin enviarla.
--   4. Que PostgreSQL rechaza dar valor a la columna (428C9).

do $$
declare
  n integer;
  inst uuid;
  nueva uuid;
  v text;
  ok text := '';
begin
  -- 1
  select count(*) into n from public.works
   where genre_normalizado is distinct from lower(public.f_unaccent(coalesce(genre, '')));
  if n <> 0 then
    raise exception 'GENERO_FALLO: % filas no cumplen la expresión: regenerar la columna y reindexar', n;
  end if;
  ok := ok || ' filas_cumplen';

  -- 2
  if lower(public.f_unaccent('Teatro CLÁSICO ÁÉÍÓÚ Ñandú Pingüino')) <> 'teatro clasico aeiou nandu pinguino' then
    raise exception 'GENERO_FALLO: normalización: %', lower(public.f_unaccent('Teatro CLÁSICO ÁÉÍÓÚ Ñandú Pingüino'));
  end if;
  if public.f_unaccent(null) is not null then
    raise exception 'GENERO_FALLO: f_unaccent(null) debería ser null (strict)';
  end if;
  ok := ok || ' normalizacion';

  -- 3
  select institution_id into inst from public.works where institution_id is not null limit 1;
  if inst is null then
    raise exception 'GENERO_FALLO: no hay ninguna obra de institución para usar como dueña';
  end if;
  insert into public.works (institution_id, title, genre, is_published)
  values (inst, 'Prueba genero_normalizado', 'Ópera Cómica', false)
  returning id, genre_normalizado into nueva, v;
  if v <> 'opera comica' then
    raise exception 'GENERO_FALLO: alta: %', v;
  end if;
  update public.works set genre = 'Zarzuela' where id = nueva returning genre_normalizado into v;
  if v <> 'zarzuela' then
    raise exception 'GENERO_FALLO: edición: %', v;
  end if;
  update public.works set genre = null where id = nueva returning genre_normalizado into v;
  if v <> '' then
    raise exception 'GENERO_FALLO: género nulo debería dar cadena vacía: %', v;
  end if;
  ok := ok || ' alta_y_edicion';

  -- 4
  begin
    update public.works set genre_normalizado = 'otra cosa' where id = nueva;
    raise exception 'GENERO_FALLO: se aceptó un valor en la columna generada';
  exception when sqlstate '428C9' then
    ok := ok || ' rechaza_valor';
  end;

  raise exception 'GENERO_OK:%', ok;
end
$$;
