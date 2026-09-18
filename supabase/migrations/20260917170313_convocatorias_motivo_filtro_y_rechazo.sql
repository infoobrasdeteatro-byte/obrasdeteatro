-- Convocatorias: motivo de retención y motivo de rechazo.
--
-- PARIDAD CON CASTINGS, PERO NO COPIA LITERAL. En castings estas dos columnas
-- existen desde 20260911202739 (motivo_rechazo) y 20260911221521
-- (motivo_filtro), y sin ellas el organizador de una convocatoria rechazada
-- veía el rechazo pero no el porqué: el único hueco funcional que quedaba
-- frente al módulo hermano.
--
-- QUÉ HACE CADA UNA, igual que en castings:
--   motivo_filtro   lo escribe el trigger cuando una regla de
--                   public.moderacion_reglas casa con el texto. Es una
--                   RETENCIÓN automática: lo decidió una regla, todavía no lo
--                   ha visto nadie.
--   motivo_rechazo  lo escribe una persona desde el panel de moderación. Es un
--                   RECHAZO: lo decidió un moderador.
-- Las dos son text y nulas: la ausencia de motivo es un estado legítimo.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA DIFERENCIA DELIBERADA CON CASTINGS, Y POR QUÉ NO SE REPLICA
-- ─────────────────────────────────────────────────────────────────────────
-- castings_sync_estado() hace DOS cosas en la misma rama: evalúa el filtro y,
-- si ninguna regla casa, PUBLICA SOLA la convocatoria sin que la vea nadie.
--
-- Aquí se replica solo la primera. La publicación automática NO se trae, y no
-- es un olvido: 20260916132241 dejó escrito que en Convocatorias «la
-- moderación previa es obligatoria de verdad» y que pasadas las 48 h la
-- convocatoria NO se publica sola, se marca como retrasada. Traer el
-- auto-publish invertiría en silencio esa decisión de producto.
--
-- El efecto práctico: aquí el filtro NO decide si se publica, solo DEJA
-- CONSTANCIA de por qué el moderador debería mirar con atención. Una
-- convocatoria sin motivo_filtro sigue esperando revisión humana.

alter table public.calls
  add column if not exists motivo_filtro text;

alter table public.calls
  add column if not exists motivo_rechazo text;

comment on column public.calls.motivo_filtro is
  'Motivo por el que el filtro automatico retuvo la convocatoria, copiado de moderacion_reglas.motivo. NULL = ninguna regla caso. No implica rechazo: solo senala que revisar.';

comment on column public.calls.motivo_rechazo is
  'Motivo del rechazo, escrito por un moderador desde el panel. NULL = no ha sido rechazada, o se rechazo sin dejar motivo.';

-- El trigger, ampliado con la evaluacion del filtro.
--
-- Orden de decision, y el orden importa:
--   0) Reedicion del texto de una convocatoria publicada: vuelve a la cola.
--   a) Guard de moderacion: solo admin/moderator fijan 'publicado'/'rechazado'.
--   b) FILTRO (nuevo): sobre el estado YA saneado por (a). Mira title y
--      description, que son los dos campos de texto libre que un moderador lee
--      para decidir -- el equivalente de descripcion/sinopsis/perfil_descripcion
--      en castings.
--   c) Cupo mensual, solo en la transicion real a publicado.
--   d) Destacado: derecho del AUTOR, no de quien escribe.
--   e) Sellos y espejo.
create or replace function public.calls_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_regla_motivo text;
begin
  -- (0) Reeditar el contenido de una convocatoria ya publicada la devuelve a
  --     revisión. Solo cuentan los campos que un moderador lee para decidir.
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

  -- (a) Moderación obligatoria.
  if new.estado in ('publicado', 'rechazado') then
    if not public.es_moderador() then
      new.estado := 'pendiente_revision';
    end if;
  end if;

  -- (b) Filtro automático. A diferencia de castings, NO publica: solo deja
  --     constancia de qué regla casó, para que la cola sepa qué mirar. Si
  --     ninguna casa, se limpia el motivo en vez de arrastrar el de un texto
  --     anterior ya corregido.
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

  -- (c) Cupo mensual, solo al pasar realmente a publicado.
  if new.estado = 'publicado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'publicado')
  then
    if public.cupo_mensual_convocatorias_agotado(new.profile_id) then
      raise exception
        'El plan Gratuito permite 3 convocatorias publicadas por mes natural, y este perfil ya las ha agotado. Puede publicarse el mes que viene, o con un plan superior.';
    end if;
  end if;

  -- (d) Destacado: derecho del AUTOR, no de quien escribe.
  if coalesce(new.is_featured, false)
     and not public.plan_destacado_o_superior(new.profile_id)
  then
    raise exception
      'Destacar una convocatoria requiere plan Destacado o Empresa.';
  end if;

  -- (e) Sellos y espejo.
  if new.estado = 'pendiente_revision'
     and (tg_op = 'INSERT' or old.estado is distinct from 'pendiente_revision')
  then
    new.moderacion_entrada_at := now();
  end if;

  if new.estado = 'publicado' and new.fecha_publicacion is null then
    new.fecha_publicacion := now();
  end if;

  -- Una convocatoria publicada no arrastra el motivo de una retención pasada:
  -- si se aprobó, el filtro ya no tiene nada que decir sobre ella.
  if new.estado = 'publicado' then
    new.motivo_filtro := null;
  end if;

  new.is_published := (new.estado = 'publicado');
  return new;
end;
$$;

comment on function public.calls_sync_estado() is
  'Deriva is_published de estado, aplica el guard de moderacion, el filtro automatico (que solo deja motivo, no publica), el cupo mensual y el derecho a destacar, y sella entrada en cola y primera publicacion.';

-- La lista de columnas del `of` es la otra mitad de dos reglas: una condición
-- que el trigger no llega a evaluar es letra muerta. Se mantiene igual que en
-- 20260916132241 -- title y description ya estaban por la regla (0), y ahora
-- sirven además al filtro.
drop trigger if exists trg_calls_sync_estado on public.calls;

create trigger trg_calls_sync_estado
  before insert or update of estado, is_featured, title, description
  on public.calls
  for each row
  execute function public.calls_sync_estado();
