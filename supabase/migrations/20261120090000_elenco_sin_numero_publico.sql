-- Elenco Fundador (2.ª parte): las funciones públicas dejan de devolver el
-- número de plaza. Se aplica cuando la web ya usa el código
-- (20261119230000_elenco_codigo_personal), para no romper la versión anterior
-- durante el despliegue.
--
-- - elenco_distintivos, elenco_invitacion_publica, elenco_publico y mi_elenco:
--   sin número (elenco_publico devuelve el código y ordena por nombre).
-- - elenco_fundador_publico(número): se elimina; los enlaces antiguos
--   /elenco/007 se resuelven en el servidor.
-- - elenco_crear_invitacion sin código: se elimina.

drop function if exists public.elenco_fundador_publico(integer);
drop function if exists public.elenco_crear_invitacion(text, text, text, text, text, text);

drop function if exists public.elenco_distintivos(uuid[]);
create or replace function public.elenco_distintivos(p_perfiles uuid[])
  returns table (profile_id uuid)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select f.aceptada_por from public.elenco_fundadores f
  where f.aceptada_por = any (p_perfiles) and f.estado = 'aceptada';
$$;

drop function if exists public.elenco_invitacion_publica(text);
create or replace function public.elenco_invitacion_publica(p_token text)
  returns table (nombre text, tipo text, oficio text, estado text)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select f.nombre, f.tipo, f.oficio, f.estado
  from public.elenco_fundadores f
  where f.token = p_token;
$$;

drop function if exists public.elenco_publico();
create or replace function public.elenco_publico()
  returns table (codigo text, nombre text, slug text, avatar_url text, tipo text, escalon integer)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select f.codigo, coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre) as nombre, p.slug, p.avatar_url, f.tipo, r.escalon
  from public.elenco_fundadores f
  join public.profiles p on p.id = f.aceptada_por
  join lateral (select max(escalon)::int as escalon from public.elenco_recompensas where fundador_id = f.id) r on true
  where f.estado = 'aceptada' and r.escalon >= 10 and p.perfil_publico and p.deleted_at is null
  order by r.escalon desc, 2;
$$;

drop function if exists public.mi_elenco();
create or replace function public.mi_elenco()
  returns table (codigo text, tipo text, aceptada_at timestamptz, bono_estado text, bono_limite timestamptz, bono_desde timestamptz,
                 bono_hasta timestamptz, registrados integer, activos integer, puntos integer, escalon integer,
                 semanas_cartelera integer, plan_vigente text, cortesia_hasta timestamptz)
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select f.codigo, f.tipo, f.aceptada_at,
         case
           when f.bono_activado_at is null and now() > f.aceptada_at + interval '12 months' then 'caducado'
           when f.bono_activado_at is null then 'disponible'
           when b.hasta > now() then 'activo'
           else 'usado'
         end,
         f.aceptada_at + interval '12 months', b.desde, b.hasta,
         (select count(*)::int from public.elenco_colegas c where c.fundador_id = f.id),
         (select count(*)::int from public.elenco_colegas c where c.fundador_id = f.id and c.activo),
         public.elenco_puntos(f.id),
         coalesce((select max(escalon)::int from public.elenco_recompensas r where r.fundador_id = f.id), 0),
         coalesce((select sum(semanas_cartelera)::int from public.elenco_recompensas r where r.fundador_id = f.id), 0)
           - (select count(*)::int from public.elenco_cartelera_usos u where u.fundador_id = f.id),
         public.plan_elenco_vigente(f.aceptada_por),
         (select max(c.hasta) from public.elenco_cortesias c where c.profile_id = f.aceptada_por and c.hasta > now())
  from public.elenco_fundadores f
  left join lateral (
    select min(c.desde) as desde, max(c.hasta) as hasta
    from public.elenco_cortesias c where c.fundador_id = f.id and c.motivo = 'bono'
  ) b on true
  where f.aceptada_por = auth.uid() and f.estado = 'aceptada';
$$;


revoke all on function public.elenco_distintivos(uuid[]) from public;
revoke all on function public.elenco_invitacion_publica(text) from public;
revoke all on function public.elenco_publico() from public;
revoke all on function public.mi_elenco() from public;

grant execute on function public.elenco_distintivos(uuid[]) to anon, authenticated, service_role;
grant execute on function public.elenco_invitacion_publica(text) to anon, authenticated, service_role;
grant execute on function public.elenco_publico() to anon, authenticated, service_role;
grant execute on function public.mi_elenco() to authenticated, service_role;
