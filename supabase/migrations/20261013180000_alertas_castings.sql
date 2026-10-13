-- Alertas de castings (planes de pago), en el mismo correo que las de
-- convocatorias.
--
-- 1. castings.pais pasa a ser uno de los 20 países del ámbito (el formulario
--    ya ofrece solo esa lista). Se guarda el NOMBRE, como hasta ahora, para que
--    buscar_castings_publicos y paises_con_castings sigan igual.
-- 2. castings.publicado_at: cuándo se publicó por primera vez. Lo pone un
--    trigger; nadie puede escribirlo a mano. El envío de alertas busca los
--    castings publicados desde el último aviso.
-- 3. alertas_convocatorias gana las columnas castings_*: activar/desactivar
--    las de castings por separado y sus filtros (todos opcionales).

-- 1. País de la lista.
alter table public.castings
  add constraint castings_pais_check check (pais is null or pais = any (array[
    'España','Argentina','México','Colombia','Chile','Perú','Uruguay','Paraguay','Bolivia','Ecuador',
    'Venezuela','Costa Rica','Panamá','Guatemala','Honduras','Nicaragua','El Salvador','República Dominicana','Cuba','Puerto Rico'
  ]::text[]));

-- 2. Fecha de publicación.
alter table public.castings add column publicado_at timestamptz;

comment on column public.castings.publicado_at is
  'Primera vez que el casting quedó publicado. La pone el trigger trg_castings_tz_publicado_at; no se puede escribir.';

create or replace function public.castings_marcar_publicado_at()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  -- Nunca se acepta el valor que venga en la fila: solo lo decide este trigger.
  if tg_op = 'INSERT' then
    new.publicado_at := null;
  else
    new.publicado_at := old.publicado_at;
  end if;
  -- Solo la primera vez: un casting que se cierra y se reabre no vuelve a avisar.
  if new.estado = 'publicado' and new.publicado_at is null then
    new.publicado_at := now();
  end if;
  return new;
end;
$$;

-- El nombre hace que corra DESPUÉS de trg_castings_sync_estado (los BEFORE
-- se ejecutan por orden alfabético), que es quien decide el estado final.
create trigger trg_castings_tz_publicado_at
  before insert or update on public.castings
  for each row execute function public.castings_marcar_publicado_at();

-- La lectura de castings va por columnas: esta también se puede leer (no es sensible).
grant select (publicado_at) on public.castings to anon, authenticated;

create index castings_publicado_at_idx on public.castings (publicado_at desc) where estado = 'publicado';

-- 3. Filtros de castings en la alerta.
alter table public.alertas_convocatorias
  add column castings_activa boolean not null default false,
  add column castings_paises text[] not null default '{}',
  add column castings_disciplinas text[] not null default '{}',
  add column castings_edad smallint,
  add column castings_genero text,
  add column castings_solo_remunerados boolean not null default false,
  add constraint alertas_castings_paises_check check (castings_paises <@ array[
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  ]::text[]),
  -- Las disciplinas son ids de public.casting_categorias, que se puede ampliar
  -- sin migración: aquí solo un tope; la server action comprueba que existan.
  add constraint alertas_castings_disciplinas_check check (cardinality(castings_disciplinas) <= 30),
  add constraint alertas_castings_edad_check check (castings_edad is null or castings_edad between 1 and 120),
  add constraint alertas_castings_genero_check check (castings_genero is null or castings_genero in ('Masculino', 'Femenino', 'No binario'));

comment on column public.alertas_convocatorias.castings_activa is 'Recibir también castings nuevos en el correo de alertas.';
comment on column public.alertas_convocatorias.castings_edad is 'Edad de quien recibe la alerta: entran los castings cuyo rango la incluye (o sin rango).';
comment on column public.alertas_convocatorias.castings_genero is 'Género escénico. Los castings «Indistinto» o sin género entran siempre.';

grant insert (castings_activa, castings_paises, castings_disciplinas, castings_edad, castings_genero, castings_solo_remunerados)
  on public.alertas_convocatorias to authenticated;
grant update (castings_activa, castings_paises, castings_disciplinas, castings_edad, castings_genero, castings_solo_remunerados)
  on public.alertas_convocatorias to authenticated;
