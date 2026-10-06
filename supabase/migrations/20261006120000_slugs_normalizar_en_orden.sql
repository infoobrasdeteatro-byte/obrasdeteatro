-- Slugs: normalizar en el orden correcto.
--
-- EL BUG. Las tres funciones de trigger del baseline (auto_slug_profile,
-- auto_slug_works, auto_slug_calls) hacían
--
--     LOWER(REGEXP_REPLACE(texto, '[^a-z0-9]+', '-', 'g'))
--
-- es decir, quitaban todo lo que no fuera a-z0-9 ANTES de pasar a minúsculas.
-- Las mayúsculas y las letras con tilde caían como «no permitidas»: «Teresa's
-- Ecstasy» → «-eresa-s-cstasy», «Héctor» → «-ctor». El propio baseline lo
-- dejó anotado como bug conocido, pendiente de corrección.
--
-- LA CORRECCIÓN. Una sola función, public.slugificar, que aplica este orden:
--   1. minúsculas
--   2. fuera tildes y diacríticos (unaccent: «ñ» → «n», «é» → «e»)
--   3. fuera apóstrofos y signos (sin dejar guion: «teresa's» → «teresas»)
--   4. espacios y guiones seguidos → un solo guion
--   5. sin guiones al principio ni al final
-- Las tres funciones de trigger pasan a usarla. Todo lo demás queda igual:
-- mismos triggers (BEFORE INSERT, solo cuando el slug llega nulo), mismo
-- sufijo numérico ante colisión y mismo criterio de colisión (ignorar filas
-- borradas).
--
-- QUÉ NO HACE. No toca ningún slug existente. Los 32 slugs ya rotos se
-- corregirán aparte, junto con sus redirecciones 308, cuando Dirección lo
-- decida.
--
-- unaccent se llama con el diccionario explícito y cualificado: con
-- search_path vacío, la forma de un argumento no encuentra el diccionario
-- «unaccent» y falla.

create or replace function public.slugificar(texto text)
  returns text
  language sql
  stable
  set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        extensions.unaccent('extensions.unaccent'::regdictionary, lower(coalesce(texto, ''))),
        '[^a-z0-9[:space:]-]', '', 'g'
      ),
      '[[:space:]-]+', '-', 'g'
    ),
    '-'
  )
$$;

comment on function public.slugificar(text) is
  'Slug en orden: minúsculas → sin diacríticos → sin apóstrofos ni signos → espacios/guiones a un guion → sin guiones en los extremos. Puede devolver cadena vacía; quien llama decide el respaldo.';

create or replace function public.auto_slug_profile()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  counter   int := 0;
begin
  base_slug := public.slugificar(
    coalesce(nullif(trim(new.nombre_artistico), ''), trim(new.nombre))
  );
  -- Un nombre hecho solo de signos se queda en nada: se usa el id, como
  -- hacía el baseline cuando no había nombre.
  if base_slug = '' then base_slug := new.id::text; end if;

  candidate := base_slug;
  loop
    exit when not exists (
      select 1 from public.profiles
      where slug = candidate and id <> new.id and deleted_at is null
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create or replace function public.auto_slug_works()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  counter   int := 0;
begin
  base_slug := public.slugificar(trim(new.title));
  if base_slug = '' then base_slug := new.id::text; end if;

  candidate := base_slug;
  loop
    exit when not exists (
      select 1 from public.works
      where slug = candidate and id <> new.id and deleted_at is null
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create or replace function public.auto_slug_calls()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  counter   int := 0;
begin
  base_slug := public.slugificar(trim(new.title));
  if base_slug = '' then base_slug := new.id::text; end if;

  candidate := base_slug;
  loop
    exit when not exists (
      select 1 from public.calls
      where slug = candidate and id <> new.id and deleted_at is null
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;
