-- Test de la migración profile_roles_solo_lectura_propia (20261002164941).
--
-- Cómo se ejecuta: pegar el bloque entero en el SQL editor de Supabase (o
-- ejecutarlo con execute_sql) DESPUÉS de aplicar la migración. No deja datos:
-- termina SIEMPRE con una excepción, y eso deshace todo lo que ha hecho.
--   - Si todo va bien, el error dice:  ROLES_OK: <casos superados>
--   - Si algo falla, el error dice:    ROLES_FALLO: <caso> ...
--
-- Sujetos: un perfil sin ningún rol y el primer admin existente. Al sujeto
-- sin rol se le da una fila 'editor' como propietario de la base, DENTRO de la
-- transacción, solo para comprobar que puede leer sus propias filas.

do $$
declare
  u uuid;
  adm uuid;
  n integer;
  ok text := '';
begin
  select p.id into u from public.profiles p
  where not exists (select 1 from public.profile_roles r where r.profile_id = p.id)
  limit 1;
  select profile_id into adm from public.profile_roles where role = 'admin' limit 1;
  if u is null or adm is null then
    raise exception 'ROLES_FALLO: faltan sujetos (perfil sin rol: %, admin: %)', u, adm;
  end if;

  insert into public.profile_roles (profile_id, role) values (u, 'editor');

  -- 1. Un usuario authenticated no puede darse roles, ni cambiarlos, ni borrarlos.
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.profile_roles (profile_id, role) values (u, 'admin');
    raise exception 'ROLES_FALLO: 1a) un usuario se dio el rol admin';
  exception when others then
    if sqlerrm like 'ROLES_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'ROLES_FALLO: 1a) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || 'insert rechazado; ';

  begin
    update public.profile_roles set role = 'admin' where profile_id = u;
    raise exception 'ROLES_FALLO: 1b) un usuario cambió su rol';
  exception when others then
    if sqlerrm like 'ROLES_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'ROLES_FALLO: 1b) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || 'update rechazado; ';

  begin
    delete from public.profile_roles where profile_id = u;
    raise exception 'ROLES_FALLO: 1c) un usuario borró su rol';
  exception when others then
    if sqlerrm like 'ROLES_FALLO%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'ROLES_FALLO: 1c) error inesperado: %', sqlerrm; end if;
  end;
  ok := ok || 'delete rechazado; ';

  if public.es_moderador() then
    raise exception 'ROLES_FALLO: 1d) es_moderador() es true para un usuario sin rol de moderación';
  end if;
  ok := ok || 'sin moderación; ';

  -- 2. Sigue leyendo sus propias filas.
  select count(*) into n from public.profile_roles where profile_id = u;
  if n <> 1 then raise exception 'ROLES_FALLO: 2) lee % filas propias (esperado 1)', n; end if;
  ok := ok || 'lectura propia; ';

  execute 'reset role';

  -- 3. El admin conserva el acceso a /admin/castings y /admin/convocatorias:
  --    es_moderador() para la RLS y el trigger, y la lectura de su rol para el
  --    guard de las páginas.
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  if not public.es_moderador() then
    raise exception 'ROLES_FALLO: 3a) es_moderador() es false para el admin';
  end if;
  select count(*) into n from public.profile_roles
  where profile_id = adm and role in ('admin', 'moderator');
  if n = 0 then raise exception 'ROLES_FALLO: 3b) el guard de /admin no ve el rol del admin'; end if;
  ok := ok || 'admin conserva acceso; ';

  execute 'reset role';

  raise exception 'ROLES_OK: %', ok;
end $$;
