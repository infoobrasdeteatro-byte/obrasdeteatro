-- Prueba de la escalera del Elenco Fundador (20261031120000 + 20261031150000).
--
-- Cómo se ejecuta: pegar el script entero en el SQL editor de Supabase.
-- No deja nada guardado: todo va dentro de BEGIN … ROLLBACK y, además, el
-- bloque termina SIEMPRE con una excepción, que aborta la transacción.
--   - Si todo va bien, el error dice:  ELENCO_OK: <resumen>
--   - Si algo falla, el error dice:    ELENCO_FALLO: <caso> …
-- Ningún correo sale: las recompensas creadas aquí desaparecen con el ROLLBACK
-- antes de que el cron de las 06:00 pueda verlas.
--
-- Qué hace, dentro de la transacción:
--   1. Crea una invitación de prueba (toma el primer número libre) y la acepta
--      con un perfil existente, por la misma función que usa la web.
--   2. Atribuye 17 perfiles existentes a ese fundador y los va volviendo
--      «organización con perfil completo» (3 puntos cada uno).
--   3. Comprueba en cada paso que los escalones 5, 10, 25 y 50 se otorgan
--      justo al llegar y una sola vez, también al repetir la revisión diaria.

begin;

do $$
declare
  f        uuid;                 -- perfil del fundador de prueba
  inv      record;
  rs       uuid[];
  i        integer;
  n        integer;
  esperado integer[];
  obtenido integer[];
  pts      integer;
  ok       text := '';
begin
  -- 1 ─ Fundador de prueba
  select p.id into f from public.profiles p
  where p.deleted_at is null and not exists (select 1 from public.elenco_fundadores x where x.aceptada_por = p.id)
  order by p.created_at limit 1;
  if f is null then raise exception 'ELENCO_FALLO: no hay ningún perfil para usar como fundador'; end if;

  select * into inv from public.elenco_crear_invitacion('PRUEBA ESCALERA', 'persona', 'Interpretación', '+34 600 000 000', '', '');
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', f::text, true);
  if public.aceptar_invitacion_elenco(inv.token) <> 'ok' then
    raise exception 'ELENCO_FALLO: no se pudo aceptar la invitación de prueba';
  end if;
  ok := ok || format('fundador nº %s; ', lpad(inv.numero::text, 3, '0'));

  -- 2 ─ 17 colegas de prueba (perfiles existentes, sin atribución previa)
  select array_agg(id) into rs from (
    select p.id from public.profiles p
    where p.deleted_at is null and p.id <> f
      and not exists (select 1 from public.elenco_referidos r where r.profile_id = p.id)
      and not exists (select 1 from public.elenco_fundadores x where x.aceptada_por = p.id)
    order by p.created_at limit 17
  ) t;
  if coalesce(array_length(rs, 1), 0) < 17 then
    raise exception 'ELENCO_FALLO: hacen falta 17 perfiles libres y hay %', coalesce(array_length(rs, 1), 0);
  end if;
  insert into public.elenco_referidos (profile_id, fundador_id) select unnest(rs), inv.id;

  if public.elenco_puntos(inv.id) <> 0 then
    raise exception 'ELENCO_FALLO: los colegas recién atribuidos ya suman % puntos', public.elenco_puntos(inv.id);
  end if;

  -- 3 ─ Activar colegas uno a uno y comprobar los escalones en cada umbral
  for i in 1..17 loop
    update public.profiles
    set tipo_perfil = 'compania',
        avatar_url = coalesce(nullif(btrim(avatar_url), ''), 'https://prueba.invalid/logo.png'),
        bio = coalesce(nullif(btrim(bio), ''), 'Prueba'),
        ciudad = coalesce(nullif(btrim(ciudad), ''), 'Prueba')
    where id = rs[i];

    pts := public.elenco_puntos(inv.id);
    esperado := array(select e from unnest(array[5, 10, 25, 50]) e where e <= pts order by e);
    obtenido := array(select escalon::int from public.elenco_recompensas where fundador_id = inv.id order by escalon);
    if obtenido is distinct from esperado then
      raise exception 'ELENCO_FALLO: con % puntos se esperaban los escalones % y hay %', pts, esperado, obtenido;
    end if;
  end loop;
  if pts <> 51 then raise exception 'ELENCO_FALLO: se esperaban 51 puntos y hay %', pts; end if;
  ok := ok || format('%s puntos, escalones %s al momento (trigger); ', pts, obtenido);

  -- 4 ─ Repetir la revisión no duplica nada
  perform public.elenco_revisar(inv.id);
  perform public.elenco_revisar_todos();
  select count(*) into n from public.elenco_recompensas where fundador_id = inv.id;
  if n <> 4 then raise exception 'ELENCO_FALLO: tras repetir la revisión hay % recompensas (se esperaban 4)', n; end if;
  select count(*) into n from (select escalon from public.elenco_recompensas where fundador_id = inv.id group by escalon having count(*) > 1) d;
  if n <> 0 then raise exception 'ELENCO_FALLO: hay escalones duplicados'; end if;
  ok := ok || 'revisión repetida sin duplicados; ';

  -- 5 ─ Tramos: uno por escalón, sin solaparse; el de 50 es para siempre
  select count(*) into n from public.elenco_cortesias a join public.elenco_cortesias b
    on a.profile_id = b.profile_id and a.id < b.id and a.desde < b.hasta and b.desde < a.hasta
  where a.profile_id = f;
  if n <> 0 then raise exception 'ELENCO_FALLO: hay % tramos solapados', n; end if;
  if not exists (select 1 from public.elenco_cortesias where profile_id = f and motivo = 'escalon_50' and hasta = 'infinity') then
    raise exception 'ELENCO_FALLO: falta el tramo para siempre del escalón 50';
  end if;
  ok := ok || format('plan del fundador ahora: %s; ', (select plan from public.profiles where id = f));

  raise exception 'ELENCO_OK: %', ok;
end $$;

rollback;
