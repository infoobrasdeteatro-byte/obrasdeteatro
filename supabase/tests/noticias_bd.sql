-- Test de la base de datos del módulo Noticias (migraciones 20261002170100 a
-- 20261002170500).
--
-- Cómo se ejecuta: pegar el bloque entero en el SQL editor de Supabase (o
-- ejecutarlo con execute_sql) DESPUÉS de aplicar las cinco migraciones. No
-- deja datos: termina SIEMPRE con una excepción, y eso deshace todo lo que ha
-- hecho (también lo que haga caducar_noticias_candidatas() con candidatas
-- reales).
--   - Si todo va bien, el error dice:  NOTICIAS_OK: <casos superados>
--   - Si algo falla, el error dice:    NOTICIAS_FALLO: <caso> ...
--
-- Sujetos: el primer perfil con rol admin o moderator, un perfil sin roles,
-- una fuente activa y una inactiva. Las URL de prueba van al dominio
-- reservado test.invalid con un sufijo aleatorio.
--
-- Precondición: que hoy (hora de Madrid) no se hayan publicado ya 3 noticias;
-- si las hay, el test lo dice y hay que repetirlo otro día.

do $test$
declare
  adm uuid;
  usr uuid;
  f_act uuid;
  f_inact uuid;
  suf text := replace(gen_random_uuid()::text, '-', '');
  base text;
  id_serv uuid;
  id_inact uuid;
  id_vieja uuid;
  ids_manual uuid[] := '{}';
  id_tmp uuid;
  c_hoy integer;
  plazas integer;
  i integer;
  n integer;
  v_estado text;
  v_txt text;
  v_pub timestamptz;
  v_rev uuid;
  v_ret timestamptz;
  ok text := '';
begin
  base := 'https://test.invalid/noticias/';

  select profile_id into adm from public.profile_roles where role in ('admin', 'moderator') limit 1;
  select p.id into usr from public.profiles p
  where not exists (select 1 from public.profile_roles r where r.profile_id = p.id)
  limit 1;
  select id into f_act from public.noticias_fuentes where activa limit 1;
  select f.id into f_inact from public.noticias_fuentes f
  where not f.activa
    and not exists (select 1 from public.noticias n where n.fuente_id = f.id and n.estado = 'publicada')
  limit 1;
  if adm is null or usr is null or f_act is null or f_inact is null then
    raise exception 'NOTICIAS_FALLO: faltan sujetos (moderador %, usuario %, fuente activa %, fuente inactiva %)', adm, usr, f_act, f_inact;
  end if;

  select count(*) into c_hoy from public.noticias
  where publicado_at is not null
    and (publicado_at at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date;
  if c_hoy >= 3 then
    raise exception 'NOTICIAS_FALLO: precondición: hoy ya hay % publicaciones; repetir el test otro día', c_hoy;
  end if;
  plazas := 3 - c_hoy;

  ---------------------------------------------------------------------------
  -- 1. Servicio sin sesión (clave de servicio del endpoint).
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  execute 'set local role service_role';

  insert into public.noticias
    (titular, resumen, categoria_id, pais_code, fuente_id, url_original,
     estado, origen, lote_importacion, publicado_at, revisado_por)
  values
    ('TEST servicio ' || suf, 'Resumen de prueba.', 'actualidad', 'ES', f_act,
     '  HTTPS://WWW.Test.invalid/noticias/servicio-' || suf || '/?utm_source=rss&id=7#arriba ',
     'publicada', 'make', 'TEST-' || suf, now(), adm)
  returning id, estado, publicado_at, revisado_por, url_original
    into id_serv, v_estado, v_pub, v_rev, v_txt;

  if v_estado <> 'candidata' or v_pub is not null or v_rev is not null then
    raise exception 'NOTICIAS_FALLO: 1a) el servicio pidió publicada y quedó % (publicado_at %, revisado_por %)', v_estado, v_pub, v_rev;
  end if;
  ok := ok || '1a servicio->candidata; ';

  if v_txt <> 'https://www.test.invalid/noticias/servicio-' || suf || '?id=7' then
    raise exception 'NOTICIAS_FALLO: 1b) URL mal normalizada: %', v_txt;
  end if;
  ok := ok || '1b URL normalizada; ';

  begin
    update public.noticias set estado = 'publicada' where id = id_serv;
    raise exception 'NOTICIAS_FALLO: 1c) el servicio cambió el estado';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'NOTICIAS_FALLO: 1c) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '1c servicio no cambia estado; ';

  execute 'reset role';

  ---------------------------------------------------------------------------
  -- 2. Usuario normal: no lee candidatas, fuentes ni registro; no inserta.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.noticias where id = id_serv;
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 2a) un usuario normal lee una candidata'; end if;
  ok := ok || '2a no lee candidatas; ';

  begin
    insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen)
    values ('TEST usuario', 'Resumen.', 'actualidad', 'ES', f_act, base || 'usuario-' || suf, 'manual');
    raise exception 'NOTICIAS_FALLO: 2b) un usuario normal insertó una noticia';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'NOTICIAS_FALLO: 2b) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '2b no inserta; ';

  select count(*) into n from public.noticias_fuentes;
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 2c) un usuario normal lee la tabla de fuentes (% filas)', n; end if;
  select count(*) into n from public.noticias_registro;
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 2d) un usuario normal lee el registro (% filas)', n; end if;
  ok := ok || '2c-d no lee fuentes ni registro; ';

  execute 'reset role';

  ---------------------------------------------------------------------------
  -- 3. Moderación.
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.noticias where id = id_serv;
  if n <> 1 then raise exception 'NOTICIAS_FALLO: 3a) moderación no ve la candidata'; end if;
  ok := ok || '3a moderación lee candidatas; ';

  -- Fuente inactiva: se puede proponer, no publicar.
  insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen)
  values ('TEST fuente inactiva ' || suf, 'Resumen.', 'estreno', 'MX', f_inact, base || 'inactiva-' || suf, 'manual')
  returning id into id_inact;
  begin
    update public.noticias set estado = 'publicada' where id = id_inact;
    raise exception 'NOTICIAS_FALLO: 3b) se publicó una noticia de fuente inactiva';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlerrm not like '%fuente no está activa%' then raise exception 'NOTICIAS_FALLO: 3b) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '3b fuente inactiva no publica; ';

  begin
    update public.noticias_fuentes set activa = true where id = f_inact;
    raise exception 'NOTICIAS_FALLO: 3c) se activó una fuente sin permiso';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '23514' then raise exception 'NOTICIAS_FALLO: 3c) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '3c fuente sin permiso no se activa; ';

  -- Publicar hasta el límite: la candidata del servicio y altas manuales.
  update public.noticias set estado = 'publicada' where id = id_serv
  returning estado, publicado_at, revisado_por into v_estado, v_pub, v_rev;
  if v_estado <> 'publicada' or v_pub is null or v_rev is distinct from adm then
    raise exception 'NOTICIAS_FALLO: 3d) publicación mal sellada (estado %, publicado_at %, revisado_por %)', v_estado, v_pub, v_rev;
  end if;
  for i in 2 .. plazas loop
    insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen, estado)
    values ('TEST manual ' || i || ' ' || suf, 'Resumen.', 'premio', 'AR', f_act, base || 'manual-' || i || '-' || suf, 'manual', 'publicada')
    returning id, estado into id_tmp, v_estado;
    if v_estado <> 'publicada' then
      raise exception 'NOTICIAS_FALLO: 3d) el alta manual de moderación no quedó publicada (%)', v_estado;
    end if;
    ids_manual := ids_manual || id_tmp;
  end loop;
  ok := ok || '3d publica ' || plazas || ' (+' || c_hoy || ' previas) con sellos; ';

  begin
    insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen, estado)
    values ('TEST cuarta ' || suf, 'Resumen.', 'premio', 'AR', f_act, base || 'cuarta-' || suf, 'manual', 'publicada');
    raise exception 'NOTICIAS_FALLO: 3e) se publicó una cuarta noticia en el día';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlerrm not like 'Límite diario alcanzado%' then raise exception 'NOTICIAS_FALLO: 3e) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '3e la cuarta falla; ';

  -- URL duplicada: misma noticia por http, sin www, con barra final y utm.
  begin
    insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen)
    values ('TEST duplicada', 'Resumen.', 'actualidad', 'ES', f_act,
            'http://test.invalid/noticias/servicio-' || suf || '/?utm_medium=x&id=7', 'manual');
    raise exception 'NOTICIAS_FALLO: 3f) se aceptó una URL duplicada';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '23505' then raise exception 'NOTICIAS_FALLO: 3f) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '3f URL duplicada falla; ';

  begin
    update public.noticias set estado = 'retirada' where id = id_inact;
    raise exception 'NOTICIAS_FALLO: 3g) se retiró una candidata';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '23514' then raise exception 'NOTICIAS_FALLO: 3g) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '3g transición no permitida falla; ';

  begin
    insert into public.noticias_registro (evento, detalle) values ('error', '{}');
    raise exception 'NOTICIAS_FALLO: 3h) moderación escribió en el registro';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'NOTICIAS_FALLO: 3h) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '3h nadie escribe el registro desde la web; ';

  execute 'reset role';

  ---------------------------------------------------------------------------
  -- 4. Público (sin sesión).
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';

  select count(*) into n from public.noticias where estado <> 'publicada';
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 4a) el público ve % noticias no publicadas', n; end if;
  select count(*) into n from public.noticias where id = id_serv;
  if n <> 1 then raise exception 'NOTICIAS_FALLO: 4a) el público no ve una publicada'; end if;
  ok := ok || '4a público solo publicadas; ';

  select count(*) into n from public.noticias_fuentes;
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 4b) el público lee la tabla de fuentes'; end if;
  select count(*) into n from public.noticias_fuentes_publicas where id = f_act;
  if n <> 1 then raise exception 'NOTICIAS_FALLO: 4b) el público no ve la fuente activa en la vista'; end if;
  select count(*) into n from public.noticias_fuentes_publicas where id = f_inact;
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 4b) el público ve una fuente inactiva sin publicadas'; end if;
  ok := ok || '4b fuentes solo por la vista; ';

  begin
    insert into public.noticias_fuentes_publicas (nombre, dominio, pais_code) values ('x', 'x.invalid', 'ES');
    raise exception 'NOTICIAS_FALLO: 4c) el público insertó a través de la vista';
  exception when others then
    if sqlerrm like 'NOTICIAS_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'NOTICIAS_FALLO: 4c) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || '4c vista de solo lectura; ';

  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);

  select string_agg(column_name::text, ',' order by ordinal_position) into v_txt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'noticias_fuentes_publicas';
  if v_txt <> 'id,nombre,dominio,url_web,pais_code' then
    raise exception 'NOTICIAS_FALLO: 4d) columnas de la vista: %', v_txt;
  end if;
  ok := ok || '4d vista con 5 columnas; ';

  ---------------------------------------------------------------------------
  -- 5. Retirada (moderación).
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  update public.noticias set estado = 'retirada', motivo_retirada = 'TEST retirada'
  where id = id_serv
  returning estado, retirada_at into v_estado, v_ret;
  if v_estado <> 'retirada' or v_ret is null then
    raise exception 'NOTICIAS_FALLO: 5) retirada mal sellada (estado %, retirada_at %)', v_estado, v_ret;
  end if;
  ok := ok || '5 retirada sellada; ';

  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);

  ---------------------------------------------------------------------------
  -- 6. Caducidad de candidatas (lo que ejecuta el job de pg_cron).
  ---------------------------------------------------------------------------
  insert into public.noticias (titular, resumen, categoria_id, pais_code, fuente_id, url_original, origen, created_at)
  values ('TEST vieja ' || suf, 'Resumen.', 'actualidad', 'CL', f_act, base || 'vieja-' || suf, 'make', now() - interval '8 days')
  returning id into id_vieja;

  perform public.caducar_noticias_candidatas();

  select estado, motivo_descarte, revisado_por into v_estado, v_txt, v_rev from public.noticias where id = id_vieja;
  if v_estado <> 'descartada' or v_txt <> 'caducada' or v_rev is not null then
    raise exception 'NOTICIAS_FALLO: 6a) caducidad: estado %, motivo %, revisado_por %', v_estado, v_txt, v_rev;
  end if;
  select estado into v_estado from public.noticias where id = id_inact;
  if v_estado <> 'candidata' then
    raise exception 'NOTICIAS_FALLO: 6b) la caducidad descartó una candidata reciente';
  end if;
  select count(*) into n from cron.job
  where jobname = 'caducar-noticias-candidatas' and schedule = '30 3 * * *';
  if n <> 1 then raise exception 'NOTICIAS_FALLO: 6c) el job de pg_cron no está programado'; end if;
  ok := ok || '6 caducidad y job; ';

  ---------------------------------------------------------------------------
  -- 7. Registro: cada alta y cada cambio de estado deja su entrada.
  ---------------------------------------------------------------------------
  select string_agg(evento, ',' order by evento) into v_txt from public.noticias_registro where noticia_id = id_serv;
  if v_txt <> 'aprobada,importada,retirada' then
    raise exception 'NOTICIAS_FALLO: 7a) registro de la noticia del servicio: %', v_txt;
  end if;
  select count(*) into n from public.noticias_registro
  where noticia_id = id_serv and evento = 'aprobada' and actor_id = adm;
  if n <> 1 then raise exception 'NOTICIAS_FALLO: 7a) la aprobación no registra al moderador'; end if;

  foreach id_tmp in array ids_manual loop
    select string_agg(evento, ',' order by evento) into v_txt from public.noticias_registro where noticia_id = id_tmp;
    if v_txt <> 'alta_manual,aprobada' then
      raise exception 'NOTICIAS_FALLO: 7b) registro de un alta manual publicada: %', v_txt;
    end if;
  end loop;

  select string_agg(evento, ',' order by evento) into v_txt from public.noticias_registro where noticia_id = id_inact;
  if v_txt <> 'alta_manual' then
    raise exception 'NOTICIAS_FALLO: 7c) registro de la candidata de fuente inactiva: %', v_txt;
  end if;

  select string_agg(evento, ',' order by evento) into v_txt from public.noticias_registro where noticia_id = id_vieja;
  if v_txt <> 'descartada,importada' then
    raise exception 'NOTICIAS_FALLO: 7d) registro de la caducada: %', v_txt;
  end if;
  select count(*) into n from public.noticias_registro
  where noticia_id = id_vieja and evento = 'descartada' and detalle ->> 'motivo' = 'caducada' and actor_id is null;
  if n <> 1 then raise exception 'NOTICIAS_FALLO: 7d) la caducidad no registra el motivo'; end if;

  select count(*) into n from public.noticias_registro where url like '%cuarta-' || suf;
  if n <> 0 then raise exception 'NOTICIAS_FALLO: 7e) quedó registrada la publicación rechazada por el límite'; end if;
  ok := ok || '7 registro completo; ';

  raise exception 'NOTICIAS_OK: %', ok;
end $test$;
