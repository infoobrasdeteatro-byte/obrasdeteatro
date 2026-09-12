-- Bandeja de postulaciones: hacerla viable a escala, y poder ver quien se postula.
--
-- Cuatro cambios, los cuatro medidos con EXPLAIN ANALYZE sobre 2.401
-- postulaciones y 202 castings sembrados, no supuestos de antemano.
--
-- EL PROBLEMA MEDIDO. La consulta de la bandeja tardaba 65 ms con solo 2.401
-- filas, y el plan explicaba por que:
--
--   Seq Scan on casting_applications (rows=2401)
--     Filter: (auth.uid() IN (SubPlan 1)) OR (auth.uid() = applicant_id)
--     SubPlan 1
--       -> Index Scan on castings (loops=2401)
--            Filter: es_moderador() OR publicado OR auth.uid() = user_id
--
-- La politica del organizador era una subconsulta CORRELACIONADA: por cada
-- fila de casting_applications se consultaba castings, y dentro de esa
-- consulta se evaluaban a su vez las politicas de castings, es_moderador()
-- incluida. 2.401 filas = 2.401 llamadas a es_moderador(). A un millon de
-- postulaciones eso no es lento, es inservible.

-- 1. El predicado del organizador, en una funcion SECURITY DEFINER.
--
--    DEFINER para que lea castings por encima de RLS: asi desaparece la
--    evaluacion anidada de las politicas de castings (y con ella la llamada
--    por fila a es_moderador()). STABLE para que el planificador pueda
--    reutilizar el resultado dentro de la misma consulta.
--    Medido: 65 ms -> 42 ms solo con este cambio.
create or replace function public.es_mi_casting(p_casting uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from public.castings c
    where c.id = p_casting and c.user_id = auth.uid()
  );
$$;

comment on function public.es_mi_casting(uuid) is
  'True si el casting indicado pertenece a quien consulta. SECURITY DEFINER a proposito: evaluarlo dentro de una politica RLS sin bypass obliga a re-evaluar las politicas de castings una vez por fila.';

drop policy if exists "Propietario gestiona aplicaciones" on public.casting_applications;

create policy "Propietario gestiona aplicaciones" on public.casting_applications
  for all
  using (public.es_mi_casting(casting_id))
  with check (public.es_mi_casting(casting_id));

-- 2. El indice del orden de la bandeja.
--
--    Es el cambio que de verdad decide. Con el, el planificador recorre el
--    indice YA ORDENADO y se detiene al juntar las 20 filas de la pagina, en
--    vez de leer la tabla entera y ordenarla despues.
--    Medido: 42 ms -> 0,9 ms. No lleva casting_id delante a proposito: la
--    condicion de RLS no es indexable, asi que lo que hay que poder recorrer
--    en orden es la clave del cursor.
create index if not exists idx_casting_applications_orden
  on public.casting_applications (applied_at desc, id desc);

-- 3. La pagina de la bandeja, como funcion.
--
--    Existe para poder fijar la FORMA del plan. La misma consulta expresada
--    como join embebido de PostgREST vuelve a costar 65 ms, porque el
--    planificador resuelve el join con un hash y pierde el recorrido ordenado.
--    Escrita asi, el filtro va en el WHERE y el plan se mantiene en 1,25 ms.
--
--    SECURITY INVOKER (el valor por defecto, no se declara): la RLS se sigue
--    aplicando encima. El es_mi_casting() explicito no sustituye a la
--    politica, la acompana -- sin el, la RLS devolveria tambien las
--    postulaciones que el propio organizador haya hecho como actor.
create or replace function public.bandeja_postulaciones(
  p_casting uuid default null,
  p_status text default null,
  p_cursor_applied_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limite integer default 20
)
returns setof public.casting_applications
language plpgsql
stable
set search_path = 'public'
as $fn$
declare
  v_sql text := 'select a.* from public.casting_applications a where public.es_mi_casting(a.casting_id)';
begin
  if p_casting is not null then v_sql := v_sql || ' and a.casting_id = $1'; end if;
  if p_status is not null then v_sql := v_sql || ' and a.status = $2'; end if;
  if p_cursor_applied_at is not null then
    v_sql := v_sql || ' and (a.applied_at, a.id) < ($3, $4)';
  end if;
  v_sql := v_sql || ' order by a.applied_at desc, a.id desc limit $5';

  return query execute v_sql
    using p_casting, p_status, p_cursor_applied_at, p_cursor_id, least(greatest(p_limite,1),100);
end;
$fn$;

comment on function public.bandeja_postulaciones is
  'Una pagina de las postulaciones recibidas, keyset sobre (applied_at desc, id desc). SQL dinamico a proposito: el patron "parametro is null or columna = parametro" genera un plan generico que ignora el indice de orden (medido: 72 ms frente a 8 ms).';

-- 4. Ver a quien se postula.
--
--    SIN ESTO LA BANDEJA NO PUEDE EXISTIR. Las politicas de public.profiles
--    solo dejan ver el perfil propio y los publicos (perfil_publico and activo
--    and verificado): hoy 15 de 36 perfiles. Las de public.perfil_actor, solo
--    el propio y los de perfil publico. Un organizador no podria ver ni el
--    NOMBRE de quien se presenta a su convocatoria si esa persona mantiene su
--    perfil reservado.
--
--    El criterio es el consentimiento por acto: presentarse a una convocatoria
--    es entregarse a quien la publica. Por eso la visibilidad se abre SOLO
--    hacia quien recibio esa postulacion, SOLO en lectura, y solo mientras la
--    postulacion exista -- si el actor la retira, deja de verse.
--
--    Esto NO abre los datos de contacto: cuales de ellos se ensenan lo sigue
--    decidiendo el propio actor con sus banderas mostrar_email,
--    mostrar_telefono, mostrar_whatsapp y mostrar_redes, que la interfaz
--    respeta una por una.
--
--    Para revertirlo:
--      drop policy "Organización ve a quien se postula" on public.profiles;
--      drop policy "Organización ve el perfil de quien se postula" on public.perfil_actor;
create or replace function public.se_postulo_a_mis_castings(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.casting_applications a
    join public.castings c on c.id = a.casting_id
    where a.applicant_id = p_perfil
      and c.user_id = auth.uid()
  );
$$;

comment on function public.se_postulo_a_mis_castings(uuid) is
  'True si ese perfil se ha postulado a algun casting de quien consulta. SECURITY DEFINER: se usa dentro de politicas de profiles y perfil_actor, y leer casting_applications bajo RLS desde ahi reintroduciria evaluacion anidada.';

drop policy if exists "Organización ve a quien se postula" on public.profiles;
create policy "Organización ve a quien se postula" on public.profiles
  for select
  using (public.se_postulo_a_mis_castings(id));

drop policy if exists "Organización ve el perfil de quien se postula" on public.perfil_actor;
create policy "Organización ve el perfil de quien se postula" on public.perfil_actor
  for select
  using (public.se_postulo_a_mis_castings(user_id));
