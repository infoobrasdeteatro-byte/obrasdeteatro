-- Tareas en el Master Control (fase 3).
--
-- Cualquier cosa que requiera acción (un correo, una cola, un semáforo, algo
-- de la actividad o una tarea manual) se convierte en una tarea, se asigna a
-- una persona del equipo (admin o moderator) o al agente automático y se
-- sigue hasta resolverla. Cada cambio de estado o asignación deja una nota.
--
-- · admin: lee y gestiona todo.
-- · moderator: lee y cambia el ESTADO (y añade notas) solo de las tareas
--   asignadas a sí mismo, nunca las que vienen de un correo (el correo es
--   solo de admin). Puede crear tareas para sí mismo que no vengan de un
--   correo; asignar a otros o al agente es solo de admin.
-- · Nadie más ve nada. El agente usa la clave de servicio desde
--   /api/admin/agente/tareas, filtrando siempre por asignado_tipo = 'agente';
--   aun así, el trigger solo le deja cambiar el estado.
-- · Una sola tarea abierta (pendiente o en curso) por origen.
--
-- Necesita es_admin() y es_moderador() (20261029120000_correos_entrantes y
-- 20260911203312_castings_moderacion_sin_recursion_rls).

-- 1. Tablas ──────────────────────────────────────────────────────────────────
create table if not exists public.tareas_admin (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(btrim(titulo)) between 1 and 200),
  descripcion    text check (descripcion is null or length(descripcion) <= 4000),
  origen_tipo    text not null default 'manual' check (origen_tipo in ('correo', 'cola', 'salud', 'actividad', 'manual')),
  origen_ref     text check (origen_ref is null or length(origen_ref) between 1 and 200),
  -- Solo rutas internas: «/admin/…», nunca «//otro-sitio» ni una URL completa.
  origen_enlace  text check (origen_enlace is null or (origen_enlace ~ '^/[^/\\]' and length(origen_enlace) <= 500)),
  asignado_tipo  text check (asignado_tipo in ('persona', 'agente')),
  asignado_a     uuid references public.profiles (id) on delete set null,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'resuelta', 'descartada')),
  prioridad      text not null default 'normal' check (prioridad in ('baja', 'normal', 'alta', 'urgente')),
  fecha_limite   date,
  creado_por     uuid references public.profiles (id) on delete set null,
  resuelta_por   uuid references public.profiles (id) on delete set null,
  resuelta_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- asignado_a solo tiene sentido si se asigna a una persona.
  constraint tareas_admin_asignado_coherente check (asignado_a is null or asignado_tipo = 'persona')
);

comment on table public.tareas_admin is
  'Tareas del Master Control. admin ve y gestiona todo; moderator solo las asignadas a sí mismo y nunca las de origen correo; el agente, por /api/admin/agente con la clave de servicio, solo las de asignado_tipo = agente.';
comment on column public.tareas_admin.origen_ref is 'Id del correo, clave de la cola o del semáforo de origen. Con origen_tipo, identifica el origen para no duplicar tareas abiertas.';

-- Una sola tarea abierta por origen.
create unique index if not exists tareas_admin_origen_abierta_unica
  on public.tareas_admin (origen_tipo, origen_ref)
  where origen_ref is not null and estado in ('pendiente', 'en_curso');

create index if not exists tareas_admin_asignado_idx on public.tareas_admin (asignado_tipo, asignado_a, estado);
create index if not exists tareas_admin_estado_idx on public.tareas_admin (estado, prioridad, fecha_limite);

create table if not exists public.tareas_admin_notas (
  id          uuid primary key default gen_random_uuid(),
  tarea_id    uuid not null references public.tareas_admin (id) on delete cascade,
  autor       uuid references public.profiles (id) on delete set null,
  autor_tipo  text not null check (autor_tipo in ('persona', 'agente')),
  -- comentario: lo escribe alguien; estado / asignacion: las deja el trigger.
  tipo        text not null default 'comentario' check (tipo in ('comentario', 'estado', 'asignacion')),
  texto       text not null check (length(btrim(texto)) between 1 and 4000),
  created_at  timestamptz not null default now()
);

comment on table public.tareas_admin_notas is
  'Historial de una tarea: comentarios y, automáticamente, cambios de estado y de asignación. autor null y autor_tipo agente si la escribe el agente.';

create index if not exists tareas_admin_notas_tarea_idx on public.tareas_admin_notas (tarea_id, created_at);

-- 2. Reglas (trigger) ───────────────────────────────────────────────────────
-- ¿La cuenta tiene rol de equipo? Para validar a quién se asigna.
create or replace function public.es_equipo(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (select 1 from public.profile_roles where profile_id = p_id and role in ('admin', 'moderator'))
$$;

revoke all on function public.es_equipo(uuid) from public;
grant execute on function public.es_equipo(uuid) to authenticated, service_role;

create or replace function public.tareas_admin_guarda()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_admin boolean := public.es_admin();
begin
  -- Al borrar un perfil, las claves foráneas ponen a null asignado_a,
  -- creado_por o resuelta_por con un UPDATE interno (desde su propio
  -- trigger): no es un cambio de nadie, se deja pasar tal cual.
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    if new.asignado_a is null and old.asignado_a is not null then
      new.asignado_tipo := null; -- la cuenta asignada se dio de baja: queda sin asignar
    end if;
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.resuelta_por := null;
    new.resuelta_at := case when new.estado = 'resuelta' then now() end;
    new.created_at := now();
  else
    -- moderator (y el agente, que no tiene sesión): solo el estado.
    if not v_admin and (
         new.titulo is distinct from old.titulo or new.descripcion is distinct from old.descripcion
      or new.origen_tipo is distinct from old.origen_tipo or new.origen_ref is distinct from old.origen_ref
      or new.origen_enlace is distinct from old.origen_enlace or new.asignado_tipo is distinct from old.asignado_tipo
      or new.asignado_a is distinct from old.asignado_a or new.prioridad is distinct from old.prioridad
      or new.fecha_limite is distinct from old.fecha_limite or new.creado_por is distinct from old.creado_por
    ) then
      raise exception 'Solo administración puede cambiar algo más que el estado de una tarea.' using errcode = '42501';
    end if;
    new.creado_por := old.creado_por;
    new.created_at := old.created_at;
    if new.estado = 'resuelta' and old.estado is distinct from 'resuelta' then
      new.resuelta_at := now();
      new.resuelta_por := auth.uid();
    elsif new.estado <> 'resuelta' and old.estado = 'resuelta' then
      new.resuelta_at := null;
      new.resuelta_por := null;
    else
      new.resuelta_at := old.resuelta_at;
      new.resuelta_por := old.resuelta_por;
    end if;
  end if;
  new.updated_at := now();

  -- Solo se asigna a cuentas del equipo, y las tareas de un correo solo a admin.
  if new.asignado_tipo = 'persona' and new.asignado_a is not null
     and (tg_op = 'INSERT' or new.asignado_a is distinct from old.asignado_a or new.origen_tipo is distinct from old.origen_tipo) then
    if not public.es_equipo(new.asignado_a) then
      raise exception 'Solo se puede asignar a una cuenta con rol admin o moderator.' using errcode = '22023';
    end if;
    if new.origen_tipo = 'correo' and not exists (select 1 from public.profile_roles where profile_id = new.asignado_a and role = 'admin') then
      raise exception 'Una tarea de un correo solo se puede asignar a administración.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tareas_admin_guarda on public.tareas_admin;
create trigger tareas_admin_guarda
  before insert or update on public.tareas_admin
  for each row execute function public.tareas_admin_guarda();

-- Notas automáticas de cada cambio de estado o de asignación.
create or replace function public.tareas_admin_historial()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_autor uuid := auth.uid();
  v_tipo text := case when auth.uid() is null then 'agente' else 'persona' end;
  v_etiqueta jsonb := '{"pendiente":"pendiente","en_curso":"en curso","resuelta":"resuelta","descartada":"descartada"}';
  v_destino text;
begin
  -- Actualizaciones internas de las claves foráneas (perfil borrado): sin
  -- nota. Sin sesión y quitando la asignación solo puede ser eso, porque el
  -- agente no puede cambiar la asignación (lo impide tareas_admin_guarda).
  if pg_trigger_depth() > 1
     or (auth.uid() is null and old.asignado_a is not null and new.asignado_a is null
         and new.asignado_tipo is null and new.estado = old.estado) then
    return null;
  end if;
  if new.estado is distinct from old.estado then
    insert into public.tareas_admin_notas (tarea_id, autor, autor_tipo, tipo, texto)
    values (new.id, v_autor, v_tipo, 'estado',
            'Estado: ' || (v_etiqueta ->> old.estado) || ' → ' || (v_etiqueta ->> new.estado));
  end if;
  if new.asignado_tipo is distinct from old.asignado_tipo or new.asignado_a is distinct from old.asignado_a then
    v_destino := case
      when new.asignado_tipo = 'agente' then 'el agente automático'
      when new.asignado_tipo = 'persona' then coalesce(
        (select coalesce(nullif(btrim(p.nombre_artistico), ''), nullif(btrim(concat_ws(' ', p.nombre, p.apellidos)), ''))
           from public.profiles p where p.id = new.asignado_a), 'una persona del equipo')
      else 'nadie' end;
    insert into public.tareas_admin_notas (tarea_id, autor, autor_tipo, tipo, texto)
    values (new.id, v_autor, v_tipo, 'asignacion', 'Asignada a ' || v_destino);
  end if;
  return null;
end;
$$;

drop trigger if exists tareas_admin_historial on public.tareas_admin;
create trigger tareas_admin_historial
  after update on public.tareas_admin
  for each row execute function public.tareas_admin_historial();

-- 3. Permisos y RLS ─────────────────────────────────────────────────────────
alter table public.tareas_admin enable row level security;
alter table public.tareas_admin_notas enable row level security;

revoke all on public.tareas_admin, public.tareas_admin_notas from anon, authenticated;
grant select, insert, delete on public.tareas_admin to authenticated;
grant update (titulo, descripcion, origen_tipo, origen_ref, origen_enlace, asignado_tipo, asignado_a, estado, prioridad, fecha_limite)
  on public.tareas_admin to authenticated;
grant select, insert on public.tareas_admin_notas to authenticated;
grant select, insert, update, delete on public.tareas_admin, public.tareas_admin_notas to service_role;

-- ¿La sesión puede ver esta tarea? (mismo criterio en tareas y notas)
--   admin: todas; moderator: las suyas que no vienen de un correo.
drop policy if exists "Equipo lee sus tareas" on public.tareas_admin;
create policy "Equipo lee sus tareas"
  on public.tareas_admin for select
  to authenticated
  using (
    public.es_admin()
    or (public.es_moderador() and asignado_tipo = 'persona' and asignado_a = auth.uid() and origen_tipo <> 'correo')
  );

drop policy if exists "Equipo crea tareas" on public.tareas_admin;
create policy "Equipo crea tareas"
  on public.tareas_admin for insert
  to authenticated
  with check (
    public.es_admin()
    or (public.es_moderador() and asignado_tipo = 'persona' and asignado_a = auth.uid() and origen_tipo <> 'correo')
  );

drop policy if exists "Equipo actualiza sus tareas" on public.tareas_admin;
create policy "Equipo actualiza sus tareas"
  on public.tareas_admin for update
  to authenticated
  using (
    public.es_admin()
    or (public.es_moderador() and asignado_tipo = 'persona' and asignado_a = auth.uid() and origen_tipo <> 'correo')
  )
  with check (
    public.es_admin()
    or (public.es_moderador() and asignado_tipo = 'persona' and asignado_a = auth.uid() and origen_tipo <> 'correo')
  );

drop policy if exists "Administración borra tareas" on public.tareas_admin;
create policy "Administración borra tareas"
  on public.tareas_admin for delete
  to authenticated
  using (public.es_admin());

-- Notas: se ven y se escriben en las tareas que la sesión puede ver
-- (la subconsulta pasa por la RLS de tareas_admin). Solo comentarios propios.
drop policy if exists "Equipo lee las notas de sus tareas" on public.tareas_admin_notas;
create policy "Equipo lee las notas de sus tareas"
  on public.tareas_admin_notas for select
  to authenticated
  using (exists (select 1 from public.tareas_admin t where t.id = tarea_id));

drop policy if exists "Equipo comenta sus tareas" on public.tareas_admin_notas;
create policy "Equipo comenta sus tareas"
  on public.tareas_admin_notas for insert
  to authenticated
  with check (
    autor = auth.uid() and autor_tipo = 'persona' and tipo = 'comentario'
    and exists (select 1 from public.tareas_admin t where t.id = tarea_id)
  );
