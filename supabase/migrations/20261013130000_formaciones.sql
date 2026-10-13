-- Formación: cursos, talleres, masterclass, seminarios, residencias y
-- diplomaturas publicados por escuelas, compañías, teatros, festivales,
-- productoras e instituciones (cualquier plan) y por profesionales
-- individuales con plan Premium o superior.
--
-- Decisiones de Dirección (13/10/2026):
--   · Inscripción por enlace externo (web o correo del organizador). La
--     plataforma no cobra todavía: el cobro con comisión llegará con la venta
--     de entradas.
--   · SE PUBLICAN SOLAS, sin revisión previa. La moderación solo retira
--     (estado «retirado», con motivo) y puede restaurar.
--
-- Contenido:
--   1. puede_publicar_formaciones(perfil): quién puede publicar.
--   2. Tabla formaciones con sus CHECK.
--   3. Trigger: slug (fijo una vez creado), fecha de publicación, permiso al
--      publicar y estado «retirado» reservado a moderación.
--   4. RLS, permisos e índices.
--   5. Cierre diario de las formaciones ya terminadas (estado «finalizado»).

-- 1. Quién puede publicar ------------------------------------------------------

create or replace function public.puede_publicar_formaciones(p_profile uuid default null)
  returns boolean
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = coalesce(p_profile, auth.uid())
      and coalesce(p.activo, true)
      and p.deleted_at is null
      and (
        p.tipo_perfil::text in ('compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion')
        or (
          p.tipo_perfil::text in ('actor', 'director', 'dramaturgo', 'profesional')
          and p.plan::text in ('premium', 'destacado', 'empresas')
        )
      )
  );
$$;

comment on function public.puede_publicar_formaciones(uuid) is
  'True si el perfil puede publicar formaciones: organizaciones (compañía, productora, teatro, festival, escuela, institución) con cualquier plan; profesionales (actor, director, dramaturgo, profesional) con plan Premium o superior. Público: no.';

-- 2. Tabla ---------------------------------------------------------------------

create table public.formaciones (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  titulo text not null,
  tipo text not null,
  disciplina text not null default 'otra',
  nivel text,
  modalidad text not null default 'presencial',
  pais_code text,
  ciudad text,
  lugar text,
  fecha_inicio date,
  fecha_fin date,
  horario text,
  duracion text,
  imparte text,
  plazas integer,
  es_gratuita boolean not null default false,
  precio numeric(10, 2),
  moneda text,
  descripcion text,
  requisitos text,
  url_inscripcion text,
  email_inscripcion text,
  estado text not null default 'borrador',
  motivo_retirada text,
  fecha_publicacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint formaciones_slug_unico unique (slug),
  constraint formaciones_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint formaciones_titulo_longitud check (char_length(btrim(titulo)) between 3 and 160),
  constraint formaciones_tipo_check check (tipo in ('curso', 'taller', 'masterclass', 'seminario', 'residencia', 'diplomatura')),
  constraint formaciones_disciplina_check check (disciplina in (
    'interpretacion', 'direccion', 'dramaturgia', 'voz', 'cuerpo', 'teatro_musical',
    'danza', 'improvisacion', 'clown_titeres', 'escenografia_tecnica', 'produccion_gestion', 'otra'
  )),
  constraint formaciones_nivel_check check (nivel is null or nivel in ('iniciacion', 'intermedio', 'avanzado', 'profesional', 'todos')),
  constraint formaciones_modalidad_check check (modalidad in ('presencial', 'online', 'hibrida')),
  -- Los 20 países del ámbito, la misma lista que lib/geo/countries.ts.
  constraint formaciones_pais_check check (pais_code is null or pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  -- Presencial o híbrida necesitan país y ciudad; online puede no tenerlos.
  constraint formaciones_lugar_si_presencial check (
    modalidad = 'online' or (pais_code is not null and ciudad is not null and char_length(btrim(ciudad)) > 0)
  ),
  constraint formaciones_ciudad_longitud check (ciudad is null or char_length(ciudad) <= 120),
  constraint formaciones_lugar_longitud check (lugar is null or char_length(lugar) <= 200),
  constraint formaciones_fechas_orden check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio),
  constraint formaciones_horario_longitud check (horario is null or char_length(horario) <= 200),
  constraint formaciones_duracion_longitud check (duracion is null or char_length(duracion) <= 100),
  constraint formaciones_imparte_longitud check (imparte is null or char_length(imparte) <= 300),
  constraint formaciones_plazas_positivas check (plazas is null or plazas between 1 and 100000),
  constraint formaciones_precio_valido check (precio is null or precio >= 0),
  constraint formaciones_gratuita_sin_precio check (not es_gratuita or precio is null),
  constraint formaciones_moneda_formato check (moneda is null or moneda ~ '^[A-Z]{3}$'),
  constraint formaciones_moneda_con_precio check (precio is null or moneda is not null),
  constraint formaciones_descripcion_longitud check (descripcion is null or char_length(descripcion) <= 5000),
  constraint formaciones_requisitos_longitud check (requisitos is null or char_length(requisitos) <= 1000),
  constraint formaciones_url_formato check (url_inscripcion is null or (url_inscripcion ~* '^https?://[^\s/?#]+[^\s]*$' and char_length(url_inscripcion) <= 500)),
  constraint formaciones_email_formato check (email_inscripcion is null or (char_length(email_inscripcion) <= 254 and email_inscripcion ~* '^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$')),
  constraint formaciones_estado_check check (estado in ('borrador', 'publicado', 'finalizado', 'cancelado', 'retirado')),
  -- Publicada exige una vía de inscripción: enlace o correo.
  constraint formaciones_inscripcion_si_publicada check (
    estado <> 'publicado' or url_inscripcion is not null or email_inscripcion is not null
  ),
  constraint formaciones_motivo_retirada_longitud check (motivo_retirada is null or char_length(motivo_retirada) <= 500)
);

comment on table public.formaciones is
  'Cursos, talleres, masterclass, seminarios, residencias y diplomaturas. Se publican sin revisión previa (puede_publicar_formaciones decide quién); la moderación solo retira. Inscripción por enlace o correo externo.';

-- 3. Trigger -----------------------------------------------------------------

create or replace function public.formaciones_preparar()
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
begin
  -- Slug: se calcula al crear y no cambia después (es la URL de la ficha).
  if tg_op = 'INSERT' then
    base_slug := public.slugificar(trim(new.titulo));
    if base_slug = '' then base_slug := 'formacion'; end if;
    base_slug := left(base_slug, 80);
    candidate := base_slug;
    if exists (select 1 from public.formaciones where slug = candidate) and new.ciudad is not null then
      base_slug := base_slug || '-' || public.slugificar(new.ciudad);
      candidate := base_slug;
    end if;
    loop
      exit when not exists (select 1 from public.formaciones where slug = candidate);
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    end loop;
    new.slug := candidate;
  else
    new.slug := old.slug;
    new.profile_id := old.profile_id;
  end if;

  -- «Retirado» es cosa de moderación: el autor ni lo pone ni lo quita.
  if not modera then
    if tg_op = 'UPDATE' and old.estado = 'retirado' then
      raise exception 'Esta formación la ha retirado el equipo de ObrasDeTeatro. Escríbenos a hola@obrasdeteatro.com si crees que es un error.';
    end if;
    if new.estado = 'retirado' then
      raise exception 'Solo el equipo de moderación puede retirar una formación.';
    end if;
    new.motivo_retirada := case when tg_op = 'UPDATE' then old.motivo_retirada else null end;
  end if;

  -- Publicar exige permiso en el momento de publicar (un plan que baja deja de
  -- poder publicar nuevas, pero lo ya publicado sigue).
  if new.estado = 'publicado' and (tg_op = 'INSERT' or old.estado <> 'publicado') then
    if not modera and not public.puede_publicar_formaciones(new.profile_id) then
      raise exception 'Para publicar formaciones necesitas un perfil de escuela, compañía, teatro, festival, productora o institución, o un perfil profesional con plan Premium o superior.';
    end if;
    if new.fecha_publicacion is null then new.fecha_publicacion := now(); end if;
  end if;

  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

create trigger formaciones_preparar
  before insert or update on public.formaciones
  for each row execute function public.formaciones_preparar();

revoke execute on function public.formaciones_preparar() from public, anon, authenticated;

-- 4. RLS, permisos e índices ---------------------------------------------------

alter table public.formaciones enable row level security;

create policy "Formaciones publicadas visibles"
  on public.formaciones for select
  using (estado = 'publicado');

create policy "Formación propia: lectura"
  on public.formaciones for select to authenticated
  using (profile_id = auth.uid());

create policy "Formación propia: creación"
  on public.formaciones for insert to authenticated
  with check (profile_id = auth.uid() and public.puede_publicar_formaciones(auth.uid()));

create policy "Formación propia: edición"
  on public.formaciones for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Formación propia: borrado"
  on public.formaciones for delete to authenticated
  using (profile_id = auth.uid() and estado <> 'retirado');

create policy "Moderación gestiona formaciones"
  on public.formaciones for all to authenticated
  using (public.es_moderador())
  with check (public.es_moderador());

revoke insert, update, delete, truncate on public.formaciones from anon;
revoke truncate on public.formaciones from authenticated;

create index formaciones_publicadas_idx on public.formaciones (fecha_inicio) where estado = 'publicado';
create index formaciones_profile_idx on public.formaciones (profile_id);
create index formaciones_pais_idx on public.formaciones (pais_code) where estado = 'publicado';

-- 5. Cierre diario de las terminadas --------------------------------------------

create or replace function public.finalizar_formaciones_terminadas()
  returns integer
  language sql
  security definer
  set search_path = ''
as $$
  with f as (
    update public.formaciones
       set estado = 'finalizado'
     where estado = 'publicado'
       and coalesce(fecha_fin, fecha_inicio) < (now() at time zone 'Europe/Madrid')::date
    returning 1
  )
  select count(*)::int from f;
$$;

revoke execute on function public.finalizar_formaciones_terminadas() from public, anon, authenticated;

select cron.schedule(
  'finalizar-formaciones-terminadas',
  '15 3 * * *',
  $job$select public.finalizar_formaciones_terminadas();$job$
);
