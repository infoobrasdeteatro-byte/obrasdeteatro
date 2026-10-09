-- Espacios escénicos, segunda fase: fichas completas y «Sugerir una corrección».
--
-- 1. Columnas nuevas en espacios_escenicos, todas opcionales: la ficha solo
--    pinta lo que tenga. Los datos (foto, teléfono, accesibilidad, historia,
--    descripciones) los carga Dirección en una migración de datos aparte;
--    aquí no se carga ninguno.
--      - verificado: columna generada (gestionado_por is not null). La ficha
--        reclamada y aprobada lleva el sello «Ficha verificada».
--      - imagen_*: solo fotos de Wikimedia Commons, con crédito obligatorio
--        (licencia y página de origen) si hay foto.
--      - redes: objeto jsonb con instagram, facebook, x, youtube y tiktok,
--        solo URLs https (espacios_redes_validas).
-- 2. Tabla espacios_sugerencias: correcciones que cualquiera (con o sin
--    sesión) propone sobre una ficha. Solo las escribe el servidor con la
--    clave de servicio (POST /api/espacios/sugerencias), que es quien calcula
--    el hash de la IP; nadie más puede insertarlas. Moderación las gestiona.
--    Antispam en la base, para que no dependa de la ruta:
--      - 3 por hora y por hash de IP (trigger, lanza «limite_sugerencias»);
--      - reglas activas de moderacion_reglas sobre el texto: si alguna casa,
--        la sugerencia entra ya descartada, con el motivo, y no se avisa.
--    La IP nunca se guarda; el hash se borra a las 24 horas (cron diario).
--
-- Requiere 20261009120000_espacios_escenicos.

-- 1. Columnas nuevas ---------------------------------------------------------

create or replace function public.espacios_redes_validas(redes jsonb)
  returns boolean
  language sql
  immutable
  set search_path = ''
as $$
  select redes is null or (
    jsonb_typeof(redes) = 'object'
    and not exists (
      select 1
      from jsonb_each(redes) as r(clave, valor)
      where r.clave not in ('instagram', 'facebook', 'x', 'youtube', 'tiktok')
         or jsonb_typeof(r.valor) <> 'string'
         or (r.valor #>> '{}') !~* '^https://[^\s/?#"''<>]+[^\s"''<>]*$'
         or char_length(r.valor #>> '{}') > 300
    )
  )
$$;

comment on function public.espacios_redes_validas(jsonb) is
  'True si redes es null o un objeto con claves instagram, facebook, x, youtube o tiktok y valores https de hasta 300 caracteres.';

alter table public.espacios_escenicos
  add column codigo_postal text,
  add column telefono text,
  add column email text,
  add column redes jsonb,
  add column accesibilidad text,
  add column anio_inauguracion smallint,
  add column arquitecto text,
  add column titularidad text,
  add column wikidata_id text,
  add column imagen_url text,
  add column imagen_autor text,
  add column imagen_licencia text,
  add column imagen_fuente_url text,
  add column descripcion_origen text,
  add column verificado boolean generated always as (gestionado_por is not null) stored,

  add constraint espacios_escenicos_codigo_postal_formato
    check (codigo_postal is null or codigo_postal ~ '^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$'),
  -- Solo el teléfono general del espacio: dígitos, espacios, +, paréntesis, guiones y puntos.
  add constraint espacios_escenicos_telefono_formato
    check (telefono is null or telefono ~ '^\+?[0-9][0-9 ().-]{5,28}$'),
  add constraint espacios_escenicos_email_formato
    check (email is null or (char_length(email) <= 254 and email ~* '^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$')),
  add constraint espacios_escenicos_redes_validas
    check (public.espacios_redes_validas(redes)),
  add constraint espacios_escenicos_accesibilidad_check
    check (accesibilidad is null or accesibilidad in ('si', 'parcial', 'no')),
  add constraint espacios_escenicos_anio_rango
    check (anio_inauguracion is null or anio_inauguracion between 1500 and 2100),
  add constraint espacios_escenicos_arquitecto_longitud
    check (arquitecto is null or char_length(arquitecto) <= 120),
  add constraint espacios_escenicos_titularidad_check
    check (titularidad is null or titularidad in ('publica', 'privada')),
  add constraint espacios_escenicos_wikidata_formato
    check (wikidata_id is null or wikidata_id ~ '^Q[1-9][0-9]*$'),
  add constraint espacios_escenicos_imagen_url_commons
    check (imagen_url is null or imagen_url ~ '^https://upload\.wikimedia\.org/[^\s"''<>]+$'),
  add constraint espacios_escenicos_imagen_autor_longitud
    check (imagen_autor is null or char_length(imagen_autor) <= 160),
  add constraint espacios_escenicos_imagen_licencia_longitud
    check (imagen_licencia is null or char_length(imagen_licencia) <= 60),
  add constraint espacios_escenicos_imagen_fuente_commons
    check (imagen_fuente_url is null or imagen_fuente_url ~ '^https://commons\.wikimedia\.org/[^\s"''<>]+$'),
  -- Una foto sin crédito no se puede publicar: con imagen_url, licencia y
  -- página de origen son obligatorias.
  add constraint espacios_escenicos_imagen_con_credito
    check (imagen_url is null or (imagen_licencia is not null and imagen_fuente_url is not null)),
  add constraint espacios_escenicos_descripcion_origen_check
    check (descripcion_origen is null or descripcion_origen in ('redaccion', 'ia_revisada', 'responsable'));

comment on column public.espacios_escenicos.telefono is 'Teléfono general del espacio (taquilla, centralita). Nunca uno personal.';
comment on column public.espacios_escenicos.email is 'Correo general del espacio. Nunca uno personal.';
comment on column public.espacios_escenicos.redes is 'Redes del espacio: {"instagram","facebook","x","youtube","tiktok"} → URL https.';
comment on column public.espacios_escenicos.imagen_url is 'Foto de cabecera, solo de upload.wikimedia.org, con imagen_licencia e imagen_fuente_url obligatorias.';
comment on column public.espacios_escenicos.imagen_fuente_url is 'Página del archivo en Wikimedia Commons (crédito y licencia).';
comment on column public.espacios_escenicos.descripcion_origen is 'Quién redactó la descripción: redaccion, ia_revisada (generada con IA y revisada por la Redacción) o responsable.';
comment on column public.espacios_escenicos.verificado is 'Generada: la ficha tiene responsable aprobado (gestionado_por no es null).';

-- 2. Sugerencias de corrección ----------------------------------------------

create table public.espacios_sugerencias (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios_escenicos (id) on delete cascade,
  texto text not null,
  email text,
  profile_id uuid references public.profiles (id) on delete set null,
  ip_hash text,
  estado text not null default 'pendiente',
  motivo_filtro text,
  created_at timestamptz not null default now(),
  resuelta_at timestamptz,

  constraint espacios_sugerencias_texto_longitud check (char_length(btrim(texto)) between 10 and 1000),
  constraint espacios_sugerencias_email_formato
    check (email is null or (char_length(email) <= 254 and email ~* '^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$')),
  constraint espacios_sugerencias_ip_hash_formato check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  constraint espacios_sugerencias_estado_check check (estado in ('pendiente', 'atendida', 'descartada'))
);

comment on table public.espacios_sugerencias is
  'Correcciones propuestas por cualquiera sobre una ficha de espacio. Solo las inserta el servidor (clave de servicio); moderación las gestiona. El email es solo para responder y no se publica.';
comment on column public.espacios_sugerencias.ip_hash is
  'HMAC-SHA256 de la IP (nunca la IP), para el límite de 3 por hora. Se borra a las 24 horas.';
comment on column public.espacios_sugerencias.motivo_filtro is
  'Motivo de la regla de moderacion_reglas que casó con el texto; si lo hay, la sugerencia entró descartada.';

create index espacios_sugerencias_bandeja_idx
  on public.espacios_sugerencias (created_at desc)
  where estado = 'pendiente';
create index espacios_sugerencias_ip_idx
  on public.espacios_sugerencias (ip_hash, created_at)
  where ip_hash is not null;

-- Antispam al insertar. SECURITY DEFINER: lee moderacion_reglas, que solo ve
-- moderación.
create or replace function public.espacios_sugerencias_filtrar()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_recientes int;
  v_motivo text;
begin
  -- Siempre nacen pendientes (o descartadas por el filtro de abajo).
  new.estado := 'pendiente';
  new.motivo_filtro := null;
  new.resuelta_at := null;

  if new.ip_hash is not null then
    select count(*) into v_recientes
    from public.espacios_sugerencias
    where ip_hash = new.ip_hash
      and created_at > now() - interval '1 hour';
    if v_recientes >= 3 then
      raise exception 'limite_sugerencias' using errcode = 'P0001',
        hint = 'Máximo 3 sugerencias por hora desde la misma conexión.';
    end if;
  end if;

  select coalesce(motivo, 'Regla de moderación') into v_motivo
  from public.moderacion_reglas
  where activo = true
    and (
      (tipo = 'palabra' and new.texto ilike '%' || patron || '%')
      or (tipo = 'regex' and new.texto ~* patron)
    )
  limit 1;

  if found then
    new.estado := 'descartada';
    new.motivo_filtro := v_motivo;
    new.resuelta_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.espacios_sugerencias_resolver()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    new.resuelta_at := case when new.estado = 'pendiente' then null else now() end;
  end if;
  return new;
end;
$$;

revoke execute on function public.espacios_sugerencias_filtrar() from public, anon, authenticated;
revoke execute on function public.espacios_sugerencias_resolver() from public, anon, authenticated;

create trigger espacios_sugerencias_filtrar
  before insert on public.espacios_sugerencias
  for each row execute function public.espacios_sugerencias_filtrar();

create trigger espacios_sugerencias_resolver
  before update of estado on public.espacios_sugerencias
  for each row execute function public.espacios_sugerencias_resolver();

-- RLS: solo moderación. El servidor inserta con la clave de servicio, que no
-- pasa por RLS; ni anon ni authenticated pueden insertar ni leer.
alter table public.espacios_sugerencias enable row level security;

create policy "Moderación gestiona sugerencias"
  on public.espacios_sugerencias for all
  to authenticated
  using (public.es_moderador())
  with check (public.es_moderador());

revoke all on public.espacios_sugerencias from anon;
revoke insert, truncate on public.espacios_sugerencias from authenticated;

-- El hash de la IP solo sirve para el límite de una hora: se borra a las 24.
create or replace function public.espacios_sugerencias_borrar_ip_hash()
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  update public.espacios_sugerencias
     set ip_hash = null
   where ip_hash is not null
     and created_at < now() - interval '24 hours';
$$;

revoke execute on function public.espacios_sugerencias_borrar_ip_hash() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'espacios-sugerencias-borrar-ip-hash';

select cron.schedule(
  'espacios-sugerencias-borrar-ip-hash',
  '15 4 * * *',
  $job$select public.espacios_sugerencias_borrar_ip_hash();$job$
);
