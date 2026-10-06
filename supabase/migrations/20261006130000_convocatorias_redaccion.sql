-- Convocatorias automáticas, Bloque 1: columnas de la Redacción, categoría
-- «ayuda», perfil de la Redacción y reglas en calls_sync_estado().
--
-- Mismo patrón que Noticias (Make → OpenAI → /api/convocatorias/import →
-- revisión humana). La moderación obligatoria de calls sigue mandando: nada
-- de la Redacción se publica sin que un moderador lo apruebe.
--
-- REQUISITO PREVIO. La cuenta de servicio redaccion@obrasdeteatro.com debe
-- existir en auth.users (creada con la API de administración el 06-10-2026,
-- email confirmado, contraseña aleatoria no guardada, sin roles). Su perfil lo
-- creó el trigger handle_new_user(); esta migración solo lo configura. Si la
-- cuenta no existe, o tiene algún rol, la migración aborta entera.

-- 1. Columnas nuevas.
--
--    pais_code repite la lista y la CHECK de noticias.pais_code, pero admite
--    NULL: las convocatorias de usuario no lo piden (su formulario no cambia).
--    Para origen 'redaccion' lo exige el trigger.
--
--    url_bases_normalizada es la clave de duplicados: noticias_normalizar_url()
--    (la misma normalización de Noticias) sin esquema ni «www.», que es lo que
--    el índice único de noticias tampoco distingue. La calcula el trigger.
alter table public.calls
  add column origen text not null default 'usuario',
  add column pais_code text,
  add column ciudad text,
  add column entidad_convocante text,
  add column url_bases text,
  add column fuente_dominio text,
  add column url_bases_normalizada text,
  add column lote text;

alter table public.calls
  add constraint calls_origen_check check (origen in ('usuario', 'redaccion')),
  add constraint calls_pais_check check (pais_code is null or pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  add constraint calls_url_bases_https check (url_bases is null or url_bases ~* '^https://[^\s/?#]+[^\s]*$');

comment on column public.calls.origen is
  'usuario = la creó un perfil desde la web; redaccion = la importó la Redacción (/api/convocatorias/import). Solo el perfil redaccion puede tener origen redaccion (trigger calls_sync_estado).';
comment on column public.calls.url_bases_normalizada is
  'URL de las bases normalizada (noticias_normalizar_url, sin esquema ni www.). La calcula el trigger; única entre las de origen redaccion.';

-- Duplicados de la Redacción. Sin filtrar por deleted_at a propósito: una
-- convocatoria rechazada o borrada no debe volver a entrar en la cola.
create unique index calls_url_bases_redaccion_unica
  on public.calls (url_bases_normalizada)
  where origen = 'redaccion';

-- 2. Categoría «ayuda» (ayudas y subvenciones).
alter table public.calls drop constraint calls_category_check;
alter table public.calls
  add constraint calls_category_check check (category in ('festival', 'premio', 'residencia', 'beca', 'ayuda'));

-- 3. Perfil de la Redacción.
--
--    Se busca por correo, nunca por un id escrito aquí. Queda:
--      nombre «Redacción obrasdeteatro.com», slug redaccion, tipo institucion;
--      perfil_publico = false → no sale en el directorio, ni en /perfil/[slug],
--      ni en la búsqueda de personas de ScenaIA (todas exigen perfil_publico).
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = 'redaccion@obrasdeteatro.com';
  if v_id is null then
    raise exception 'Falta la cuenta de servicio redaccion@obrasdeteatro.com en auth.users.';
  end if;

  if exists (select 1 from public.profile_roles where profile_id = v_id) then
    raise exception 'La cuenta de la Redacción no debe tener ningún rol en profile_roles.';
  end if;

  update public.profiles
  set nombre         = 'Redacción obrasdeteatro.com',
      apellidos      = null,
      slug           = 'redaccion',
      tipo_perfil    = 'institucion',
      perfil_publico = false
  where id = v_id;

  if not found then
    raise exception 'La cuenta de la Redacción no tiene perfil en public.profiles.';
  end if;
end;
$$;

-- El id del perfil de la Redacción, para el trigger. Solo lo usan funciones
-- SECURITY DEFINER: no se expone a anon ni a authenticated.
create function public.perfil_redaccion_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where slug = 'redaccion' and deleted_at is null
$$;

revoke all on function public.perfil_redaccion_id() from public, anon, authenticated;

-- Nombre de cada país del ámbito, el mismo de lib/geo/countries.ts. Sirve para
-- rellenar location («Ciudad, País») sin romper lo que ya lee esa columna.
create function public.pais_nombre(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_code
    when 'ES' then 'España'          when 'AR' then 'Argentina'
    when 'MX' then 'México'          when 'CO' then 'Colombia'
    when 'CL' then 'Chile'           when 'PE' then 'Perú'
    when 'UY' then 'Uruguay'         when 'PY' then 'Paraguay'
    when 'BO' then 'Bolivia'         when 'EC' then 'Ecuador'
    when 'VE' then 'Venezuela'       when 'CR' then 'Costa Rica'
    when 'PA' then 'Panamá'          when 'GT' then 'Guatemala'
    when 'HN' then 'Honduras'        when 'NI' then 'Nicaragua'
    when 'SV' then 'El Salvador'     when 'DO' then 'República Dominicana'
    when 'CU' then 'Cuba'            when 'PR' then 'Puerto Rico'
  end
$$;

-- 4. El trigger. Idéntico a 20260918143309 salvo lo marcado con [redaccion]:
--      - solo el perfil redaccion puede tener origen 'redaccion';
--      - al insertar, una de la Redacción entra SIEMPRE en pendiente_revision;
--      - exige url_bases, entidad_convocante, pais_code y deadline, y que la
--        deadline sea futura al insertar, al cambiarla y al publicar (no en
--        otras actualizaciones: el cierre por plazo vencido también pasa por
--        aquí y no debe fallar);
--      - exenta del cupo mensual del plan gratuito;
--      - [todas] url_bases_normalizada y location («Ciudad, País») se calculan
--        aquí cuando llegan url_bases o ciudad/país.
create or replace function public.calls_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_regla_motivo text;
begin
  -- [redaccion] Quién puede usar el origen y qué datos necesita.
  if new.origen = 'redaccion' then
    if new.profile_id is distinct from public.perfil_redaccion_id() then
      raise exception 'Solo el perfil de la Redacción puede tener convocatorias de origen redaccion.'
        using errcode = '42501';
    end if;

    if tg_op = 'INSERT' then
      new.estado := 'pendiente_revision';
    end if;

    if nullif(btrim(coalesce(new.url_bases, '')), '') is null then
      raise exception 'Una convocatoria de la Redacción necesita la URL de las bases (url_bases).';
    end if;
    if nullif(btrim(coalesce(new.entidad_convocante, '')), '') is null then
      raise exception 'Una convocatoria de la Redacción necesita la entidad convocante.';
    end if;
    if new.pais_code is null then
      raise exception 'Una convocatoria de la Redacción necesita el país (pais_code).';
    end if;
    if new.deadline is null then
      raise exception 'Una convocatoria de la Redacción necesita fecha límite.';
    end if;
    if new.deadline <= now()
       and (
         tg_op = 'INSERT'
         or new.deadline is distinct from old.deadline
         or (new.estado = 'publicado' and old.estado is distinct from 'publicado')
       )
    then
      raise exception 'La fecha límite de una convocatoria de la Redacción debe ser futura.';
    end if;
  end if;

  -- [todas] Campos derivados.
  new.url_bases_normalizada := case
    when new.url_bases is null then null
    else regexp_replace(public.noticias_normalizar_url(new.url_bases), '^https?://(www\.)?', '', 'i')
  end;

  if nullif(btrim(coalesce(new.ciudad, '')), '') is not null or new.pais_code is not null then
    new.location := nullif(concat_ws(', ', nullif(btrim(new.ciudad), ''), public.pais_nombre(new.pais_code)), '');
  end if;

  if tg_op = 'UPDATE'
     and old.estado = 'publicado'
     and new.estado = 'publicado'
     and (
       new.title is distinct from old.title
       or new.description is distinct from old.description
     )
  then
    new.estado := 'pendiente_revision';
  end if;

  if new.estado in ('publicado', 'rechazado') then
    if not public.es_moderador() then
      new.estado := 'pendiente_revision';
    end if;
  end if;

  if new.estado = 'pendiente_revision' then
    select motivo into v_regla_motivo
    from public.moderacion_reglas
    where activo = true
      and (
        (tipo = 'palabra' and (
          new.title ilike '%' || patron || '%'
          or new.description ilike '%' || patron || '%'
        ))
        or
        (tipo = 'regex' and (
          new.title ~* patron
          or new.description ~* patron
        ))
      )
    limit 1;

    new.motivo_filtro := v_regla_motivo;
  end if;

  if new.estado = 'publicado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'publicado')
     -- [cupo fijo] Solo la primera publicación consume cupo.
     and not exists (select 1 from public.calls_publicaciones where call_id = new.id)
  then
    -- [redaccion] La Redacción no tiene cupo mensual.
    if new.origen <> 'redaccion'
       and public.cupo_mensual_convocatorias_agotado(new.profile_id)
    then
      raise exception
        'El plan Gratuito permite 3 convocatorias publicadas por mes natural, y este perfil ya las ha agotado. Puede publicarse el mes que viene, o con un plan superior.';
    end if;

    -- [cupo fijo] Se sella aquí, antes de cualquier otra salida, para que
    -- cuente aunque la convocatoria se cierre, se borre o se reedite después.
    insert into public.calls_publicaciones (call_id, profile_id, publicada_at)
    values (new.id, new.profile_id, now())
    on conflict (call_id) do nothing;
  end if;

  if coalesce(new.is_featured, false)
     and not public.plan_destacado_o_superior(new.profile_id)
  then
    raise exception
      'Destacar una convocatoria requiere plan Destacado o Empresa.';
  end if;

  if new.estado = 'pendiente_revision'
     and (tg_op = 'INSERT' or old.estado is distinct from 'pendiente_revision')
  then
    new.moderacion_entrada_at := now();
  end if;

  if new.estado = 'publicado' and new.fecha_publicacion is null then
    new.fecha_publicacion := now();
  end if;

  if new.estado = 'publicado' then
    new.motivo_filtro := null;
  end if;

  new.is_published := (new.estado = 'publicado');
  return new;
end;
$$;

-- La lista del `of` crece con las columnas de las reglas nuevas: sin ellas, un
-- UPDATE que solo cambie el país, la ciudad, la fecha o las bases no
-- dispararía el trigger, y ni se validaría ni se recalcularían location y
-- url_bases_normalizada.
drop trigger if exists trg_calls_sync_estado on public.calls;

create trigger trg_calls_sync_estado
  before insert or update of
    estado, is_featured, title, description,
    origen, profile_id, pais_code, ciudad, entidad_convocante, url_bases, deadline
  on public.calls
  for each row
  execute function public.calls_sync_estado();
