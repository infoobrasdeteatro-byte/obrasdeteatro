-- Test de works.epocas (20260929105531, SCENAIA-007).
--
-- Cómo se ejecuta: pegar el bloque entero en el SQL editor de Supabase (o
-- ejecutarlo con execute_sql). No deja datos: termina SIEMPRE con una
-- excepción, y eso deshace todo lo que ha hecho, incluida la reversión del
-- caso 5.
--   - Si todo va bien, el error dice:  EPOCAS_OK: <casos superados>
--   - Si algo falla, el error dice:    EPOCAS_FALLO: <caso> ...
--
-- Comprueba:
--   1. Que todas las filas guardadas cumplen la lista cerrada y ninguna es NULL.
--   2. Que un alta como la de los formularios (sin nombrar la columna) deja
--      epocas en '{}', y que una edición como la de los formularios no la toca.
--   3. Que la lista acepta claves válidas: una, varias y ninguna.
--   4. Que la restricción rechaza (23514): una clave fuera de la lista, una
--      clave en mayúsculas, una cadena vacía dentro del array y un NULL dentro
--      del array; y que un valor NULL se rechaza por NOT NULL (23502).
--   5. Que la reversión (supabase/reversiones/20260929105531_works_epocas_inversa.sql)
--      retira índice, restricción y columna sin tocar las obras.

do $$
declare
  n integer;
  total integer;
  inst uuid;
  nueva uuid;
  v text[];
  ok text := '';
begin
  -- 1
  select count(*) into n from public.works
   where epocas is null
      or not (epocas <@ array['grecolatino','medieval','renacimiento','siglo_de_oro','barroco',
                              'isabelino','neoclasico','romanticismo','realismo_naturalismo',
                              'vanguardias','posguerra','contemporaneo']::text[]);
  if n <> 0 then
    raise exception 'EPOCAS_FALLO: % filas fuera de la lista cerrada o nulas', n;
  end if;
  ok := ok || ' filas_cumplen';

  -- 2
  select institution_id into inst from public.works where institution_id is not null limit 1;
  if inst is null then
    raise exception 'EPOCAS_FALLO: no hay ninguna obra de institución para usar como dueña';
  end if;
  insert into public.works (institution_id, title, genre, is_published)
  values (inst, 'Prueba epocas', 'Comedia', false)
  returning id, epocas into nueva, v;
  if v is distinct from '{}'::text[] then
    raise exception 'EPOCAS_FALLO: alta sin la columna debería dar {}: %', v;
  end if;
  update public.works set genre = 'Drama', updated_at = now() where id = nueva returning epocas into v;
  if v is distinct from '{}'::text[] then
    raise exception 'EPOCAS_FALLO: edición sin la columna la cambió: %', v;
  end if;
  ok := ok || ' valor_por_defecto';

  -- 3
  update public.works set epocas = '{siglo_de_oro}' where id = nueva;
  update public.works set epocas = '{grecolatino,renacimiento,siglo_de_oro,barroco,isabelino,neoclasico}' where id = nueva;
  update public.works set epocas = '{contemporaneo}' where id = nueva;
  update public.works set epocas = '{}' where id = nueva;
  ok := ok || ' acepta_validas';

  -- 4
  begin
    update public.works set epocas = array['siglo_de_oro', 'rococo'] where id = nueva;
    raise exception 'EPOCAS_FALLO: se aceptó una clave fuera de la lista';
  exception when check_violation then
    ok := ok || ' rechaza_fuera_de_lista';
  end;
  begin
    update public.works set epocas = array['Siglo_de_oro'] where id = nueva;
    raise exception 'EPOCAS_FALLO: se aceptó una clave en mayúsculas';
  exception when check_violation then
    ok := ok || ' rechaza_mayusculas';
  end;
  begin
    update public.works set epocas = array['barroco', ''] where id = nueva;
    raise exception 'EPOCAS_FALLO: se aceptó una cadena vacía dentro del array';
  exception when check_violation then
    ok := ok || ' rechaza_cadena_vacia';
  end;
  begin
    update public.works set epocas = array['barroco', null] where id = nueva;
    raise exception 'EPOCAS_FALLO: se aceptó un NULL dentro del array';
  exception when check_violation then
    ok := ok || ' rechaza_null_en_array';
  end;
  begin
    update public.works set epocas = null where id = nueva;
    raise exception 'EPOCAS_FALLO: se aceptó epocas = NULL';
  exception when not_null_violation then
    ok := ok || ' rechaza_null';
  end;

  -- 5
  delete from public.works where id = nueva;
  select count(*) into total from public.works;
  drop index if exists public.works_epocas_gin_idx;
  alter table public.works drop constraint if exists works_epocas_check;
  alter table public.works drop column if exists epocas;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'works' and column_name = 'epocas')
     or exists (select 1 from pg_constraint where conname = 'works_epocas_check')
     or exists (select 1 from pg_indexes where indexname = 'works_epocas_gin_idx') then
    raise exception 'EPOCAS_FALLO: la reversión dejó restos';
  end if;
  select count(*) into n from public.works;
  if n <> total then
    raise exception 'EPOCAS_FALLO: la reversión cambió el número de obras: % -> %', total, n;
  end if;
  ok := ok || ' inversa';

  raise exception 'EPOCAS_OK:%', ok;
end
$$;
