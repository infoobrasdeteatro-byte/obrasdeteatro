-- Noticias (4/5): registro de eventos y triggers de guarda y registro.
--
-- REGISTRO. Una fila por hecho relevante del módulo: importada, duplicada,
-- descartada, aprobada, retirada, error, alta_manual. Lo escriben:
--   - el trigger noticias_registrar_cambio(), para el alta y para cada cambio
--     de estado de una noticia (no depende de que la aplicación se acuerde);
--   - el servidor con la clave de servicio, para lo que no llega a ser una
--     fila de noticias (duplicada, error).
-- Solo moderación lo lee. Ningún usuario lo escribe, modifica ni borra.
--
-- GUARDA (noticias_guarda, modelo: calls_sync_estado). Reglas:
--   1. Toda inserción que no haga moderación entra como 'candidata', aunque
--      pida otro estado. Incluye la clave de servicio del endpoint: el
--      servicio no tiene auth.uid() y es_moderador() le devuelve false.
--   2. Solo moderación cambia el estado. Transiciones permitidas:
--        candidata -> publicada | descartada
--        publicada -> retirada
--      Un alta manual de moderación puede entrar directamente como publicada
--      (es la transición candidata -> publicada en el mismo INSERT).
--   3. Sella revisado_por, revisado_at y publicado_at al publicar;
--      revisado_por y revisado_at al descartar; retirada_at al retirar. Nadie
--      más puede escribir esos sellos.
--   4. No publica si la fuente no está activa.
--   5. Límite diario: como máximo 3 noticias publicadas por día natural en
--      hora de Madrid, contando todas las fuentes y países. Cuenta las
--      PUBLICACIONES del día (publicado_at), aunque una se retire después:
--      retirar no libera plaza, igual que en el cupo fijo de convocatorias.
--      Un candado de transacción evita que dos moderadores a la vez pasen de 3.
--
-- "Moderación" incluye también al propio sistema: el propietario de la base
-- (migraciones, SQL editor, y funciones SECURITY DEFINER como la caducidad de
-- candidatas). Se distingue por current_user, como en
-- profiles_proteger_campos_gestionados(): PostgREST ejecuta siempre como anon,
-- authenticated o service_role. Por eso noticias_guarda() NO es SECURITY
-- DEFINER: tiene que ver el current_user real de la petición.

-- 1. Registro.
create table public.noticias_registro (
  id uuid primary key default gen_random_uuid(),
  ocurrido_at timestamptz not null default now(),
  evento text not null,
  noticia_id uuid references public.noticias (id) on delete set null,
  url text,
  lote text,
  actor_id uuid references public.profiles (id) on delete set null,
  detalle jsonb not null default '{}'::jsonb,

  constraint noticias_registro_evento_check check (evento in (
    'importada', 'duplicada', 'descartada', 'aprobada', 'retirada', 'error', 'alta_manual'
  ))
);

comment on table public.noticias_registro is
  'Registro de eventos del módulo de noticias. Lo escriben el trigger noticias_registrar_cambio() y el servidor con la clave de servicio. Solo lo lee moderación.';

create index noticias_registro_ocurrido_idx on public.noticias_registro (ocurrido_at desc);
create index noticias_registro_noticia_idx on public.noticias_registro (noticia_id);

alter table public.noticias_registro enable row level security;

create policy "Moderación lee el registro de noticias" on public.noticias_registro
  for select
  using (public.es_moderador());

-- Sin políticas de escritura y, además, sin el privilegio: ni anon ni
-- authenticated (moderación incluida) escriben aquí.
revoke insert, update, delete, truncate on public.noticias_registro from anon, authenticated;

-- 2. Guarda.
create function public.noticias_guarda()
returns trigger
language plpgsql
set search_path = 'public'
as $fn$
declare
  v_privilegiado boolean;
  v_previo text;
  v_fuente_activa boolean;
  v_hoy date;
  v_publicadas integer;
begin
  v_privilegiado := current_user not in ('anon', 'authenticated', 'service_role')
                    or public.es_moderador();

  -- URL en forma canónica (la unicidad se apoya en ella).
  if tg_op = 'INSERT' or new.url_original is distinct from old.url_original then
    new.url_original := public.noticias_normalizar_url(new.url_original);
  end if;

  -- Los sellos solo los pone este trigger.
  if tg_op = 'INSERT' then
    new.revisado_por := null;
    new.revisado_at  := null;
    new.publicado_at := null;
    new.retirada_at  := null;
    v_previo := 'candidata';

    if not v_privilegiado then
      new.estado := 'candidata';
      new.motivo_descarte := null;
      new.motivo_retirada := null;
      new.created_at := now();
    end if;
  else
    new.revisado_por := old.revisado_por;
    new.revisado_at  := old.revisado_at;
    new.publicado_at := old.publicado_at;
    new.retirada_at  := old.retirada_at;
    new.created_at   := old.created_at;
    v_previo := old.estado;

    if new.estado is distinct from old.estado and not v_privilegiado then
      raise exception 'Solo moderación puede cambiar el estado de una noticia (de % a %).', old.estado, new.estado
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();

  if new.estado is distinct from v_previo then
    if not (
         (v_previo = 'candidata' and new.estado in ('publicada', 'descartada'))
      or (v_previo = 'publicada' and new.estado = 'retirada')
    ) then
      raise exception 'Transición de estado no permitida para una noticia: % -> %.', v_previo, new.estado
        using errcode = '23514';
    end if;

    if new.estado = 'publicada' then
      select activa into v_fuente_activa
      from public.noticias_fuentes
      where id = new.fuente_id;

      if not coalesce(v_fuente_activa, false) then
        raise exception 'No se puede publicar la noticia: su fuente no está activa (permiso pendiente o denegado, o fuente desactivada).'
          using errcode = '23514';
      end if;

      perform pg_advisory_xact_lock(hashtext('noticias_publicacion_diaria'));

      v_hoy := (now() at time zone 'Europe/Madrid')::date;

      select count(*) into v_publicadas
      from public.noticias
      where publicado_at is not null
        and (publicado_at at time zone 'Europe/Madrid')::date = v_hoy
        and id <> new.id;

      if v_publicadas >= 3 then
        raise exception 'Límite diario alcanzado: ya se han publicado 3 noticias hoy (%, hora de Madrid). La siguiente podrá publicarse a partir de las 00:00.', to_char(v_hoy, 'DD/MM/YYYY')
          using errcode = 'P0001';
      end if;

      new.publicado_at    := now();
      new.revisado_por    := auth.uid();
      new.revisado_at     := now();
      new.motivo_descarte := null;

    elsif new.estado = 'descartada' then
      new.revisado_por := auth.uid();
      new.revisado_at  := now();

    elsif new.estado = 'retirada' then
      new.retirada_at := now();
    end if;
  end if;

  return new;
end;
$fn$;

comment on function public.noticias_guarda() is
  'Trigger BEFORE de noticias: fuerza candidata para quien no modera, limita las transiciones, sella revisión/publicación/retirada, exige fuente activa y aplica el límite de 3 publicaciones por día (Europe/Madrid). No es SECURITY DEFINER a propósito.';

-- 3. Registro automático de altas y cambios de estado.
--
--    SECURITY DEFINER: quien dispara el cambio (moderación con su sesión) no
--    tiene privilegio de escritura sobre noticias_registro.
create function public.noticias_registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $fn$
declare
  v_previo text;
begin
  if tg_op = 'INSERT' then
    insert into public.noticias_registro (evento, noticia_id, url, lote, actor_id, detalle)
    values (
      case new.origen when 'manual' then 'alta_manual' else 'importada' end,
      new.id,
      new.url_original,
      new.lote_importacion,
      auth.uid(),
      jsonb_build_object('origen', new.origen, 'fuente_id', new.fuente_id, 'pais_code', new.pais_code)
    );
    v_previo := 'candidata';
  else
    v_previo := old.estado;
  end if;

  if new.estado is distinct from v_previo then
    insert into public.noticias_registro (evento, noticia_id, url, lote, actor_id, detalle)
    values (
      case new.estado
        when 'publicada'  then 'aprobada'
        when 'descartada' then 'descartada'
        when 'retirada'   then 'retirada'
      end,
      new.id,
      new.url_original,
      new.lote_importacion,
      auth.uid(),
      jsonb_strip_nulls(jsonb_build_object(
        'estado_anterior', v_previo,
        'estado_nuevo', new.estado,
        'motivo', case new.estado
                    when 'descartada' then new.motivo_descarte
                    when 'retirada'   then new.motivo_retirada
                  end
      ))
    );
  end if;

  return null;
end;
$fn$;

comment on function public.noticias_registrar_cambio() is
  'Trigger AFTER de noticias: deja en noticias_registro el alta (importada / alta_manual) y cada cambio de estado (aprobada / descartada / retirada).';

create trigger trg_noticias_guarda
  before insert or update on public.noticias
  for each row execute function public.noticias_guarda();

create trigger trg_noticias_registro
  after insert or update on public.noticias
  for each row execute function public.noticias_registrar_cambio();
