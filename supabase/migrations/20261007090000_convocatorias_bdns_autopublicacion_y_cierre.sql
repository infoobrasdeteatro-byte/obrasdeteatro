-- Convocatorias: autopublicación de las BDNS y cierre de las pendientes vencidas.
--
-- Decisión de Dirección del 06-10-2026 (feat/convocatorias-moderacion-semanal):
-- que el administrador no tenga que moderar a diario. Dos cambios:
--
-- 1. calls_sync_estado(): una convocatoria de la Redacción cuyo lote empieza
--    por «BDNS-» (escenario de Make de la Base de Datos Nacional de
--    Subvenciones) y con pais_code = 'ES' entra PUBLICADA, con la misma
--    fecha_publicacion e is_published que deja la aprobación manual, siempre
--    que:
--      - cumpla todas las reglas de la Redacción (bases, entidad, país y fecha
--        límite futura; si falta algo, la inserción se rechaza como hasta ahora);
--      - ninguna regla activa de moderacion_reglas la señale. Si alguna la
--        señala, entra en pendiente_revision con su motivo_filtro.
--    El resto (GALERTAS- y cualquier otra) sigue entrando en pendiente_revision.
--    Nada más cambia: solo se decide al INSERTAR, y una reedición de título o
--    descripción de una ya publicada la sigue devolviendo a revisión.
--
-- 2. cerrar_convocatorias_vencidas(): además de las publicadas, cierra las que
--    siguen en pendiente_revision con el plazo vencido. Así salen de la cola,
--    del resumen semanal y del panel, y nadie puede publicarlas ya.

-- 1. El trigger. Idéntico a 20261006130000 salvo lo marcado con [bdns]. No se
--    recrea el trigger: su lista de columnas no cambia.
create or replace function public.calls_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_regla_motivo text;
  -- [bdns] Solo se decide al insertar.
  v_autopublicar boolean := false;
begin
  -- [redaccion] Quién puede usar el origen y qué datos necesita.
  if new.origen = 'redaccion' then
    if new.profile_id is distinct from public.perfil_redaccion_id() then
      raise exception 'Solo el perfil de la Redacción puede tener convocatorias de origen redaccion.'
        using errcode = '42501';
    end if;

    if tg_op = 'INSERT' then
      new.estado := 'pendiente_revision';
      -- [bdns] Las de la Base de Datos Nacional de Subvenciones (España) se
      -- publican solas si pasan todas las comprobaciones de abajo y ninguna
      -- regla de moderación las señala. El resto, a revisión.
      v_autopublicar := coalesce(new.lote, '') like 'BDNS-%' and new.pais_code = 'ES';
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

    -- [bdns] Autopublicación: llega aquí ya validada (bases, entidad, país y
    -- fecha futura) y solo si el filtro no la ha señalado. Si lo ha hecho, se
    -- queda en revisión con su motivo, como cualquier otra.
    if v_autopublicar and v_regla_motivo is null then
      new.estado := 'publicado';
    end if;
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

-- 2. Cierre por plazo vencido: también las pendientes de revisión.
create or replace function public.cerrar_convocatorias_vencidas()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.calls
  set estado = 'cerrado'
  where estado in ('publicado', 'pendiente_revision')
    and deadline is not null
    and deadline < now();
end;
$$;
