-- Castings: sello editorial propio y guard de moderación en el servidor.
--
-- Corrige dos huecos de 20260911135109_castings_estado_check_y_publicacion_automatica.sql:
--
-- (1) Aquella migración condicionaba la auto-publicación a `profiles.verificado`,
--     pero `verificado` NO es un sello curatorial: SEC-001
--     (20260803120000_sec001_gate_public_profile_on_email_confirmation.sql)
--     instaló un trigger sobre auth.users que lo pone a true en cuanto el
--     usuario confirma su correo. 18 de 36 perfiles lo tenían a true por el
--     mero hecho de haberse registrado, de modo que la cola de moderación
--     quedaba vacía en la práctica. Se separa el sello editorial en una
--     columna propia y `verificado` se queda como está, significando
--     exactamente lo que significa: email confirmado.
--
-- (2) La política RLS "Casting propio" es ALL con auth.uid() = user_id, así
--     que el organizador podía hacer UPDATE ... SET estado = 'publicado' y
--     saltarse la revisión: el trigger solo ASCENDÍA desde
--     'pendiente_revision', no impedía el salto directo. La regla "la app
--     siempre envía pendiente_revision" era una convención de cliente, no una
--     garantía de servidor. El guard pasa a vivir dentro del trigger, que se
--     ejecuta sea cual sea el camino de escritura.
--
-- No se tocan las políticas RLS ("Casting propio" y "Castings públicos" siguen
-- igual, y `publicado` sigue siendo la columna derivada que lee la segunda),
-- ni public.casting_applications, ni public.profiles.verificado.

-- 1. Sello editorial, separado de la confirmación de correo.
--
--    Nace a false para TODOS los perfiles, incluidos los 18 que tienen
--    verificado = true: nadie hereda el sello por haber confirmado su email.
--    Efecto inmediato y buscado: a partir de aquí ningún casting se
--    auto-publica hasta que moderación otorgue el sello a alguien.
alter table public.profiles
  add column if not exists verificado_editorial boolean not null default false;

comment on column public.profiles.verificado_editorial is
  'Sello curatorial otorgado por moderación: habilita la publicación automática de castings. Distinto de `verificado`, que solo indica email confirmado (ver SEC-001).';

-- 2. Trigger: guard de moderación + decisión de publicación.
--
--    Orden de evaluación deliberado:
--      a) Si se pretende fijar un estado reservado a moderación
--         ('publicado' o 'rechazado') sin rol admin/moderator, el valor se
--         redirige a 'pendiente_revision'. Se redirige en vez de lanzar
--         excepción para que la petición del organizador no falle: su casting
--         queda encolado, que es justo lo que quería pedir.
--      b) Sobre el estado ya saneado se aplica la regla normal: si el perfil
--         organizador tiene el sello editorial, asciende a 'publicado'.
--      c) `publicado` se recalcula siempre como espejo de `estado`.
--
--    Los estados 'borrador', 'cerrado' y 'cancelado' no pasan por el guard:
--    son decisiones legítimas del propio organizador sobre su convocatoria.
--
--    `security definer` porque la función lee public.profiles y
--    public.profile_roles por encima de las políticas RLS de esas tablas;
--    `search_path` fijado, como en el resto de funciones definer del proyecto.
create or replace function public.castings_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  es_verificado boolean;
  es_moderador boolean;
begin
  -- (a) Guard: 'publicado' y 'rechazado' son potestad de moderación.
  if new.estado in ('publicado', 'rechazado') then
    select exists (
      select 1
      from public.profile_roles
      where profile_id = auth.uid()
        and role in ('admin', 'moderator')
    ) into es_moderador;

    if not es_moderador then
      new.estado := 'pendiente_revision';
    end if;
  end if;

  -- (b) Decisión de publicación automática sobre el estado ya saneado.
  if new.estado = 'pendiente_revision' then
    select verificado_editorial into es_verificado
    from public.profiles
    where id = new.user_id;

    -- es_verificado nulo (perfil ausente) se trata como no verificado.
    if es_verificado then
      new.estado := 'publicado';
    end if;
  end if;

  -- (c) `publicado` nunca se escribe a mano: se deriva de `estado`.
  new.publicado := (new.estado = 'publicado');
  return new;
end;
$$;

-- El trigger trg_castings_sync_estado ya existe desde la migración anterior
-- (before insert or update of estado) y sigue sirviendo sin cambios: solo se
-- ha reemplazado el cuerpo de la función que invoca.

-- 3. Primer moderador, para poder revisar la cola sin esperar a un panel.
--    public.profile_roles tiene UNIQUE (profile_id, role), así que la
--    reaplicación de esta migración es inocua.
insert into public.profile_roles (profile_id, role)
values ('5c9eafc3-b5b2-41cb-b8be-b8a0e46ebb87', 'admin')
on conflict (profile_id, role) do nothing;
