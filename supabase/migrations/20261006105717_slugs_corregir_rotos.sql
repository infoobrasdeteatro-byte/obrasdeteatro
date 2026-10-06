-- Slugs: corregir los 18 rotos por el bug del orden LOWER/REGEXP_REPLACE.
--
-- REQUIERE 20261006120000_slugs_normalizar_en_orden (public.slugificar).
--
-- Qué corrige (decisión de Dirección, revisión del PR #59, 2026-10-06):
--   - los 12 visibles al público: 11 perfiles y la obra «Teresa's Ecstasy»;
--   - 6 perfiles no visibles con nombre real.
-- Qué NO toca: las 14 cuentas con nombres aleatorios, las obras de biblioteca
-- con el autor como sufijo, reneebausson, begonyaplaza, julia, los
-- usuario-xxxx de identidades extinguidas y biblioteca-oficial.
--
-- CÓMO. Cada fila se busca POR ID, nunca por slug. El slug nuevo se calcula
-- igual que los triggers: public.slugificar() sobre el nombre ACTUAL
-- (perfiles: nombre artístico o, si no hay, nombre; obras: título), con
-- sufijo numérico si colisiona. Las filas se procesan en el orden de la
-- lista, así que de las dos «Martina Ferreyra» la primera se queda
-- martina-ferreyra y la segunda martina-ferreyra-1.
--
-- TODO O NADA. La migración aborta entera (y no cambia nada) si:
--   - algún id no existe o está borrado;
--   - el slug actual de una fila ya no es el roto esperado (alguien lo cambió);
--   - el slug calculado no coincide con el esperado. Ese esperado es el que
--     usan las redirecciones 308 de next.config.ts: si el nombre cambiara
--     entre hoy y la aplicación, las redirecciones apuntarían a una URL que
--     no existe, y es preferible parar y revisar.

do $$
declare
  f         record;
  nombre    text;
  base_slug text;
  candidate text;
  counter   int;
  filas     int;
begin
  for f in
    select * from (values
      -- Visibles: obra
      (1,  'works',    '485e7820-1dfe-484f-a6f3-a06247ff7457'::uuid, '-eresa-s-cstasy',          'teresas-ecstasy'),
      -- Visibles: perfiles
      (2,  'profiles', '65a234c3-9b36-499f-9f7b-5018634179c1'::uuid, '-gostina-amilo-e-uca',     'agostina-camilo-de-luca'),
      (3,  'profiles', 'b335f960-ce86-4127-b7ff-117e4aa31de5'::uuid, '-lexander',                'alexander'),
      (4,  'profiles', '0199669f-ee4f-4a45-812c-725e979dd89c'::uuid, '-lfredo-allina',           'alfredo-vallina'),
      (5,  'profiles', '792d02c2-2dfd-4743-9cac-bdb0a444f217'::uuid, '-laudio-abriel-e-eta',     'claudio-de-seta'),
      (6,  'profiles', 'c419e095-c58d-4c56-857a-922466934d97'::uuid, '-abian-duardo-afael',      'fabian-eduardo-rafael'),
      (7,  'profiles', '763050be-10be-4688-8e97-1d4fc21dd9e4'::uuid, '-tima-attaoui',            'fatima'),
      (8,  'profiles', 'baa80d94-e82e-4e61-9915-c202ed1b76f2'::uuid, '-ctor-zar',                'hector'),
      (9,  'profiles', '03ec0296-33fe-414b-b1fd-e0d91650dff2'::uuid, '-linca-lian',              'ilinca-ilian'),
      (10, 'profiles', '9b910114-eb3c-450d-bf33-4dd1cd28897b'::uuid, '-ulio-vicente-luparello',  'julio-vicente-luparello'),
      (11, 'profiles', '9f5b62fa-24cc-41d3-ba83-ea484e3299c5'::uuid, '-agdalena-el-n-ojas',      'magdalena-belen-rojas'),
      (12, 'profiles', 'b05b13ba-de74-45b2-8479-0867a31b3561'::uuid, '-ofy',                     'sofy'),
      -- No visibles con nombre real
      (13, 'profiles', '0085ae82-d906-46e1-a2cc-78eba91b0611'::uuid, '-lfredo',                  'alfredo'),
      (14, 'profiles', '0365133a-6691-4615-9204-30dc627073fd'::uuid, '-anna-ichelle',            'danna-michelle'),
      (15, 'profiles', 'c676f371-7cfc-479d-8d5c-7f21eb814b19'::uuid, '-iana',                    'diana'),
      (16, 'profiles', '1266dc75-a092-45cc-9d60-a49a0d7a5156'::uuid, '-ulieth',                  'julieth'),
      (17, 'profiles', '8f4eb719-5e71-42fb-a2fb-aeb09aac00c3'::uuid, '-artina-erreyra',          'martina-ferreyra'),
      (18, 'profiles', '20ed59f3-a696-40cb-a203-cd67392a52bf'::uuid, '-artina-erreyra-1',        'martina-ferreyra-1')
    ) as v(orden, tabla, id, slug_antiguo, slug_esperado)
    order by orden
  loop
    -- 1. La fila existe (y no está borrada) y conserva el slug roto esperado.
    if f.tabla = 'works' then
      select trim(w.title) into nombre
      from public.works w
      where w.id = f.id and w.deleted_at is null and w.slug = f.slug_antiguo
      for update;
    else
      select coalesce(nullif(trim(p.nombre_artistico), ''), trim(p.nombre)) into nombre
      from public.profiles p
      where p.id = f.id and p.deleted_at is null and p.slug = f.slug_antiguo
      for update;
    end if;

    if not found then
      raise exception 'slugs: % % no existe, está borrado o su slug ya no es «%»',
        f.tabla, f.id, f.slug_antiguo;
    end if;

    -- 2. Slug nuevo, con la misma regla y el mismo sufijo que los triggers.
    base_slug := public.slugificar(nombre);
    if base_slug = '' then base_slug := f.id::text; end if;

    candidate := base_slug;
    counter   := 0;
    loop
      if f.tabla = 'works' then
        exit when not exists (
          select 1 from public.works
          where slug = candidate and id <> f.id and deleted_at is null
        );
      else
        exit when not exists (
          select 1 from public.profiles
          where slug = candidate and id <> f.id and deleted_at is null
        );
      end if;
      counter   := counter + 1;
      candidate := base_slug || '-' || counter;
    end loop;

    -- 3. Debe ser exactamente el que esperan las redirecciones.
    if candidate <> f.slug_esperado then
      raise exception 'slugs: % % daría «%» y se esperaba «%» (revisar next.config.ts)',
        f.tabla, f.id, candidate, f.slug_esperado;
    end if;

    -- 4. Actualización por id.
    if f.tabla = 'works' then
      update public.works set slug = candidate where id = f.id;
    else
      update public.profiles set slug = candidate where id = f.id;
    end if;

    get diagnostics filas = row_count;
    if filas <> 1 then
      raise exception 'slugs: % % actualizó % filas, se esperaba 1', f.tabla, f.id, filas;
    end if;
  end loop;
end;
$$;
