-- Cartelera (fase 1): espectáculos, su ficha artística, sus funciones y cómo
-- se consiguen las entradas.
--
-- Decisiones de Dirección (14/10/2026):
--   · Publica cualquier perfil, gratis. Cuántos espectáculos activos a la vez
--     y cuántas semanas de destacado incluye cada plan lo dice la tabla
--     cartelera_limites_plan (se cambia sin desplegar).
--   · Se revisan como los castings: el filtro de palabras de moderación y, si
--     pasa, salen publicados solos los de perfiles verificados; el resto
--     espera a moderación.
--   · DISEÑO ABIERTO: el espectáculo y la función no saben quién vende. Las
--     «opciones de compra» llevan el proveedor (enlace externo, ticketera con
--     afiliación, más adelante venta propia con Stripe Connect o una marca
--     blanca). Cambiar o añadir un proveedor no toca estas tablas.
--   · Todo clic en «Comprar entradas» queda en cartelera_eventos: de ahí
--     salen las estadísticas de cada compañía y, más adelante, la
--     conciliación de comisiones.
--
-- Contenido:
--   1. Vocabularios: géneros y límites por plan.
--   2. Tablas: espectaculos, espectaculo_personas, funciones,
--      opciones_compra, cartelera_destacados, cartelera_referencias_externas,
--      cartelera_eventos.
--   3. Funciones auxiliares (quién edita, qué es visible).
--   4. Triggers: slug, moderación y límites; lugar de cada función; coherencia
--      de las opciones de compra.
--   5. RLS y permisos.
--   6. Registro de clics (rpc pública) y cierre diario de los terminados.

-- 1. Vocabularios ---------------------------------------------------------------

create table public.cartelera_generos (
  id text primary key,
  etiqueta text not null,
  orden smallint not null default 100,
  activo boolean not null default true,
  constraint cartelera_generos_id_formato check (id ~ '^[a-z0-9_]{2,40}$'),
  constraint cartelera_generos_etiqueta_longitud check (char_length(btrim(etiqueta)) between 2 and 60)
);

insert into public.cartelera_generos (id, etiqueta, orden) values
  ('teatro', 'Teatro', 10),
  ('comedia', 'Comedia', 20),
  ('drama', 'Drama', 30),
  ('musical', 'Musical', 40),
  ('danza', 'Danza', 50),
  ('humor', 'Humor y monólogos', 60),
  ('infantil', 'Infantil y familiar', 70),
  ('opera', 'Ópera y zarzuela', 80),
  ('circo', 'Circo', 90),
  ('titeres', 'Títeres y objetos', 100),
  ('clown', 'Clown', 110),
  ('improvisacion', 'Improvisación', 120),
  ('microteatro', 'Microteatro', 130),
  ('performance', 'Performance', 140),
  ('lectura', 'Lectura dramatizada', 150),
  ('otro', 'Otro', 999);

comment on table public.cartelera_generos is
  'Géneros de la cartelera. Ampliarlos es un INSERT (sin desplegar).';

create table public.cartelera_limites_plan (
  plan text primary key,
  max_activos integer,
  semanas_destacado_mes smallint not null default 0,
  constraint cartelera_limites_plan_check check (plan in ('gratuito', 'premium', 'destacado', 'empresas')),
  constraint cartelera_limites_max check (max_activos is null or max_activos >= 0),
  constraint cartelera_limites_semanas check (semanas_destacado_mes between 0 and 5)
);

-- null = sin límite. «Destacado» y «Empresas» tienen el destacado todo el mes.
insert into public.cartelera_limites_plan (plan, max_activos, semanas_destacado_mes) values
  ('gratuito', 2, 0),
  ('premium', 5, 1),
  ('destacado', 15, 5),
  ('empresas', null, 5);

comment on table public.cartelera_limites_plan is
  'Por plan: espectáculos publicados a la vez (null = sin límite) y semanas de destacado incluidas al mes. Se cambia sin desplegar.';

-- 2. Tablas ---------------------------------------------------------------------

create table public.espectaculos (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  titulo text not null,
  compania_nombre text not null,
  obra_id uuid references public.works (id) on delete set null,
  sinopsis text,
  cartel_url text,
  genero_id text not null default 'teatro' references public.cartelera_generos (id),
  duracion_min integer,
  edad_minima smallint,
  idioma text not null default 'es',
  estado text not null default 'borrador',
  motivo_filtro text,
  motivo_rechazo text,
  origen text not null default 'usuario',
  publicado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint espectaculos_slug_unico unique (slug),
  constraint espectaculos_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint espectaculos_titulo_longitud check (char_length(btrim(titulo)) between 2 and 160),
  constraint espectaculos_compania_longitud check (char_length(btrim(compania_nombre)) between 2 and 160),
  constraint espectaculos_sinopsis_longitud check (sinopsis is null or char_length(sinopsis) <= 4000),
  constraint espectaculos_cartel_formato check (cartel_url is null or (cartel_url ~* '^https://[^\s]+$' and char_length(cartel_url) <= 600)),
  constraint espectaculos_duracion check (duracion_min is null or duracion_min between 1 and 1440),
  constraint espectaculos_edad check (edad_minima is null or edad_minima between 0 and 21),
  constraint espectaculos_idioma_formato check (idioma ~ '^[a-z]{2,3}$'),
  constraint espectaculos_estado_check check (estado in ('borrador', 'pendiente_revision', 'publicado', 'rechazado', 'finalizado', 'cancelado', 'retirado')),
  constraint espectaculos_origen_check check (origen in ('usuario', 'moderacion', 'importacion')),
  constraint espectaculos_motivos_longitud check (
    (motivo_filtro is null or char_length(motivo_filtro) <= 500)
    and (motivo_rechazo is null or char_length(motivo_rechazo) <= 500)
  )
);

comment on table public.espectaculos is
  'Espectáculos de la cartelera. No saben quién vende las entradas: eso va en opciones_compra.';

create table public.espectaculo_personas (
  id uuid primary key default gen_random_uuid(),
  espectaculo_id uuid not null references public.espectaculos (id) on delete cascade,
  nombre text not null,
  rol text not null,
  personaje text,
  profile_id uuid references public.profiles (id) on delete set null,
  orden smallint not null default 0,
  constraint espectaculo_personas_nombre check (char_length(btrim(nombre)) between 2 and 120),
  constraint espectaculo_personas_rol check (rol in (
    'reparto', 'direccion', 'dramaturgia', 'autoria', 'adaptacion', 'produccion', 'escenografia',
    'iluminacion', 'vestuario', 'musica', 'coreografia', 'sonido', 'otro'
  )),
  constraint espectaculo_personas_personaje check (personaje is null or char_length(personaje) <= 120)
);

create table public.funciones (
  id uuid primary key default gen_random_uuid(),
  espectaculo_id uuid not null references public.espectaculos (id) on delete cascade,
  inicio timestamptz not null,
  zona_horaria text not null default 'Europe/Madrid',
  espacio_id uuid references public.espacios_escenicos (id) on delete set null,
  lugar_nombre text,
  ciudad text,
  pais_code text,
  estado text not null default 'programada',
  nota text,
  created_at timestamptz not null default now(),

  constraint funciones_zona_formato check (zona_horaria ~ '^[A-Za-z]+(/[A-Za-z0-9_+-]+){1,2}$'),
  constraint funciones_pais_check check (pais_code is null or pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  -- O una sala de Espacios escénicos, o el lugar escrito con ciudad y país.
  constraint funciones_lugar check (
    espacio_id is not null
    or (lugar_nombre is not null and ciudad is not null and pais_code is not null)
  ),
  constraint funciones_lugar_longitud check (
    (lugar_nombre is null or char_length(btrim(lugar_nombre)) between 2 and 160)
    and (ciudad is null or char_length(btrim(ciudad)) between 1 and 120)
  ),
  constraint funciones_estado_check check (estado in ('programada', 'agotada', 'cancelada')),
  constraint funciones_nota_longitud check (nota is null or char_length(nota) <= 200)
);

create table public.opciones_compra (
  id uuid primary key default gen_random_uuid(),
  espectaculo_id uuid not null references public.espectaculos (id) on delete cascade,
  -- null = vale para todas las funciones del espectáculo.
  funcion_id uuid references public.funciones (id) on delete cascade,
  tipo text not null default 'venta',
  proveedor text not null default 'externo',
  url text,
  precio_desde numeric(10, 2),
  moneda text,
  etiqueta text,
  orden smallint not null default 0,

  constraint opciones_compra_tipo check (tipo in ('venta', 'reserva', 'taquilla', 'gratis')),
  constraint opciones_compra_proveedor_formato check (proveedor ~ '^[a-z0-9_]{2,40}$'),
  constraint opciones_compra_url_formato check (url is null or (url ~* '^https?://[^\s/?#]+[^\s]*$' and char_length(url) <= 800)),
  constraint opciones_compra_url_si_online check (tipo not in ('venta', 'reserva') or url is not null),
  constraint opciones_compra_precio check (precio_desde is null or precio_desde >= 0),
  constraint opciones_compra_moneda check (moneda is null or moneda ~ '^[A-Z]{3}$'),
  constraint opciones_compra_moneda_con_precio check (precio_desde is null or moneda is not null),
  constraint opciones_compra_gratis_sin_precio check (tipo <> 'gratis' or precio_desde is null),
  constraint opciones_compra_etiqueta check (etiqueta is null or char_length(etiqueta) <= 80)
);

comment on column public.opciones_compra.proveedor is
  'Quién vende: externo, ticketmaster, entradas_com, fever, tomaticket… (y más adelante stripe_connect). La web convierte el enlace en enlace de afiliado si el proveedor tiene programa.';

create table public.cartelera_destacados (
  id uuid primary key default gen_random_uuid(),
  espectaculo_id uuid not null references public.espectaculos (id) on delete cascade,
  desde date not null,
  hasta date not null,
  ambito text not null default 'ciudad',
  origen text not null default 'plan',
  created_at timestamptz not null default now(),
  constraint cartelera_destacados_fechas check (hasta >= desde and hasta - desde <= 62),
  constraint cartelera_destacados_ambito check (ambito in ('ciudad', 'portada', 'boletin')),
  constraint cartelera_destacados_origen check (origen in ('plan', 'compra', 'moderacion'))
);

comment on table public.cartelera_destacados is
  'Semanas de destacado: incluidas en el plan, compradas aparte o puestas por moderación. Las escribe el servidor o moderación.';

create table public.cartelera_referencias_externas (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null,
  id_externo text not null,
  espectaculo_id uuid references public.espectaculos (id) on delete cascade,
  funcion_id uuid references public.funciones (id) on delete cascade,
  sincronizado_at timestamptz not null default now(),
  constraint cartelera_referencias_unica unique (proveedor, id_externo),
  constraint cartelera_referencias_proveedor check (proveedor ~ '^[a-z0-9_]{2,40}$'),
  constraint cartelera_referencias_id check (char_length(id_externo) between 1 and 200),
  constraint cartelera_referencias_destino check (espectaculo_id is not null or funcion_id is not null)
);

comment on table public.cartelera_referencias_externas is
  'Id de cada espectáculo o función en su proveedor o importador (Ticketmaster…): sincronizar sin duplicar y poder migrar.';

create table public.cartelera_eventos (
  id bigint generated always as identity primary key,
  tipo text not null,
  espectaculo_id uuid not null references public.espectaculos (id) on delete cascade,
  funcion_id uuid references public.funciones (id) on delete set null,
  opcion_id uuid references public.opciones_compra (id) on delete set null,
  proveedor text,
  creado_at timestamptz not null default now(),
  constraint cartelera_eventos_tipo check (tipo in ('vista', 'clic_compra', 'venta', 'devolucion'))
);

comment on table public.cartelera_eventos is
  'Lo que pasa en la cartelera (clics en comprar, más adelante ventas). Solo lo escriben funciones del servidor; cada compañía lee los de sus espectáculos.';

-- 3. Funciones auxiliares --------------------------------------------------------

create or replace function public.espectaculo_editable(p_espectaculo uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select public.es_moderador()
      or exists (select 1 from public.espectaculos e where e.id = p_espectaculo and e.user_id = auth.uid() and e.estado <> 'retirado');
$$;

create or replace function public.espectaculo_visible(p_espectaculo uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select exists (
    select 1 from public.espectaculos e
    where e.id = p_espectaculo
      and (e.estado in ('publicado', 'finalizado') or e.user_id = auth.uid() or public.es_moderador())
  );
$$;

revoke execute on function public.espectaculo_editable(uuid) from public, anon;
revoke execute on function public.espectaculo_visible(uuid) from public;
grant execute on function public.espectaculo_visible(uuid) to anon, authenticated;
grant execute on function public.espectaculo_editable(uuid) to authenticated;

-- 4. Triggers -----------------------------------------------------------------

create or replace function public.espectaculos_preparar()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  counter int := 1;
  modera boolean := public.es_moderador();
  regla text;
  limite integer;
  plan_usuario text;
  verificado boolean;
  activos integer;
begin
  if tg_op = 'INSERT' then
    base_slug := left(public.slugificar(trim(new.titulo)), 80);
    if base_slug = '' then base_slug := 'espectaculo'; end if;
    candidate := base_slug;
    loop
      exit when not exists (select 1 from public.espectaculos where slug = candidate);
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    end loop;
    new.slug := candidate;
  else
    new.slug := old.slug;
    new.user_id := old.user_id;
    new.publicado_at := old.publicado_at;
  end if;

  if not modera then
    -- Lo que solo decide moderación.
    if tg_op = 'UPDATE' and old.estado = 'retirado' then
      raise exception 'Este espectáculo lo ha retirado el equipo de ObrasDeTeatro. Escríbenos a hola@obrasdeteatro.com si crees que es un error.';
    end if;
    new.origen := case when tg_op = 'INSERT' then 'usuario' else old.origen end;
    new.motivo_rechazo := case when tg_op = 'UPDATE' then old.motivo_rechazo else null end;
    if new.estado in ('rechazado', 'retirado') then
      new.estado := case when tg_op = 'UPDATE' then old.estado else 'borrador' end;
    end if;
    -- «Finalizado» es público: solo se llega desde uno ya publicado.
    if new.estado = 'finalizado' and (tg_op = 'INSERT' or old.estado not in ('publicado', 'finalizado')) then
      new.estado := case when tg_op = 'UPDATE' then old.estado else 'borrador' end;
    end if;
    -- Pedir publicar = pasar por revisión; y cambiar el texto de uno publicado, también.
    if new.estado = 'publicado' and (tg_op = 'INSERT' or old.estado <> 'publicado') then
      new.estado := 'pendiente_revision';
    end if;
    if tg_op = 'UPDATE' and old.estado in ('publicado', 'finalizado') and new.estado = old.estado
       and (new.titulo is distinct from old.titulo or new.sinopsis is distinct from old.sinopsis
            or new.cartel_url is distinct from old.cartel_url or new.compania_nombre is distinct from old.compania_nombre) then
      new.estado := 'pendiente_revision';
    end if;

    if new.estado = 'pendiente_revision' then
      select r.motivo into regla
        from public.moderacion_reglas r
       where r.activo
         and (
           (r.tipo = 'palabra' and (new.titulo ilike '%' || r.patron || '%' or coalesce(new.sinopsis, '') ilike '%' || r.patron || '%'
                                     or new.compania_nombre ilike '%' || r.patron || '%'))
           or (r.tipo = 'regex' and (new.titulo ~* r.patron or coalesce(new.sinopsis, '') ~* r.patron))
         )
       limit 1;
      if found then
        new.motivo_filtro := coalesce(regla, 'Contenido marcado por el filtro automático');
      else
        new.motivo_filtro := null;
        select p.verificado into verificado from public.profiles p where p.id = new.user_id;
        -- Perfil verificado y contenido limpio: sale publicado solo.
        if coalesce(verificado, false) then new.estado := 'publicado'; end if;
      end if;
    end if;
  end if;

  -- Límite de espectáculos publicados a la vez, según el plan (moderación no cuenta).
  if new.estado = 'publicado' and (tg_op = 'INSERT' or old.estado <> 'publicado') then
    if not modera then
      select p.plan::text into plan_usuario from public.profiles p where p.id = new.user_id;
      select l.max_activos into limite from public.cartelera_limites_plan l where l.plan = coalesce(plan_usuario, 'gratuito');
      if limite is not null then
        select count(*) into activos from public.espectaculos e
         where e.user_id = new.user_id and e.estado = 'publicado' and e.id <> new.id;
        if activos >= limite then
          raise exception 'Tu plan permite % espectáculo(s) publicado(s) a la vez. Finaliza alguno o mejora tu plan para publicar otro.', limite;
        end if;
      end if;
    end if;
    new.publicado_at := coalesce(new.publicado_at, now());
  end if;

  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

create trigger espectaculos_preparar
  before insert or update on public.espectaculos
  for each row execute function public.espectaculos_preparar();

revoke execute on function public.espectaculos_preparar() from public, anon, authenticated;

-- La función toma ciudad y país de la sala elegida (y no cambia de espectáculo).
create or replace function public.funciones_preparar()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  sala record;
begin
  if tg_op = 'UPDATE' then new.espectaculo_id := old.espectaculo_id; end if;
  if new.espacio_id is not null then
    select e.nombre, e.municipio, e.pais_code into sala
      from public.espacios_escenicos e where e.id = new.espacio_id and e.estado = 'publicado';
    if not found then
      raise exception 'La sala elegida no existe o no está publicada.';
    end if;
    new.lugar_nombre := sala.nombre;
    new.ciudad := sala.municipio;
    new.pais_code := sala.pais_code;
  end if;
  return new;
end;
$$;

create trigger funciones_preparar
  before insert or update on public.funciones
  for each row execute function public.funciones_preparar();

revoke execute on function public.funciones_preparar() from public, anon, authenticated;

-- Una opción de compra de una función concreta solo puede ser de una función del mismo espectáculo.
create or replace function public.opciones_compra_preparar()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then new.espectaculo_id := old.espectaculo_id; end if;
  if new.funcion_id is not null and not exists (
    select 1 from public.funciones f where f.id = new.funcion_id and f.espectaculo_id = new.espectaculo_id
  ) then
    raise exception 'Esa función no es de este espectáculo.';
  end if;
  return new;
end;
$$;

create trigger opciones_compra_preparar
  before insert or update on public.opciones_compra
  for each row execute function public.opciones_compra_preparar();

revoke execute on function public.opciones_compra_preparar() from public, anon, authenticated;

-- 5. RLS y permisos ---------------------------------------------------------------

alter table public.cartelera_generos enable row level security;
alter table public.cartelera_limites_plan enable row level security;
alter table public.espectaculos enable row level security;
alter table public.espectaculo_personas enable row level security;
alter table public.funciones enable row level security;
alter table public.opciones_compra enable row level security;
alter table public.cartelera_destacados enable row level security;
alter table public.cartelera_referencias_externas enable row level security;
alter table public.cartelera_eventos enable row level security;

create policy "Géneros visibles" on public.cartelera_generos for select using (true);
create policy "Moderación gestiona géneros" on public.cartelera_generos for all to authenticated
  using (public.es_moderador()) with check (public.es_moderador());

create policy "Límites visibles" on public.cartelera_limites_plan for select using (true);
create policy "Moderación gestiona límites" on public.cartelera_limites_plan for all to authenticated
  using (public.es_moderador()) with check (public.es_moderador());

create policy "Espectáculos publicados visibles" on public.espectaculos for select
  using (estado in ('publicado', 'finalizado'));
create policy "Espectáculo propio: lectura" on public.espectaculos for select to authenticated
  using (user_id = auth.uid());
create policy "Espectáculo propio: creación" on public.espectaculos for insert to authenticated
  with check (user_id = auth.uid());
create policy "Espectáculo propio: edición" on public.espectaculos for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Espectáculo propio: borrado" on public.espectaculos for delete to authenticated
  using (user_id = auth.uid() and estado <> 'retirado');
create policy "Moderación gestiona espectáculos" on public.espectaculos for all to authenticated
  using (public.es_moderador()) with check (public.es_moderador());

-- Hijos: se ven si se ve el espectáculo; los escribe quien puede editarlo.
create policy "Personas visibles" on public.espectaculo_personas for select
  using (public.espectaculo_visible(espectaculo_id));
create policy "Personas: gestión" on public.espectaculo_personas for all to authenticated
  using (public.espectaculo_editable(espectaculo_id)) with check (public.espectaculo_editable(espectaculo_id));

create policy "Funciones visibles" on public.funciones for select
  using (public.espectaculo_visible(espectaculo_id));
create policy "Funciones: gestión" on public.funciones for all to authenticated
  using (public.espectaculo_editable(espectaculo_id)) with check (public.espectaculo_editable(espectaculo_id));

create policy "Opciones visibles" on public.opciones_compra for select
  using (public.espectaculo_visible(espectaculo_id));
create policy "Opciones: gestión" on public.opciones_compra for all to authenticated
  using (public.espectaculo_editable(espectaculo_id)) with check (public.espectaculo_editable(espectaculo_id));

create policy "Destacados visibles" on public.cartelera_destacados for select
  using (public.espectaculo_visible(espectaculo_id));
create policy "Moderación gestiona destacados" on public.cartelera_destacados for all to authenticated
  using (public.es_moderador()) with check (public.es_moderador());

create policy "Moderación ve referencias" on public.cartelera_referencias_externas for select to authenticated
  using (public.es_moderador());

create policy "Eventos de mis espectáculos" on public.cartelera_eventos for select to authenticated
  using (public.es_moderador() or exists (
    select 1 from public.espectaculos e where e.id = espectaculo_id and e.user_id = auth.uid()
  ));

revoke insert, update, delete, truncate on
  public.cartelera_generos, public.cartelera_limites_plan, public.espectaculos, public.espectaculo_personas,
  public.funciones, public.opciones_compra, public.cartelera_destacados, public.cartelera_referencias_externas,
  public.cartelera_eventos
  from anon;
revoke truncate on
  public.cartelera_generos, public.cartelera_limites_plan, public.espectaculos, public.espectaculo_personas,
  public.funciones, public.opciones_compra, public.cartelera_destacados, public.cartelera_referencias_externas,
  public.cartelera_eventos
  from authenticated;
-- Las referencias y los eventos solo los escriben el servidor y las funciones de abajo.
revoke insert, update, delete on public.cartelera_referencias_externas, public.cartelera_eventos from authenticated;
revoke select on public.cartelera_referencias_externas, public.cartelera_eventos from anon;

create index espectaculos_publicados_idx on public.espectaculos (publicado_at desc) where estado = 'publicado';
create index espectaculos_user_idx on public.espectaculos (user_id);
create index espectaculos_genero_idx on public.espectaculos (genero_id) where estado = 'publicado';
create index espectaculos_pendientes_idx on public.espectaculos (created_at) where estado = 'pendiente_revision';
create index espectaculo_personas_esp_idx on public.espectaculo_personas (espectaculo_id, orden);
create index espectaculo_personas_perfil_idx on public.espectaculo_personas (profile_id) where profile_id is not null;
create index funciones_esp_idx on public.funciones (espectaculo_id, inicio);
create index funciones_inicio_idx on public.funciones (inicio) where estado <> 'cancelada';
create index funciones_lugar_idx on public.funciones (pais_code, ciudad, inicio);
create index funciones_espacio_idx on public.funciones (espacio_id, inicio) where espacio_id is not null;
create index opciones_compra_esp_idx on public.opciones_compra (espectaculo_id, orden);
create index cartelera_destacados_fechas_idx on public.cartelera_destacados (desde, hasta);
create index cartelera_eventos_esp_idx on public.cartelera_eventos (espectaculo_id, creado_at);

-- 6. Clics y cierre diario ----------------------------------------------------

-- La llama la ruta de «Comprar entradas» (también sin sesión): anota el clic y
-- devuelve el enlace al que redirigir. Solo de espectáculos publicados.
create or replace function public.registrar_clic_compra(p_opcion uuid)
  returns text
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  o record;
begin
  select oc.id, oc.espectaculo_id, oc.funcion_id, oc.proveedor, oc.url into o
    from public.opciones_compra oc
    join public.espectaculos e on e.id = oc.espectaculo_id
   where oc.id = p_opcion and e.estado = 'publicado' and oc.url is not null;
  if not found then return null; end if;
  insert into public.cartelera_eventos (tipo, espectaculo_id, funcion_id, opcion_id, proveedor)
  values ('clic_compra', o.espectaculo_id, o.funcion_id, o.id, o.proveedor);
  return o.url;
end;
$$;

revoke execute on function public.registrar_clic_compra(uuid) from public;
grant execute on function public.registrar_clic_compra(uuid) to anon, authenticated;

-- Publicado y sin funciones por delante → «finalizado» (sigue visible, fuera del listado).
create or replace function public.finalizar_espectaculos_terminados()
  returns integer
  language sql
  security definer
  set search_path = ''
as $$
  with f as (
    update public.espectaculos e
       set estado = 'finalizado'
     where e.estado = 'publicado'
       and exists (select 1 from public.funciones fu where fu.espectaculo_id = e.id)
       and not exists (
         select 1 from public.funciones fu
          where fu.espectaculo_id = e.id and fu.estado <> 'cancelada' and fu.inicio > now() - interval '6 hours'
       )
    returning 1
  )
  select count(*)::int from f;
$$;

revoke execute on function public.finalizar_espectaculos_terminados() from public, anon, authenticated;

select cron.schedule(
  'finalizar-espectaculos-terminados',
  '20 3 * * *',
  $job$select public.finalizar_espectaculos_terminados();$job$
);
