-- Embajadores de Escena: código personal con el nombre, como el Elenco Fundador.
--
-- Hasta ahora, al aceptar la invitación se generaba un código aleatorio de 8
-- caracteres (/r/B369X5XY). Ahora el código se elige al crear la invitación,
-- a partir del nombre o del nombre artístico (/r/joserobertodiaz), con la
-- misma normalización que el Elenco (elenco_codigo_normalizar): minúsculas,
-- sin tildes ni espacios. Se puede cambiar antes de enviarla; si ya existe,
-- hay que elegir otro (nunca se añade un número).
--
-- Los enlaces antiguos siguen valiendo: el código anterior se guarda en
-- membresias_cortesia.codigo_antiguo y canjear_referido acepta los dos, sin
-- distinguir mayúsculas.
--
-- 1. Columnas: embajadores_invitaciones.codigo y membresias_cortesia.codigo_antiguo.
-- 2. embajadores_codigo_disponible (Master Control).
-- 3. aceptar_invitacion_embajador usa el código de la invitación.
-- 4. canjear_referido busca por código nuevo o antiguo.

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.embajadores_invitaciones add column if not exists codigo text;

create or replace function public.embajadores_codigo_por_defecto()
  returns trigger
  language plpgsql
  set search_path = 'public'
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.elenco_codigo_normalizar(new.nombre);
  else
    new.codigo := public.elenco_codigo_normalizar(new.codigo);
  end if;
  return new;
end;
$$;

drop trigger if exists embajadores_invitaciones_codigo_por_defecto on public.embajadores_invitaciones;
create trigger embajadores_invitaciones_codigo_por_defecto
  before insert on public.embajadores_invitaciones
  for each row execute function public.embajadores_codigo_por_defecto();

update public.embajadores_invitaciones i
   set codigo = public.elenco_codigo_normalizar(i.nombre)
 where i.codigo is null;

alter table public.embajadores_invitaciones
  alter column codigo set not null,
  add constraint embajadores_invitaciones_codigo_formato
    check (codigo ~ '^[a-z0-9]{3,30}$' and codigo ~ '[a-z]');

-- Un código por invitación viva; una anulada libera el suyo.
create unique index if not exists embajadores_invitaciones_codigo_vivo_idx
  on public.embajadores_invitaciones (codigo) where estado <> 'anulada';

comment on column public.embajadores_invitaciones.codigo is
  'Código personal del enlace /r/<código>, elegido al crear la invitación. Pasa a membresias_cortesia.codigo_referido al aceptarla.';

alter table public.membresias_cortesia add column if not exists codigo_antiguo text unique;

comment on column public.membresias_cortesia.codigo_antiguo is
  'Código aleatorio anterior (/r/XXXXXXXX): los enlaces ya compartidos siguen valiendo.';

-- 2 ─────────────────────────────────────────────────────────────────────────
create or replace function public.embajadores_codigo_disponible(p_codigo text)
  returns table (codigo text, libre boolean, motivo text)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  with c as (select public.elenco_codigo_normalizar(p_codigo) as v),
       o as (
         select exists (select 1 from public.embajadores_invitaciones i, c where i.codigo = c.v and i.estado <> 'anulada')
             or exists (select 1 from public.membresias_cortesia m, c
                        where lower(m.codigo_referido) = c.v or lower(m.codigo_antiguo) = c.v) as ocupado
       )
  select c.v,
         c.v ~ '^[a-z0-9]{3,30}$' and c.v ~ '[a-z]' and not o.ocupado,
         case
           when length(c.v) < 3 then 'corto'
           when length(c.v) > 30 then 'largo'
           when c.v !~ '[a-z]' then 'no_valido'
           when o.ocupado then 'ocupado'
         end
  from c, o;
$$;

-- 3 ─────────────────────────────────────────────────────────────────────────
create or replace function public.aceptar_invitacion_embajador(p_token text)
  returns text
  language plpgsql
  security definer
  set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_inv public.embajadores_invitaciones%rowtype;
  v_codigo text;
begin
  if v_yo is null then return 'no_valida'; end if;

  select * into v_inv from public.embajadores_invitaciones where token = p_token for update;
  if v_inv.id is null or v_inv.estado = 'anulada' then return 'no_valida'; end if;
  if v_inv.estado = 'aceptada' then
    return case when v_inv.aceptada_por = v_yo then 'ok' else 'usada' end;
  end if;
  if v_inv.caduca_at < now() then return 'caducada'; end if;

  if exists (select 1 from public.membresias_cortesia
             where profile_id = v_yo and tipo = 'embajador' and hasta > now() and renunciada_at is null) then
    return 'ya_embajador';
  end if;

  -- Código personal elegido al crear la invitación. Si, por lo que sea, ya lo
  -- usa otra persona, se recurre a uno aleatorio para no bloquear la aceptación.
  v_codigo := v_inv.codigo;
  if v_codigo is null or exists (
       select 1 from public.membresias_cortesia
       where profile_id <> v_yo and (lower(codigo_referido) = v_codigo or lower(codigo_antiguo) = v_codigo)) then
    loop
      v_codigo := lower(translate(substr(md5(gen_random_uuid()::text), 1, 8), '01', 'xy'));
      exit when v_codigo ~ '[a-z]' and not exists (
        select 1 from public.membresias_cortesia where lower(codigo_referido) = v_codigo or lower(codigo_antiguo) = v_codigo);
    end loop;
  end if;

  insert into public.membresias_cortesia
    (profile_id, tipo, plan, desde, hasta, genero, oficio, invitacion_id, codigo_referido, referido_por, renunciada_at, procesada)
  values
    (v_yo, 'embajador', 'destacado', now(), now() + interval '12 months', v_inv.genero, v_inv.oficio, v_inv.id, v_codigo, null, null, false)
  on conflict (profile_id) do update set
    tipo = excluded.tipo, plan = excluded.plan, desde = excluded.desde, hasta = excluded.hasta,
    genero = excluded.genero, oficio = excluded.oficio, invitacion_id = excluded.invitacion_id,
    codigo_referido = excluded.codigo_referido, referido_por = null, renunciada_at = null, procesada = false;

  update public.embajadores_invitaciones
  set estado = 'aceptada', aceptada_por = v_yo, aceptada_at = now()
  where id = v_inv.id;

  perform public.subir_plan(v_yo, 'destacado');
  return 'ok';
end;
$$;

-- 4 ─────────────────────────────────────────────────────────────────────────
create or replace function public.canjear_referido(p_codigo text)
  returns text
  language plpgsql
  security definer
  set search_path = 'public'
as $$
declare
  v_yo   uuid := auth.uid();
  v_emb  uuid;
  v_plan text;
  v_c    text := public.elenco_codigo_normalizar(p_codigo);
begin
  if v_yo is null or v_c = '' then return 'no_valido'; end if;

  select profile_id into v_emb from public.membresias_cortesia
  where (lower(codigo_referido) = v_c or lower(codigo_antiguo) = v_c) and tipo = 'embajador'
    and hasta > now() and renunciada_at is null;
  if v_emb is null or v_emb = v_yo then return 'no_valido'; end if;

  select public.embajadores_plan_colega(p.tipo_perfil::text) into v_plan
  from public.profiles p where p.id = v_yo and p.created_at > now() - interval '14 days';
  if v_plan is null then return 'no_aplica'; end if;

  insert into public.embajadores_referidos (profile_id, embajador_id) values (v_yo, v_emb)
  on conflict (profile_id) do nothing;

  if exists (select 1 from public.membresias_cortesia where profile_id = v_yo) then
    return 'no_aplica';
  end if;

  insert into public.membresias_cortesia (profile_id, tipo, plan, desde, hasta, referido_por)
  values (v_yo, 'referido', v_plan, now(), now() + interval '3 months', v_emb);

  perform public.subir_plan(v_yo, v_plan);
  return 'ok';
end;
$$;

-- Permisos ──────────────────────────────────────────────────────────────────
revoke all on function public.embajadores_codigo_por_defecto() from public, anon, authenticated;
revoke all on function public.embajadores_codigo_disponible(text) from public, anon, authenticated;
grant execute on function public.embajadores_codigo_disponible(text) to service_role;
