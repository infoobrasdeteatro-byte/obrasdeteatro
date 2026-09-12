-- Correccion urgente de 20260911202739_castings_rls_moderacion_y_motivo_rechazo.sql.
--
-- QUE PASO. Aquella migracion comprobaba el rol consultando profile_roles
-- directamente dentro de las politicas RLS. En public.castings era inocuo,
-- pero en public.profiles cerraba un ciclo:
--
--   leer profiles
--     -> politica "Moderación consulta perfiles"
--        -> lee profile_roles
--           -> politica "Roles públicos visibles" (ya existente)
--              -> lee profiles
--                 -> ... (42P17: infinite recursion detected in policy)
--
-- El efecto no se limitaba a moderacion: public.profiles quedaba ILEGIBLE
-- para cualquier usuario autenticado, y con ella el dashboard, el directorio
-- y las paginas de perfil. La politica de castings quedaba ademas expuesta al
-- mismo ciclo en cuanto tocase profiles.
--
-- POR QUE NO SE VIO ANTES. Las comprobaciones de aquella migracion se
-- hicieron con el rol propietario de las tablas, que no evalua RLS. La
-- recursion solo aparece consultando como `authenticated`.
--
-- LA CORRECCION. Un unico predicado, en una funcion SECURITY DEFINER que lee
-- profile_roles POR ENCIMA de RLS y por tanto no puede reentrar en ninguna
-- politica. Es el mismo motivo por el que la funcion del trigger
-- (20260911141543) ya era definer.

create or replace function public.es_moderador()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.profile_roles
    where profile_id = auth.uid()
      and role in ('admin', 'moderator')
  );
$$;

comment on function public.es_moderador() is
  'True si quien consulta tiene rol admin o moderator. SECURITY DEFINER a proposito: leer profile_roles dentro de una politica RLS sin bypass reintroduce la recursion profiles -> profile_roles -> profiles.';

-- Ambas politicas se recrean con el mismo alcance que tenian; lo unico que
-- cambia es como se responde a "¿quien pregunta modera?".
drop policy if exists "Moderación consulta perfiles" on public.profiles;

create policy "Moderación consulta perfiles" on public.profiles
  for select
  using (public.es_moderador());

drop policy if exists "Moderación gestiona castings" on public.castings;

create policy "Moderación gestiona castings" on public.castings
  for all
  using (public.es_moderador())
  with check (public.es_moderador());
