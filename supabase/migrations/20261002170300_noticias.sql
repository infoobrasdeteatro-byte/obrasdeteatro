-- Noticias (3/5): tabla de noticias, normalización de URL y vista pública de
-- fuentes.
--
-- Una noticia es un resumen breve propio que enlaza a la fuente original. No
-- hay ficha individual ni copia del artículo: titular, resumen (máx. 400
-- caracteres), categoría, país, fuente, fecha y la URL original.
--
-- Ciclo de vida (lo gobierna el trigger de guarda, migración 4/5):
--   candidata  -> publicada | descartada     (solo moderación)
--   publicada  -> retirada                   (solo moderación)
-- Toda inserción que no haga moderación entra como candidata, también la del
-- endpoint de importación con la clave de servicio.
--
-- Lectura: el público solo ve las publicadas; moderación lo ve y gestiona
-- todo. No hay INSERT ni UPDATE para usuarios normales: el endpoint escribe
-- con la clave de servicio y el alta manual la hace moderación.
--
-- url_original se guarda normalizada (noticias_normalizar_url, que aplica el
-- trigger de guarda) y es única sin distinguir http/https ni el prefijo www.
-- Así una misma noticia que llega por dos RSS, o con parámetros utm_*, choca
-- con la ya guardada.

-- 1. Normalización de URL.
--
--    Recorta espacios, quita el fragmento (#...), pasa esquema y host a
--    minúsculas, quita las barras finales de la ruta y elimina los parámetros
--    de seguimiento (utm_*, fbclid, gclid, mc_cid, mc_eid). No toca la
--    mayúscula/minúscula de la ruta ni el resto de la query: hay sitios en los
--    que cambian de página. Si la entrada no es una URL http(s) la devuelve
--    tal cual, para que la rechace la CHECK de la tabla con su propio nombre.
create function public.noticias_normalizar_url(p_url text)
returns text
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v text;
  v_base text;
  v_query text;
  v_origen text;
  v_ruta text;
begin
  if p_url is null then
    return null;
  end if;

  v := split_part(btrim(p_url), '#', 1);

  if v !~* '^https?://[^\s/?#]+' or v ~ '\s' then
    return v;
  end if;

  v_base  := split_part(v, '?', 1);
  v_query := case when position('?' in v) > 0 then substr(v, position('?' in v) + 1) else '' end;

  v_origen := lower(substring(v_base from '^[A-Za-z]+://[^/]+'));
  v_ruta   := regexp_replace(substr(v_base, length(v_origen) + 1), '/+$', '');

  select coalesce(string_agg(t.p, '&' order by t.n), '')
    into v_query
  from unnest(string_to_array(v_query, '&')) with ordinality as t(p, n)
  where t.p <> ''
    and t.p !~* '^(utm_[^=]*|fbclid|gclid|mc_cid|mc_eid)(=|$)';

  return v_origen || v_ruta || case when v_query <> '' then '?' || v_query else '' end;
end;
$fn$;

comment on function public.noticias_normalizar_url(text) is
  'Forma canónica de la URL original de una noticia: sin fragmento, esquema y host en minúsculas, sin barra final ni parámetros de seguimiento. La aplica el trigger noticias_guarda().';

-- 2. Tabla.
create table public.noticias (
  id uuid primary key default gen_random_uuid(),

  -- Contenido
  titular text not null,
  resumen text not null,
  categoria_id text not null references public.noticias_categorias (id),
  pais_code text not null,
  fuente_id uuid not null references public.noticias_fuentes (id),
  url_original text not null,
  fecha_original timestamptz,

  -- Ciclo de vida
  estado text not null default 'candidata',
  origen text not null,
  motivo_descarte text,

  -- Revisión
  revisado_por uuid references public.profiles (id) on delete set null,
  revisado_at timestamptz,
  publicado_at timestamptz,

  -- Retirada
  retirada_at timestamptz,
  motivo_retirada text,

  -- Trazabilidad
  lote_importacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint noticias_titular_longitud check (char_length(btrim(titular)) between 1 and 200),
  constraint noticias_resumen_longitud check (char_length(btrim(resumen)) between 1 and 400),
  constraint noticias_url_original_http check (url_original ~* '^https?://[^\s/?#]+[^\s]*$'),
  constraint noticias_pais_check check (pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  constraint noticias_estado_check check (estado in ('candidata', 'publicada', 'descartada', 'retirada')),
  constraint noticias_origen_check check (origen in ('make', 'manual')),
  constraint noticias_publicada_con_fecha check (estado <> 'publicada' or publicado_at is not null),
  constraint noticias_retirada_con_fecha check (estado <> 'retirada' or (retirada_at is not null and publicado_at is not null))
);

comment on table public.noticias is
  'Noticias del sector: resumen propio con enlace a la fuente original. Entran como candidata y solo moderación las publica, descarta o retira (trigger noticias_guarda). El público lee solo las publicadas.';

-- 3. Índices.
--
--    URL única sin distinguir http/https ni www. La normalización ya ha
--    puesto esquema y host en minúsculas.
create unique index noticias_url_original_unica
  on public.noticias (regexp_replace(url_original, '^https?://(www\.)?', ''));

-- Listado público y cola de revisión.
create index noticias_estado_publicado_idx on public.noticias (estado, publicado_at desc);
create index noticias_pais_idx on public.noticias (pais_code);

-- Casi duplicados por titular (similarity / %), para el panel y el endpoint.
create index noticias_titular_trgm_idx on public.noticias using gin (titular public.gin_trgm_ops);

-- Claves foráneas y caducidad de candidatas.
create index noticias_fuente_idx on public.noticias (fuente_id);
create index noticias_categoria_idx on public.noticias (categoria_id);
create index noticias_candidatas_created_idx on public.noticias (created_at) where estado = 'candidata';

-- 4. RLS.
alter table public.noticias enable row level security;

create policy "Noticias publicadas visibles" on public.noticias
  for select
  using (estado = 'publicada');

create policy "Moderación gestiona noticias" on public.noticias
  for all
  using (public.es_moderador())
  with check (public.es_moderador());

revoke insert, update, delete, truncate on public.noticias from anon;
revoke truncate on public.noticias from authenticated;

-- 5. Vista pública de fuentes.
--
--    noticias_fuentes no tiene lectura pública (permisos, licencias y notas
--    son internos). Esta vista expone solo nombre, dominio, url_web y
--    pais_code (más el id, para cruzar con noticias.fuente_id), y solo de las
--    fuentes activas o que firman alguna noticia publicada: una fuente con la
--    que aún se negocia el permiso no aparece.
--
--    Se ejecuta con los permisos de su propietario a propósito (no es
--    security_invoker): es la forma de limitar columnas sin abrir la tabla.
--    La vista es actualizable de forma automática, así que se le retiran
--    todos los privilegios y se concede solo SELECT.
create view public.noticias_fuentes_publicas
with (security_barrier = true)
as
select f.id, f.nombre, f.dominio, f.url_web, f.pais_code
from public.noticias_fuentes f
where f.activa
   or exists (
     select 1
     from public.noticias n
     where n.fuente_id = f.id
       and n.estado = 'publicada'
   );

comment on view public.noticias_fuentes_publicas is
  'Columnas públicas de las fuentes activas o con noticias publicadas. Solo lectura para anon y authenticated.';

revoke all on public.noticias_fuentes_publicas from anon, authenticated;
grant select on public.noticias_fuentes_publicas to anon, authenticated;
