-- Castings: cierre del vocabulario de `estado` y publicación automática según
-- verificación del perfil organizador.
--
-- Motivación: `public.castings.estado` es text libre con DEFAULT 'pendiente' y
-- sin CHECK, de modo que acepta cualquier cadena y el valor por defecto no
-- pertenece a ningún vocabulario acordado. Al mismo tiempo la política RLS
-- "Castings públicos" decide la visibilidad leyendo `publicado`, una columna
-- que hoy nadie mantiene sincronizada con `estado`: ambas podían divergir.
--
-- Esta migración (a) fija el vocabulario, (b) corrige el DEFAULT a 'borrador' y
-- (c) hace de `publicado` un espejo derivado de `estado`, calculado en el
-- servidor. La política RLS existente NO se toca: sigue leyendo `publicado`,
-- que a partir de ahora es siempre coherente.
--
-- Seguro sobre datos existentes: public.castings tiene 0 filas en el momento de
-- aplicarse, así que ninguna fila puede violar el CHECK ni necesita backfill.
--
-- Fuera de alcance deliberado: no se toca public.casting_applications (su
-- columna `status` ya tiene su propio CHECK correcto), no se implementan
-- notificaciones y no se restringe por `tipo_perfil` — cualquier perfil puede
-- crear un casting.

-- 1. Vocabulario de estado.
--
--    borrador            el organizador aún lo está redactando (nuevo DEFAULT)
--    pendiente_revision  enviado a publicar; esperando decisión
--    publicado           visible públicamente (publicado = true)
--    rechazado           moderación lo ha denegado
--    cerrado             convocatoria terminada
--    cancelado           retirado por el organizador
--
--    El antiguo DEFAULT 'pendiente' desaparece: no pertenece al vocabulario y
--    no existe ninguna fila que lo use.
alter table public.castings
  alter column estado set default 'borrador';

alter table public.castings
  drop constraint if exists castings_estado_check;

alter table public.castings
  add constraint castings_estado_check check (
    estado = any (array[
      'borrador',
      'pendiente_revision',
      'publicado',
      'rechazado',
      'cerrado',
      'cancelado'
    ])
  );

comment on column public.castings.estado is
  'Ciclo de vida del casting. Vocabulario cerrado por castings_estado_check.';
comment on column public.castings.publicado is
  'Derivada de `estado`: la mantiene el trigger trg_castings_sync_estado. No escribir a mano; la política RLS "Castings públicos" depende de ella.';

-- 2. Decisión de publicación y sincronización de `publicado`.
--
--    La aplicación siempre envía estado = 'pendiente_revision' cuando el
--    organizador pide publicar. El servidor decide el desenlace:
--      - profiles.verificado = true  -> asciende a 'publicado' sin espera
--      - en caso contrario           -> permanece en 'pendiente_revision'
--                                       hasta que moderación lo resuelva
--
--    `security definer` porque la función lee public.profiles de otro usuario
--    (moderación actuando sobre un casting ajeno) y las políticas RLS de
--    profiles no tienen por qué permitirlo. `set search_path` fijado, como en
--    el resto de funciones definer del proyecto.
create or replace function public.castings_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  es_verificado boolean;
begin
  if new.estado = 'pendiente_revision' then
    select verificado into es_verificado
    from public.profiles
    where id = new.user_id;

    -- es_verificado nulo (perfil ausente) se trata como no verificado.
    if es_verificado then
      new.estado := 'publicado';
    end if;
  end if;

  new.publicado := (new.estado = 'publicado');
  return new;
end;
$$;

drop trigger if exists trg_castings_sync_estado on public.castings;

create trigger trg_castings_sync_estado
  before insert or update of estado on public.castings
  for each row
  execute function public.castings_sync_estado();
