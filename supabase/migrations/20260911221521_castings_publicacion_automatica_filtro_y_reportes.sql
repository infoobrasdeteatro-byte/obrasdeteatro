-- Castings: cambio de modelo de moderacion.
--
-- El modelo anterior (20260911141543) era moderacion PREVIA por sello
-- editorial: nadie publicaba hasta que un humano concedia
-- profiles.verificado_editorial. Se descarta entero. El modelo real es
-- publicacion INMEDIATA para cuentas de pago, con dos contrapesos:
-- un filtro de contenido automatico antes de publicar, y reportes de
-- usuarios despues de publicado.
--
-- Lo que cambia de raiz:
--   - Crear un casting exige plan de pago. Antes lo permitia cualquier perfil.
--   - Publicar deja de esperar a un humano: si el texto no dispara ninguna
--     regla y el perfil no ha agotado su cupo, se publica en el acto.
--   - Un humano solo interviene cuando el filtro retiene algo, o cuando
--     alguien reporta un casting ya publicado.
--   - profiles.verificado_editorial desaparece: era el eje del modelo viejo
--     y ya no significa nada.
--
-- Lo que NO cambia: el guard de 20260911141543 (solo admin/moderator pueden
-- fijar 'publicado' o 'rechazado' directamente) sigue vivo y sigue siendo la
-- primera decision del trigger. El panel /pruebas/moderacion-castings sigue
-- sirviendo sin tocarlo: lee la cola de 'pendiente_revision', que ahora se
-- alimenta del filtro en vez del sello.

-- 1. Reglas del filtro de contenido.
--
--    Viven en una tabla, no en el codigo de la funcion, para poder afinar el
--    filtro sin migraciones: moderacion escribe aqui. `motivo` es lo que se
--    le ensena a quien revisa, y es NULLABLE -- una regla sin motivo declarado
--    retiene igual, solo que sin explicacion (ver el trigger, punto 6).
create table if not exists public.moderacion_reglas (
  id uuid primary key default gen_random_uuid(),
  patron text not null,
  tipo text not null default 'palabra' check (tipo in ('palabra', 'regex')),
  motivo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.moderacion_reglas is
  'Reglas del filtro automatico de castings. Editable por moderacion sin migraciones.';
comment on column public.moderacion_reglas.motivo is
  'Que se le ensena a quien revisa cuando esta regla retiene un casting. NULL = retenido sin motivo declarado.';

alter table public.moderacion_reglas enable row level security;

drop policy if exists "Solo moderación gestiona reglas" on public.moderacion_reglas;

create policy "Solo moderación gestiona reglas" on public.moderacion_reglas
  for all
  using (public.es_moderador())
  with check (public.es_moderador());

-- Semilla inicial. No pretende ser exhaustiva: es el punto de partida que
-- moderacion ira corrigiendo contra casos reales.
insert into public.moderacion_reglas (patron, tipo, motivo)
select v.patron, v.tipo, v.motivo
from (values
  ('pago por adelantado',            'palabra', 'Posible estafa: solicita dinero para participar'),
  ('gastos de gestión',              'palabra', 'Posible estafa: solicita dinero para participar'),
  ('deposita',                       'palabra', 'Posible estafa: solicita datos bancarios'),
  ('número de cuenta',               'palabra', 'Posible estafa: solicita datos bancarios'),
  ('sin experiencia necesaria.*cobra', 'regex', 'Patrón sospechoso de estafa laboral')
) as v(patron, tipo, motivo)
where not exists (
  select 1 from public.moderacion_reglas r where r.patron = v.patron
);

-- 2. Reportes de usuarios sobre castings ya publicados.
--
--    Un reporte NO cambia el estado del casting: solo abre un expediente que
--    un humano resolvera. Es deliberado -- si reportar despublicase, bastaria
--    con reportar para silenciar a un competidor.
create table if not exists public.casting_reportes (
  id uuid primary key default gen_random_uuid(),
  casting_id uuid not null references public.castings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  motivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'revisado')),
  revisado_por uuid references public.profiles(id),
  revisado_en timestamptz,
  created_at timestamptz not null default now(),
  unique (casting_id, reporter_id)
);

comment on table public.casting_reportes is
  'Reportes de usuarios sobre castings publicados. Nunca cambian el estado del casting por si solos: los resuelve moderacion.';

alter table public.casting_reportes enable row level security;

-- Reportar esta abierto a cualquier usuario autenticado, de cualquier plan:
-- quien mas necesita denunciar una convocatoria fraudulenta es justamente
-- quien no paga nada. El UNIQUE (casting_id, reporter_id) impide repetir
-- reporte sobre el mismo casting; no impide el abuso con cuentas multiples,
-- que es un problema distinto y sin resolver aqui.
drop policy if exists "Cualquier usuario reporta" on public.casting_reportes;

create policy "Cualquier usuario reporta" on public.casting_reportes
  for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Moderación gestiona reportes" on public.casting_reportes;

create policy "Moderación gestiona reportes" on public.casting_reportes
  for all
  using (public.es_moderador())
  with check (public.es_moderador());

-- 3. Por que el filtro retuvo un casting.
--
--    NULL = el filtro no lo retuvo, o lo retuvo una regla sin motivo. Es
--    distinto de castings.motivo_rechazo, que lo escribe una persona al
--    rechazar; este lo escribe la maquina al retener.
alter table public.castings
  add column if not exists motivo_filtro text;

comment on column public.castings.motivo_filtro is
  'Motivo por el que el filtro automatico retuvo el casting en pendiente_revision. NULL = no retenido por el filtro. Distinto de motivo_rechazo, que lo redacta una persona.';

-- 4. "Casting propio" se parte en tres politicas, una por comando.
--
--    POR QUE. La politica original era FOR ALL sin restriccion de plan. Las
--    politicas permisivas se combinan con OR, de modo que anadir una politica
--    de INSERT con la condicion de plan no habria restringido nada: la
--    original habria seguido autorizando el INSERT por su cuenta. Para que la
--    condicion de plan muerda hay que RETIRAR la politica ALL.
--
--    Se parte en tres y no en dos porque PostgreSQL 17 no admite varios
--    comandos en una sola clausula FOR (`for select, update` es error de
--    sintaxis 42601), y porque WITH CHECK solo es valido en INSERT y UPDATE:
--    en SELECT y DELETE solo cabe USING.
--
--    Gestionar lo ya creado no exige plan de pago: si alguien baja a
--    gratuito, conserva el control de lo que publico -- puede verlo,
--    editarlo y cerrarlo. Lo unico que pierde es la capacidad de crear mas.
drop policy if exists "Casting propio" on public.castings;

drop policy if exists "Casting propio - lectura" on public.castings;
create policy "Casting propio - lectura" on public.castings
  for select
  using (auth.uid() = user_id);

drop policy if exists "Casting propio - edición" on public.castings;
create policy "Casting propio - edición" on public.castings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Casting propio - borrado" on public.castings;
create policy "Casting propio - borrado" on public.castings
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Casting propio - creación" on public.castings;
create policy "Casting propio - creación" on public.castings
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and plan <> 'gratuito'
    )
  );

-- 5. El trigger deja de mirar el sello editorial.
--
--    Orden de decision:
--      a) Guard de moderacion, intacto desde 20260911141543.
--      b) Filtro de contenido: si alguna regla activa coincide, el casting se
--         queda en 'pendiente_revision' y se anota por que. Un humano decide.
--      c) Cupo del plan: premium 3, destacado 10, empresas sin techo. Superar
--         el cupo NO deja el casting en cola en silencio: aborta la operacion
--         con un error, porque el organizador no esta esperando revision sino
--         topando con un limite comercial que puede resolver el mismo.
--      d) Si pasa b) y c), se publica en el acto.
--
--    La funcion es SECURITY DEFINER, asi que lee moderacion_reglas y profiles
--    por encima de RLS: el filtro debe poder consultar reglas que el propio
--    organizador no puede ver.
create or replace function public.castings_sync_estado()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_plan text;
  v_limite integer;
  v_activos integer;
  v_regla_motivo text;
begin
  -- (a) Solo admin/moderator fijan directamente 'publicado' o 'rechazado'.
  if new.estado in ('publicado', 'rechazado') then
    if not public.es_moderador() then
      new.estado := 'pendiente_revision';
    end if;
  end if;

  if new.estado = 'pendiente_revision' then
    -- (b) Filtro de contenido.
    select motivo into v_regla_motivo
    from public.moderacion_reglas
    where activo = true
      and (
        (tipo = 'palabra' and (
          new.descripcion ilike '%' || patron || '%'
          or new.sinopsis ilike '%' || patron || '%'
          or new.perfil_descripcion ilike '%' || patron || '%'
        ))
        or
        (tipo = 'regex' and (
          new.descripcion ~* patron
          or new.sinopsis ~* patron
          or new.perfil_descripcion ~* patron
        ))
      )
    limit 1;

    -- Se decide por FOUND, no por "v_regla_motivo is not null": una regla
    -- activa que coincide debe retener el casting aunque no declare motivo.
    -- Mirar el motivo dejaria pasar justo esas reglas.
    if found then
      new.motivo_filtro := v_regla_motivo;
      -- Permanece en 'pendiente_revision' para el panel de moderacion.
    else
      -- (c) Cupo de castings publicados simultaneos.
      select plan into v_plan from public.profiles where id = new.user_id;

      v_limite := case v_plan
        when 'premium'   then 3
        when 'destacado' then 10
        when 'empresas'  then null   -- sin techo
        else 0                       -- gratuito: no publica
      end;

      if v_limite is not null then
        select count(*) into v_activos
        from public.castings
        where user_id = new.user_id
          and estado = 'publicado'
          and id <> new.id;

        if v_activos >= v_limite then
          raise exception 'Límite de castings activos alcanzado para tu plan (%). Cierra alguno antes de publicar otro.', v_limite;
        end if;
      end if;

      new.estado := 'publicado';
      new.motivo_filtro := null;
    end if;
  end if;

  -- `publicado` sigue siendo espejo de `estado`: la politica "Castings
  -- publicos" depende de ella y no se toca.
  new.publicado := (new.estado = 'publicado');
  return new;
end;
$$;

-- 6. Se retira el sello editorial.
--
--    Va al final a proposito: la funcion de arriba ya no lo menciona, asi que
--    soltar la columna no deja ninguna referencia colgando. Ningun codigo de
--    la aplicacion la usaba (solo aparecia en los tipos generados).
alter table public.profiles
  drop column if exists verificado_editorial;
