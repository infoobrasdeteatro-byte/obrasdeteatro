-- Convocatorias: el cupo mensual del plan gratuito pasa a ser FIJO.
--
-- La decisión de producto del 16/09 (20260916132241) fue un cupo MENSUAL, no
-- concurrente: 3 publicaciones por mes natural, y "no se libera nada al
-- cerrar una convocatoria". La implementación no lo cumplía, porque
-- cupo_mensual_convocatorias_agotado() contaba las filas de `calls` que SIGUEN
-- en estado 'publicado'. Había tres formas de recuperar plaza dentro del mes:
--
--   1. Cerrar o cancelar una convocatoria (deja de estar 'publicado').
--   2. Borrarla: la política "Convocatoria propia - borrado" permite al
--      autor un DELETE físico de sus filas.
--   3. Vaciar o atrasar `fecha_publicacion`: el autor puede editar esa
--      columna con un UPDATE, y el trigger no se dispara porque solo vigila
--      estado, is_featured, title y description.
--
-- Contar en `calls` sin filtrar por estado solo arreglaba la primera. Por
-- eso el cupo se cuenta en un registro propio, `calls_publicaciones`, donde
-- solo escribe el trigger (SECURITY DEFINER) y que el autor no puede leer,
-- editar ni borrar. Tiene una fila por convocatoria, sellada la PRIMERA vez
-- que se publica, y se conserva aunque la convocatoria se cierre, se borre o
-- se le cambie la fecha.
--
-- Republicar no consume cupo: la comprobación solo se hace en la primera
-- publicación, que es cuando nace la fila del registro. Así se mantiene lo
-- que ya decía la migración original sobre republicar algo viejo.
--
-- El mes natural se sigue calculando con date_trunc('month', now()) en la
-- zona horaria de la base (UTC), igual que antes.

-- 1. Registro de primeras publicaciones.
create table if not exists public.calls_publicaciones (
  call_id uuid primary key,  -- sin FK a propósito: la fila debe sobrevivir al DELETE de la convocatoria
  profile_id uuid not null references public.profiles (id) on delete cascade,
  publicada_at timestamptz not null default now()
);

comment on table public.calls_publicaciones is
  'Una fila por convocatoria, sellada en su PRIMERA publicación por calls_sync_estado(). Es la base del cupo mensual del plan gratuito: no cambia al cerrar, cancelar, borrar ni reeditar la convocatoria. Sin políticas RLS a propósito: solo la leen y escriben funciones SECURITY DEFINER.';

create index if not exists calls_publicaciones_profile_mes_idx
  on public.calls_publicaciones (profile_id, publicada_at);

alter table public.calls_publicaciones enable row level security;
-- Sin políticas: ni anon ni authenticated pueden leer ni escribir directamente.

-- Convocatorias ya publicadas alguna vez (hoy ninguna en producción). Se usa su
-- fecha de primera publicación para que no pierdan el mes en que la gastaron.
insert into public.calls_publicaciones (call_id, profile_id, publicada_at)
select id, profile_id, fecha_publicacion
from public.calls
where fecha_publicacion is not null
on conflict (call_id) do nothing;

-- 2. Cuántas primeras publicaciones lleva un perfil en el mes natural en curso.
create or replace function public.convocatorias_publicadas_en_mes(p_profile uuid)
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select count(*)::integer
  from public.calls_publicaciones
  where profile_id = p_profile
    and publicada_at >= date_trunc('month', now());
$$;

comment on function public.convocatorias_publicadas_en_mes(uuid) is
  'Primeras publicaciones de convocatorias del perfil en el mes natural en curso, contadas en calls_publicaciones. No baja al cerrar, cancelar, borrar ni reeditar una convocatoria.';

-- Uso interno (trigger y funciones de la base): no se expone a clientes, que
-- podrían consultar el recuento de cualquier perfil.
revoke execute on function public.convocatorias_publicadas_en_mes(uuid) from public, anon, authenticated;

-- 3. ¿Agotó el autor su cupo del mes? Misma firma y mismo significado; solo
--    cambia de dónde cuenta.
create or replace function public.cupo_mensual_convocatorias_agotado(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select
    (select plan from public.profiles where id = p_profile) = 'gratuito'
    and public.convocatorias_publicadas_en_mes(p_profile) >= 3;
$$;

comment on function public.cupo_mensual_convocatorias_agotado(uuid) is
  'True si ese perfil es de plan gratuito y ya ha publicado por primera vez 3 convocatorias dentro del mes natural en curso (calls_publicaciones). Cerrar, cancelar, borrar o reeditar no libera plaza. Premium y superiores no tienen techo.';

-- 4. El recuento propio, para que la interfaz enseñe la misma cifra que aplica
--    la base en vez de repetir la cuenta en el cliente. Sin parámetro: siempre
--    es el de quien consulta.
create or replace function public.mis_convocatorias_publicadas_en_mes()
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
    when auth.uid() is null then 0
    else public.convocatorias_publicadas_en_mes(auth.uid())
  end;
$$;

comment on function public.mis_convocatorias_publicadas_en_mes() is
  'Primeras publicaciones de convocatorias de quien consulta en el mes natural en curso. La usan /mis-convocatorias y /convocatoria/nueva para enseñar el cupo.';

revoke execute on function public.mis_convocatorias_publicadas_en_mes() from public, anon;
grant execute on function public.mis_convocatorias_publicadas_en_mes() to authenticated;

-- 5. El trigger. Idéntico a 20260917170313 salvo en dos puntos, marcados con
--    [cupo fijo]:
--      - el cupo solo se comprueba en la PRIMERA publicación (no existe fila
--        en calls_publicaciones), así que republicar no consume ni se bloquea;
--      - la primera publicación deja su fila en calls_publicaciones.
create or replace function public.calls_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_regla_motivo text;
begin
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
    if public.cupo_mensual_convocatorias_agotado(new.profile_id) then
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
