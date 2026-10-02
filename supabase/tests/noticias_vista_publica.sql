-- Test de la migración noticias_vista_publica_y_sin_borrado (20261002172042).
--
-- Cómo se ejecuta: pegar el bloque entero en el SQL editor de Supabase (o
-- ejecutarlo con execute_sql) DESPUÉS de aplicar la migración. No deja datos:
-- termina SIEMPRE con una excepción, y eso deshace todo lo que ha hecho.
--   - Si todo va bien, el error dice:  VISTA_OK: <casos superados>
--   - Si algo falla, el error dice:    VISTA_FALLO: <caso> ...
--
-- Precondición: que hoy (hora de Madrid) queden plazas de publicación.

do $test$
declare
  adm uuid;
  f_act uuid;
  suf text := replace(gen_random_uuid()::text, '-', '');
  id_pub uuid;
  id_cand uuid;
  n integer;
  v_txt text;
  ok text := '';
begin
  select profile_id into adm from public.profile_roles where role in ('admin', 'moderator') limit 1;
  select id into f_act from public.noticias_fuentes where activa limit 1;
  if adm is null or f_act is null then
    raise exception 'VISTA_FALLO: faltan sujetos (moderador %, fuente activa %)', adm, f_act;
  end if;

  -- Como propietario de la base (sistema): una publicada con una categoría
  -- que después se desactiva, y una candidata.
  perform set_config('request.jwt.claims', '{}', true);
  insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen, estado)
  values ('TEST vista ' || suf, 'Resumen.', 'formacion', 'PE', f_act, 'https://test.invalid/vista/pub-' || suf, 'manual', 'publicada')
  returning id into id_pub;
  insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen)
  values ('TEST vista cand ' || suf, 'Resumen.', 'formacion', 'PE', f_act, 'https://test.invalid/vista/cand-' || suf, 'make')
  returning id into id_cand;
  update public.noticias_categorias set activo = false where id = 'formacion';

  -- 1. Columnas de la vista.
  select string_agg(column_name::text, ',' order by ordinal_position) into v_txt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'noticias_publicas';
  if v_txt <> 'id,titular,resumen,categoria_id,categoria_etiqueta,pais_code,fuente_nombre,fuente_dominio,fuente_url_web,url_original,fecha_original,publicado_at' then
    raise exception 'VISTA_FALLO: 1) columnas: %', v_txt;
  end if;
  ok := ok || '1 columnas; ';

  -- 2. Público: ve la publicada con la etiqueta de una categoría desactivada,
  --    no ve la candidata y no escribe a través de la vista.
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';

  select categoria_etiqueta into v_txt from public.noticias_publicas where id = id_pub;
  if v_txt is distinct from 'Formación' then
    raise exception 'VISTA_FALLO: 2a) etiqueta de categoría desactivada: %', v_txt;
  end if;
  select count(*) into n from public.noticias_publicas where id = id_cand;
  if n <> 0 then raise exception 'VISTA_FALLO: 2b) la vista muestra una candidata'; end if;
  begin
    update public.noticias_publicas set titular = 'x' where id = id_pub;
    raise exception 'VISTA_FALLO: 2c) el público modificó a través de la vista';
  exception when others then
    if sqlerrm like 'VISTA_FALLO%' then raise; end if;
    -- 42501 (sin privilegio) o 55000 (la vista, con joins, no es modificable):
    -- las dos son un rechazo.
    if sqlstate not in ('42501', '55000') then raise exception 'VISTA_FALLO: 2c) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '2 público lee la vista; ';

  execute 'reset role';

  -- 3. Moderación ya no borra; sigue pudiendo retirar.
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    delete from public.noticias where id = id_cand;
    raise exception 'VISTA_FALLO: 3a) moderación borró una noticia';
  exception when others then
    if sqlerrm like 'VISTA_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'VISTA_FALLO: 3a) error inesperado: %', sqlerrm; end if;
  end;
  update public.noticias set estado = 'retirada', motivo_retirada = 'TEST' where id = id_pub;
  select count(*) into n from public.noticias_publicas where id = id_pub;
  if n <> 0 then raise exception 'VISTA_FALLO: 3b) la retirada sigue en la vista'; end if;
  ok := ok || '3 sin borrado, retirada fuera de la vista; ';

  execute 'reset role';

  raise exception 'VISTA_OK: %', ok;
end $test$;
