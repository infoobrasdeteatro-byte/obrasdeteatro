-- Convocatorias, 1 de 3: vocabulario y ciclo de vida.
--
-- public.calls existe desde el baseline (20260708000000) y no se ha tocado
-- desde entonces: ninguna migración posterior la modifica y ninguna línea de
-- código la consulta. Está creada y sin estrenar. Estas tres migraciones la
-- ponen en condiciones de sostener el módulo descrito en la sección 3.5 de
-- ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v2.0.
--
-- La tabla tiene 0 filas, así que todos los cambios de vocabulario y de tipo
-- son limpios: no hay remapeo de datos ni fila que pueda violar un CHECK.
--
-- NOMENCLATURA MIXTA, A SABIENDAS. La tabla está en inglés (title, location,
-- deadline, is_published) y las columnas que se añaden aquí van en castellano
-- (estado, moderacion_entrada_at), igual que en castings. Se mantiene el
-- criterio de cada lado en vez de traducir media tabla: renombrar columnas ya
-- existentes sería un cambio mayor sin beneficio funcional.

-- 1. Categoría.
--
--    El baseline la llamó `call_type` y le dio un vocabulario que no es el de
--    la especificación: 'residencia','premio','subvencion','festival','otro'.
--    La spec pide exactamente cuatro: festival, premio, residencia, beca.
--
--    Se RENOMBRA a `category` para seguir el nombre de la spec, que es el
--    documento congelado. Es el momento menos disruptivo posible para hacerlo:
--    cero filas y cero referencias en código. Aplazarlo significaría tener que
--    tocar además los tipos generados y todo lo que se escriba encima.
--
--    `subvencion` y `otro` desaparecen sin remapeo porque no hay nada que
--    remapear. Si algún día se echa en falta un cajón de sastre, añadirlo será
--    ampliar el CHECK, no recuperar datos.
alter table public.calls
  drop constraint if exists calls_call_type_check;

alter table public.calls
  rename column call_type to category;

alter table public.calls
  add constraint calls_category_check check (
    category = any (array['festival', 'premio', 'residencia', 'beca'])
  );

comment on column public.calls.category is
  'Categoria de la convocatoria. Vocabulario cerrado por calls_category_check. NULL = sin categorizar todavia (la columna admite nulos desde el baseline).';

-- 2. Ciclo de vida.
--
--    Mismo vocabulario que castings_estado_check, y por la misma razón: sin un
--    estado explícito no se puede distinguir un borrador de algo en revisión,
--    ni dejar constancia de un rechazo. `is_published` solo sabía decir sí o no.
alter table public.calls
  add column if not exists estado text not null default 'borrador';

alter table public.calls
  add constraint calls_estado_check check (
    estado = any (array[
      'borrador',
      'pendiente_revision',
      'publicado',
      'rechazado',
      'cerrado',
      'cancelado'
    ])
  );

comment on column public.calls.estado is
  'Ciclo de vida de la convocatoria. Vocabulario cerrado por calls_estado_check.';
comment on column public.calls.is_published is
  'Derivada de `estado`: la mantiene el trigger trg_calls_sync_estado. No escribir a mano; la politica RLS "Convocatorias públicas" depende de ella.';

-- 3. El premio deja de ser una cifra.
--
--    `prize_amount numeric` obliga a un número, y un premio real casi nunca lo
--    es: "2.000 € y residencia de dos semanas", "dotación por determinar",
--    "publicación del texto". Mismo problema y misma solución que `importe` en
--    castings, que es text por este motivo.
alter table public.calls
  rename column prize_amount to prize;

alter table public.calls
  alter column prize type text using prize::text;

comment on column public.calls.prize is
  'Dotacion declarada, en texto libre: no siempre es una cifra. NULL = sin dotacion declarada.';

-- 4. Entrada en la cola de moderación.
--
--    Marca CUÁNDO entró a revisión, que es lo único que hace falta para que la
--    cola pueda señalar las que llevan más de 48 horas esperando. No se
--    automatiza nada más: por decisión de producto, pasadas las 48 horas la
--    convocatoria NO se publica sola -- se queda pendiente y se marca como
--    retrasada. La moderación previa es obligatoria de verdad.
alter table public.calls
  add column if not exists moderacion_entrada_at timestamptz;

comment on column public.calls.moderacion_entrada_at is
  'Momento en que la convocatoria entro en pendiente_revision. Solo sirve para medir el retraso frente al SLA de 48 h en la cola; no dispara ninguna publicacion automatica.';

-- 5. El trigger que deriva `is_published`.
--
--    De momento solo hace dos cosas: mantener el espejo y sellar la entrada en
--    la cola. El guard de moderación y el cupo por plan llegan en la siguiente
--    migración, sobre esta misma función.
create or replace function public.calls_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  -- Se sella al ENTRAR en la cola, no cada vez que se guarda estando en ella:
  -- si no, cualquier reedicion reiniciaria el contador de las 48 horas.
  if new.estado = 'pendiente_revision'
     and (tg_op = 'INSERT' or old.estado is distinct from 'pendiente_revision')
  then
    new.moderacion_entrada_at := now();
  end if;

  new.is_published := (new.estado = 'publicado');
  return new;
end;
$$;

comment on function public.calls_sync_estado() is
  'Deriva is_published de estado y sella la entrada en la cola de moderacion. Ampliada en la migracion siguiente con el guard de moderacion y el cupo mensual.';

drop trigger if exists trg_calls_sync_estado on public.calls;

create trigger trg_calls_sync_estado
  before insert or update of estado
  on public.calls
  for each row
  execute function public.calls_sync_estado();
