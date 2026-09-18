-- Test del cupo mensual FIJO de convocatorias (20260918143309).
--
-- Cómo se ejecuta: pegar el bloque entero en el SQL editor de Supabase (o
-- ejecutarlo con execute_sql). No deja datos: termina SIEMPRE con una
-- excepción, y eso deshace todo lo que ha hecho.
--   - Si todo va bien, el error dice:  CUPO_OK: <casos superados>
--   - Si algo falla, el error dice:    CUPO_FALLO: <caso> ...
--
-- Usa un perfil gratuito real como sujeto y le da rol de moderador DENTRO de
-- la transacción, porque solo un moderador puede fijar 'publicado'.

do $$
declare
  p uuid;
  c1 uuid; c2 uuid; c3 uuid; c_extra uuid;
  n integer;
  ok text := '';
begin
  select id into p from public.profiles where plan = 'gratuito' limit 1;
  if p is null then
    raise exception 'CUPO_FALLO: no hay ningún perfil gratuito para usar como sujeto';
  end if;

  insert into public.profile_roles (profile_id, role) values (p, 'moderator');
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);

  -- Punto de partida: las 3 plazas del mes, gastadas.
  insert into public.calls (profile_id, title, estado) values (p, 'TEST cupo 1', 'publicado') returning id into c1;
  insert into public.calls (profile_id, title, estado) values (p, 'TEST cupo 2', 'publicado') returning id into c2;
  insert into public.calls (profile_id, title, estado) values (p, 'TEST cupo 3', 'publicado') returning id into c3;

  n := public.mis_convocatorias_publicadas_en_mes();
  if n <> 3 then raise exception 'CUPO_FALLO: recuento inicial % (esperado 3)', n; end if;
  ok := ok || 'recuento=3; ';

  -- La 4.ª del mes se rechaza.
  begin
    insert into public.calls (profile_id, title, estado) values (p, 'TEST cupo 4', 'publicado');
    raise exception 'CUPO_FALLO: la 4.ª publicación del mes se aceptó';
  exception when others then
    if sqlerrm like 'CUPO_FALLO%' then raise; end if;
    if sqlerrm not like '%permite 3 convocatorias%' then
      raise exception 'CUPO_FALLO: error inesperado (no es el del cupo): %', sqlerrm;
    end if;
  end;
  ok := ok || '4a rechazada; ';

  -- A) Cerrar una NO libera plaza (el fallo original).
  update public.calls set estado = 'cerrado' where id = c1;
  begin
    insert into public.calls (profile_id, title, estado) values (p, 'TEST tras cerrar', 'publicado');
    raise exception 'CUPO_FALLO: A) cerrar una convocatoria liberó plaza';
  exception when others then
    if sqlerrm like 'CUPO_FALLO%' then raise; end if;
    if sqlerrm not like '%permite 3 convocatorias%' then
      raise exception 'CUPO_FALLO: error inesperado (no es el del cupo): %', sqlerrm;
    end if;
  end;
  ok := ok || 'A cerrar no libera; ';

  -- B) Borrarla (DELETE físico) NO libera plaza.
  delete from public.calls where id = c2;
  begin
    insert into public.calls (profile_id, title, estado) values (p, 'TEST tras borrar', 'publicado');
    raise exception 'CUPO_FALLO: B) borrar una convocatoria liberó plaza';
  exception when others then
    if sqlerrm like 'CUPO_FALLO%' then raise; end if;
    if sqlerrm not like '%permite 3 convocatorias%' then
      raise exception 'CUPO_FALLO: error inesperado (no es el del cupo): %', sqlerrm;
    end if;
  end;
  ok := ok || 'B borrar no libera; ';

  -- C) Vaciar fecha_publicacion (UPDATE que no dispara el trigger) NO libera plaza.
  update public.calls set fecha_publicacion = null where id = c3;
  begin
    insert into public.calls (profile_id, title, estado) values (p, 'TEST tras vaciar fecha', 'publicado');
    raise exception 'CUPO_FALLO: C) vaciar fecha_publicacion liberó plaza';
  exception when others then
    if sqlerrm like 'CUPO_FALLO%' then raise; end if;
    if sqlerrm not like '%permite 3 convocatorias%' then
      raise exception 'CUPO_FALLO: error inesperado (no es el del cupo): %', sqlerrm;
    end if;
  end;
  ok := ok || 'C fecha no libera; ';

  -- D) Republicar una que ya consumió cupo este mes: se permite y no consume otra.
  update public.calls set estado = 'publicado' where id = c1;
  n := public.mis_convocatorias_publicadas_en_mes();
  if n <> 3 then raise exception 'CUPO_FALLO: D) republicar cambió el recuento a % (esperado 3)', n; end if;
  ok := ok || 'D republicar no consume; ';

  -- E) Mes NATURAL, no ventana móvil: una publicación de 1 segundo antes del
  --    día 1 ya no cuenta (en una ventana de 30 días sí contaría).
  update public.calls_publicaciones
     set publicada_at = date_trunc('month', now()) - interval '1 second'
   where call_id = c1;
  n := public.mis_convocatorias_publicadas_en_mes();
  if n <> 2 then raise exception 'CUPO_FALLO: E) una publicación del mes anterior sigue contando (recuento %)', n; end if;
  insert into public.calls (profile_id, title, estado) values (p, 'TEST plaza del mes', 'publicado') returning id into c_extra;
  ok := ok || 'E mes natural; ';

  -- F) Premium no tiene techo.
  update public.profiles set plan = 'premium' where id = p;
  insert into public.calls (profile_id, title, estado) values (p, 'TEST premium', 'publicado');
  ok := ok || 'F premium sin techo; ';

  -- G) El registro no es accesible para clientes.
  execute 'set local role authenticated';
  select count(*) into n from public.calls_publicaciones;
  if n <> 0 then raise exception 'CUPO_FALLO: G) authenticated puede leer calls_publicaciones (% filas)', n; end if;
  begin
    perform public.convocatorias_publicadas_en_mes(p);
    raise exception 'CUPO_FALLO: G) authenticated puede consultar el recuento de cualquier perfil';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';
  ok := ok || 'G registro privado; ';

  raise exception 'CUPO_OK: %', ok;
end $$;
