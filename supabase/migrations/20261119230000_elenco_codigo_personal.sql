-- Elenco Fundador: código personal en lugar del número.
--
-- El número (001–100) sigue existiendo para el Master Control: ordena las
-- plazas y limita su cantidad. Pero los fundadores y el público ya no lo ven:
-- un número de orden puede hacer sentir a alguien «de los últimos».
--
-- Lo que ven en su lugar es un código personal hecho con su nombre o su
-- nombre artístico («conchigarces», «lachunga»), sin tildes, espacios ni
-- signos. Es el que va en su enlace (/elenco/<código>) y el que se escribe en
-- el registro. Se propone a partir del nombre y se puede cambiar al crear la
-- invitación; si ya existe, no se añade un número: hay que elegir otro.
--
-- 1. Columna codigo, normalización y códigos de las plazas existentes.
-- 2. elenco_crear_invitacion con código (y comprobación previa).
-- 3. Fundador por código, atribución por código y código propio (mi_codigo_elenco).
--
-- Las funciones públicas que todavía devuelven el número se cambian en la
-- migración siguiente (20261120090000), cuando la web ya no lo lee.

-- 1 ─────────────────────────────────────────────────────────────────────────
create or replace function public.elenco_codigo_normalizar(texto text)
  returns text
  language sql
  stable
  set search_path = ''
as $$
  select regexp_replace(coalesce(public.slugificar(texto), ''), '[^a-z0-9]', '', 'g');
$$;

alter table public.elenco_fundadores add column if not exists codigo text;

-- Si una plaza llega sin código (p. ej. creada por la versión anterior de
-- elenco_crear_invitacion), se le pone el de su nombre.
create or replace function public.elenco_codigo_por_defecto()
  returns trigger
  language plpgsql
  set search_path = 'public'
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.elenco_codigo_normalizar(new.nombre);
  end if;
  return new;
end;
$$;

drop trigger if exists elenco_fundadores_codigo_por_defecto on public.elenco_fundadores;
create trigger elenco_fundadores_codigo_por_defecto
  before insert on public.elenco_fundadores
  for each row execute function public.elenco_codigo_por_defecto();

update public.elenco_fundadores f
   set codigo = public.elenco_codigo_normalizar(f.nombre)
 where f.codigo is null;

alter table public.elenco_fundadores
  alter column codigo set not null,
  add constraint elenco_fundadores_codigo_formato
    check (codigo ~ '^[a-z0-9]{3,30}$' and codigo ~ '[a-z]' and codigo not in ('invitacion', 'unirse'));

-- Un código por plaza viva; una invitación anulada libera el suyo.
create unique index if not exists elenco_fundadores_codigo_vivo_idx
  on public.elenco_fundadores (codigo) where estado <> 'anulada';

comment on column public.elenco_fundadores.codigo is
  'Código personal visible (enlace /elenco/<código> y campo del registro). El número es solo interno.';

-- 2 ─────────────────────────────────────────────────────────────────────────
-- ¿Está libre este código? Devuelve el código normalizado y si se puede usar.
create or replace function public.elenco_codigo_disponible(p_codigo text)
  returns table (codigo text, libre boolean, motivo text)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  with c as (select public.elenco_codigo_normalizar(p_codigo) as v)
  select c.v,
         c.v ~ '^[a-z0-9]{3,30}$' and c.v ~ '[a-z]' and c.v not in ('invitacion', 'unirse')
           and not exists (select 1 from public.elenco_fundadores f where f.codigo = c.v and f.estado <> 'anulada'),
         case
           when length(c.v) < 3 then 'corto'
           when length(c.v) > 30 then 'largo'
           when c.v !~ '[a-z]' or c.v in ('invitacion', 'unirse') then 'no_valido'
           when exists (select 1 from public.elenco_fundadores f where f.codigo = c.v and f.estado <> 'anulada') then 'ocupado'
         end
  from c;
$$;

create or replace function public.elenco_crear_invitacion(
  p_nombre text, p_tipo text, p_oficio text, p_telefono text, p_email text, p_nota text, p_codigo text
)
  returns table (id uuid, numero smallint, token text, codigo text)
  language plpgsql
  security definer
  set search_path = 'public'
as $$
declare
  v_numero smallint;
  v_id     uuid;
  v_token  text;
  v_codigo text;
begin
  lock table public.elenco_fundadores in share row exclusive mode;

  v_codigo := public.elenco_codigo_normalizar(coalesce(nullif(btrim(p_codigo), ''), p_nombre));
  if v_codigo !~ '^[a-z0-9]{3,30}$' or v_codigo !~ '[a-z]' or v_codigo in ('invitacion', 'unirse') then
    raise exception 'codigo_no_valido';
  end if;
  if exists (select 1 from public.elenco_fundadores f where f.codigo = v_codigo and f.estado <> 'anulada') then
    raise exception 'codigo_ocupado';
  end if;

  select g::smallint into v_numero
  from generate_series(1, 100) g
  where not exists (select 1 from public.elenco_fundadores f where f.numero = g and f.estado <> 'anulada')
  order by g limit 1;
  if v_numero is null then raise exception 'sin_plazas'; end if;

  insert into public.elenco_fundadores as f (numero, codigo, nombre, tipo, oficio, telefono, email, nota)
  values (v_numero, v_codigo, btrim(p_nombre), p_tipo, btrim(p_oficio), nullif(btrim(p_telefono), ''), nullif(btrim(p_email), ''), nullif(btrim(p_nota), ''))
  returning f.id, f.token into v_id, v_token;

  id := v_id; numero := v_numero; token := v_token; codigo := v_codigo;
  return next;
end;
$$;

-- 3 ─────────────────────────────────────────────────────────────────────────
-- Fundador por su código (enlace /elenco/<código> y campo del registro).
create or replace function public.elenco_fundador_por_codigo(p_codigo text)
  returns table (codigo text, nombre text, slug text)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select f.codigo, coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre),
         case when p.perfil_publico and p.deleted_at is null then p.slug end
  from public.elenco_fundadores f
  join public.profiles p on p.id = f.aceptada_por
  where f.codigo = public.elenco_codigo_normalizar(p_codigo) and f.estado = 'aceptada';
$$;

-- Código del fundador con la sesión abierta (panel «Tu Elenco»).
create or replace function public.mi_codigo_elenco()
  returns text
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select f.codigo from public.elenco_fundadores f
  where f.aceptada_por = auth.uid() and f.estado = 'aceptada';
$$;

-- Atribución por código: misma regla que elenco_atribuir (por número).
create or replace function public.elenco_atribuir_codigo(p_perfil uuid, p_codigo text)
  returns text
  language plpgsql
  security definer
  set search_path = 'public'
as $$
declare v_numero smallint;
begin
  select f.numero into v_numero from public.elenco_fundadores f
  where f.codigo = public.elenco_codigo_normalizar(p_codigo) and f.estado = 'aceptada';
  if v_numero is null then return 'no_valido'; end if;
  return public.elenco_atribuir(p_perfil, v_numero);
end;
$$;

-- Permisos ──────────────────────────────────────────────────────────────────
revoke all on function public.elenco_codigo_normalizar(text) from public;
revoke all on function public.elenco_codigo_por_defecto() from public, anon, authenticated;
revoke all on function public.elenco_codigo_disponible(text) from public, anon, authenticated;
revoke all on function public.elenco_crear_invitacion(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.elenco_atribuir_codigo(uuid, text) from public, anon, authenticated;
revoke all on function public.elenco_fundador_por_codigo(text) from public;
revoke all on function public.mi_codigo_elenco() from public;

grant execute on function public.elenco_codigo_normalizar(text) to anon, authenticated, service_role;
grant execute on function public.elenco_codigo_disponible(text) to service_role;
grant execute on function public.elenco_crear_invitacion(text, text, text, text, text, text, text) to service_role;
grant execute on function public.elenco_atribuir_codigo(uuid, text) to service_role;
grant execute on function public.elenco_fundador_por_codigo(text) to anon, authenticated, service_role;
grant execute on function public.mi_codigo_elenco() to authenticated, service_role;
