-- Convocatorias, 2 de 3: moderación obligatoria, cupo mensual y destacado.
--
-- Las reglas de negocio de la sección 3.5, puestas donde no se puedan esquivar.
-- La lección de Castings vale entera aquí: la política RLS del autor es FOR
-- ALL, así que sin un guard en el trigger "la app siempre envía
-- pendiente_revision" no es una garantía, es una convención de cliente que se
-- salta con un UPDATE.
--
-- Y la moderación previa solo es obligatoria de verdad si también lo es DESPUÉS
-- de aprobar: por eso el trigger vigila además el texto de las publicadas. En
-- Castings ese hueco se descubrió con el módulo ya en producción; aquí entra
-- cerrado desde el primer día.

-- 1. Cuándo se publicó por primera vez.
--
--    El cupo es MENSUAL, no concurrente: cuenta publicaciones ocurridas dentro
--    del mes natural, y no se libera nada al cerrar una convocatoria. Eso
--    obliga a saber cuándo se publicó cada una, y `created_at` no sirve: una
--    convocatoria puede crearse en enero y aprobarse en marzo.
--
--    Se sella SOLO la primera vez. Si se despublica y se vuelve a publicar, la
--    fecha original se conserva -- de lo contrario republicar algo viejo
--    consumiria cupo del mes en curso dos veces.
alter table public.calls
  add column if not exists fecha_publicacion timestamptz;

comment on column public.calls.fecha_publicacion is
  'Momento de la PRIMERA publicacion. No se reescribe al republicar. Es la base del cupo mensual; created_at no sirve porque crear y publicar pueden caer en meses distintos.';

-- 2. ¿Agotó el autor su cupo del mes?
--
--    Solo el plan gratuito tiene techo: 3 publicaciones por mes natural
--    (date_trunc, no ventana movil de 30 dias). Premium, Destacado y Empresa,
--    sin limite -- a diferencia de Castings, donde el plan gratuito no podia
--    publicar en absoluto.
--
--    SECURITY DEFINER porque lee profiles.plan y el resto de convocatorias del
--    autor por encima de RLS: quien aprueba es un moderador, y no tiene por que
--    poder ver el plan de esa persona ni sus borradores.
create or replace function public.cupo_mensual_convocatorias_agotado(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select
    (select plan from public.profiles where id = p_profile) = 'gratuito'
    and (
      select count(*)
      from public.calls
      where profile_id = p_profile
        and estado = 'publicado'
        and fecha_publicacion >= date_trunc('month', now())
    ) >= 3;
$$;

comment on function public.cupo_mensual_convocatorias_agotado(uuid) is
  'True si ese perfil es de plan gratuito y ya tiene 3 convocatorias publicadas dentro del mes natural en curso. Premium y superiores no tienen techo.';

-- 3. ¿Puede este perfil destacar una convocatoria?
--
--    No sirve plan_de_pago(), que solo distingue gratuito de todo lo demas y
--    dejaria destacar a Premium. La spec reserva is_featured a Destacado
--    (pagando aparte) y Empresa (incluido).
--
--    Lleva parametro y no usa auth.uid() a secas a proposito: quien activa el
--    destacado puede ser un moderador, y el plan que manda es el del AUTOR de
--    la convocatoria, no el de quien pulsa el boton. Sin argumento se comporta
--    como se esperaria, mirando a quien consulta.
--
--    ESTA FUNCION NO COBRA NADA. Solo dice quien tiene derecho a activar el
--    campo; el cobro del Destacado es asunto de Stripe y vive fuera de aqui.
create or replace function public.plan_destacado_o_superior(p_profile uuid default null)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from public.profiles
    where id = coalesce(p_profile, auth.uid())
      and plan in ('destacado', 'empresas')
  );
$$;

comment on function public.plan_destacado_o_superior(uuid) is
  'True si el perfil indicado (por defecto, quien consulta) tiene plan destacado o empresas. No sustituye a plan_de_pago(), que no separa premium de destacado.';

-- 4. El trigger, ampliado.
--
--    Orden de decisión, y el orden importa:
--      0) Reedición del texto de una convocatoria ya publicada: vuelve a la
--         cola. Sin esto, la moderación previa se esquiva publicando algo
--         inocuo, esperando la aprobación y reescribiéndolo después -- que es
--         exactamente el hueco que Castings tuvo que cerrar en
--         20260912113102, ya con el módulo en producción.
--      a) Guard: solo admin/moderator pueden fijar 'publicado' o 'rechazado'.
--         Cualquier otro que lo intente acaba en 'pendiente_revision'. Literal
--         como en castings, y por el mismo motivo.
--      b) Cupo: se comprueba sobre el estado YA saneado por (a), y solo en la
--         transicion real a publicado. Si el autor agoto su mes, la aprobacion
--         se aborta con un error en vez de publicar en silencio por encima del
--         limite.
--      c) Destacado: se mira el plan del AUTOR, no el de quien escribe.
--      d) Sellos y espejo.
create or replace function public.calls_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  -- (0) Reeditar el contenido de una convocatoria ya publicada la devuelve a
  --     revisión. Solo cuentan los campos que un moderador lee para decidir:
  --     cambiar el lugar, el plazo o la dotación no reabre la cola.
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

  -- (b) Cupo mensual, solo al pasar realmente a publicado.
  if new.estado = 'publicado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'publicado')
  then
    if public.cupo_mensual_convocatorias_agotado(new.profile_id) then
      raise exception
        'El plan Gratuito permite 3 convocatorias publicadas por mes natural, y este perfil ya las ha agotado. Puede publicarse el mes que viene, o con un plan superior.';
    end if;
  end if;

  -- (c) Destacado: derecho del AUTOR, no de quien escribe.
  if coalesce(new.is_featured, false)
     and not public.plan_destacado_o_superior(new.profile_id)
  then
    raise exception
      'Destacar una convocatoria requiere plan Destacado o Empresa.';
  end if;

  -- (d) Sellos y espejo.
  if new.estado = 'pendiente_revision'
     and (tg_op = 'INSERT' or old.estado is distinct from 'pendiente_revision')
  then
    new.moderacion_entrada_at := now();
  end if;

  if new.estado = 'publicado' and new.fecha_publicacion is null then
    new.fecha_publicacion := now();
  end if;

  new.is_published := (new.estado = 'publicado');
  return new;
end;
$$;

-- La lista de columnas del `of` es la otra mitad de dos de las reglas, no un
-- detalle: una condición que el trigger no llega a evaluar es letra muerta.
--
--   is_featured          sin él, un UPDATE que solo active el destacado no
--                        dispararía el trigger y (c) no se comprobaría.
--   title, description   sin ellos, (0) nunca se ejecutaría en una reedición
--                        de texto, que es justo el caso que cierra.
drop trigger if exists trg_calls_sync_estado on public.calls;

create trigger trg_calls_sync_estado
  before insert or update of estado, is_featured, title, description
  on public.calls
  for each row
  execute function public.calls_sync_estado();
