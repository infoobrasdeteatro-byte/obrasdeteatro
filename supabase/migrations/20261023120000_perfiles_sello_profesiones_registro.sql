-- Perfiles: sello profesional, profesiones de lista cerrada y tipo al registrarse.
--
-- 1. profiles.verificado_profesional: el sello «Verificado» que se ve en la web.
--    `verificado` sigue significando solo «correo confirmado» (SEC-001) y sigue
--    siendo requisito para salir en el directorio, pero deja de mostrarse como
--    sello. El nuevo nace a false para todos; solo la plataforma lo concede
--    (mismo trigger de protección que plan e is_premium). Hoy, solo el perfil
--    del fundador (slug reneebausson).
-- 2. public.profesiones: lista cerrada (lib/perfiles/profesiones.ts, mismos ids).
--    profile_specialties.specialty pasa a ser un id de esa lista (la tabla
--    estaba vacía). Los perfiles con tipo actor/director/dramaturgo reciben su
--    profesión equivalente como principal.
-- 3. handle_new_user(): guarda el tipo de perfil y las profesiones elegidas en
--    el registro (raw_user_meta_data.tipo_perfil / .profesiones), validados.

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists verificado_profesional boolean not null default false;

comment on column public.profiles.verificado_profesional is
  'Sello «Verificado» visible en la web. Lo concede solo la plataforma. Distinto de verificado (= correo confirmado).';

create or replace function public.profiles_proteger_campos_gestionados()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.plan is distinct from 'gratuito'
       or new.is_premium is distinct from false
       or new.verificado is distinct from false
       or new.verificado_profesional is distinct from false
    then
      raise exception 'plan, is_premium y verificado no se pueden fijar al crear un perfil'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.is_premium is distinct from old.is_premium
     or new.verificado is distinct from old.verificado
     or new.verificado_profesional is distinct from old.verificado_profesional
  then
    raise exception 'plan, is_premium y verificado solo los modifica la plataforma (suscripción de Stripe o verificación)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

update public.profiles set verificado_profesional = true where slug = 'reneebausson';

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profesiones (
  id     text primary key,
  nombre text not null,
  grupo  text not null,
  orden  int  not null
);

alter table public.profesiones enable row level security;
drop policy if exists "Profesiones públicas" on public.profesiones;
create policy "Profesiones públicas" on public.profesiones for select to public using (true);

insert into public.profesiones (id, nombre, grupo, orden) values
  ('actor', 'Actor / Actriz', 'Interpretación y creación', 1),
  ('bailarin', 'Bailarín / Bailarina', 'Interpretación y creación', 2),
  ('cantante', 'Cantante / Intérprete lírico', 'Interpretación y creación', 3),
  ('circo', 'Artista de circo', 'Interpretación y creación', 4),
  ('titiritero', 'Titiritero / Titiritera', 'Interpretación y creación', 5),
  ('humorista', 'Humorista / Monologuista', 'Interpretación y creación', 6),
  ('narrador', 'Narrador / Narradora oral', 'Interpretación y creación', 7),
  ('direccion-escenica', 'Dirección escénica', 'Dirección y escritura', 8),
  ('dramaturgia', 'Dramaturgia', 'Dirección y escritura', 9),
  ('coreografia', 'Coreografía', 'Dirección y escritura', 10),
  ('direccion-musical', 'Dirección musical', 'Dirección y escritura', 11),
  ('ayudantia-direccion', 'Ayudantía de dirección', 'Dirección y escritura', 12),
  ('escenografia', 'Escenografía', 'Diseño y técnica', 13),
  ('iluminacion', 'Iluminación', 'Diseño y técnica', 14),
  ('vestuario', 'Vestuario', 'Diseño y técnica', 15),
  ('caracterizacion', 'Caracterización y maquillaje', 'Diseño y técnica', 16),
  ('sonido', 'Sonido', 'Diseño y técnica', 17),
  ('regiduria', 'Regiduría', 'Diseño y técnica', 18),
  ('tecnico-escenario', 'Técnico/a de escenario', 'Diseño y técnica', 19),
  ('produccion', 'Producción', 'Producción y gestión', 20),
  ('gestion-cultural', 'Gestión cultural', 'Producción y gestión', 21),
  ('distribucion', 'Distribución', 'Producción y gestión', 22),
  ('programacion', 'Programación', 'Producción y gestión', 23),
  ('comunicacion', 'Comunicación y prensa', 'Producción y gestión', 24),
  ('docencia', 'Docencia', 'Formación e investigación', 25),
  ('investigacion-critica', 'Investigación y crítica teatral', 'Formación e investigación', 26)
on conflict (id) do update set nombre = excluded.nombre, grupo = excluded.grupo, orden = excluded.orden;

alter table public.profile_specialties
  drop constraint if exists profile_specialties_profesion_fk;
alter table public.profile_specialties
  add constraint profile_specialties_profesion_fk
  foreign key (specialty) references public.profesiones (id);

create unique index if not exists profile_specialties_perfil_profesion_uniq
  on public.profile_specialties (profile_id, specialty);

insert into public.profile_specialties (profile_id, specialty, is_primary)
select p.id,
       case p.tipo_perfil::text when 'actor' then 'actor'
                                when 'director' then 'direccion-escenica'
                                else 'dramaturgia' end,
       true
from public.profiles p
where p.tipo_perfil::text in ('actor', 'director', 'dramaturgo')
  and not exists (select 1 from public.profile_specialties s where s.profile_id = p.id);

-- 3 ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tipo text := new.raw_user_meta_data->>'tipo_perfil';
  v_profs jsonb := new.raw_user_meta_data->'profesiones';
  v_id text;
  v_primera boolean := true;
begin
  if v_tipo is null or v_tipo not in
     ('profesional', 'publico', 'compania', 'teatro', 'festival', 'escuela', 'productora', 'institucion') then
    v_tipo := 'publico';
  end if;

  insert into public.profiles (id, email, nombre, tipo_perfil)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_tipo::tipo_perfil
  );

  if v_tipo = 'profesional' and jsonb_typeof(v_profs) = 'array' then
    for v_id in select value from jsonb_array_elements_text(v_profs) limit 30 loop
      if exists (select 1 from public.profesiones where id = v_id) then
        insert into public.profile_specialties (profile_id, specialty, is_primary)
        values (new.id, v_id, v_primera)
        on conflict (profile_id, specialty) do nothing;
        v_primera := false;
      end if;
    end loop;
  end if;

  return new;
end;
$function$;
