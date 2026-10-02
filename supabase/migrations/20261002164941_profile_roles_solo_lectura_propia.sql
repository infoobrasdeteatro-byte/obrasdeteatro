-- profile_roles: los roles administrativos dejan de ser autoasignables.
--
-- La política "Rol propio" (baseline) era FOR ALL con USING (auth.uid() =
-- profile_id) y sin WITH CHECK. En Postgres, una política FOR ALL sin WITH
-- CHECK usa la expresión USING también para las filas nuevas, así que
-- cualquier usuario con sesión podía hacer
--   POST /rest/v1/profile_roles  {profile_id: <su id>, role: 'admin'}
-- y desde ese momento es_moderador() le devolvía true: moderación de
-- castings, convocatorias, reportes y reglas del filtro.
--
-- Hoy profile_roles solo admite roles administrativos (CHECK: admin,
-- moderator, editor). Ninguna pantalla los escribe con la sesión del usuario:
-- las tres páginas /admin/* solo leen el rol propio. Las escrituras quedan
-- reservadas a service_role y al propietario de la base (migraciones,
-- funciones SECURITY DEFINER como es_moderador() o
-- extinguish_personal_identity()).
--
-- "Roles públicos visibles" no se toca en esta migración (fuera de alcance).
--
-- Reversión: supabase/reversiones/20261002164941_profile_roles_solo_lectura_propia_inversa.sql

drop policy if exists "Rol propio" on public.profile_roles;

create policy "Rol propio - lectura"
  on public.profile_roles
  for select
  to authenticated
  using (auth.uid() = profile_id);

-- Sin política de escritura, la RLS ya rechaza INSERT/UPDATE/DELETE de los
-- roles de cliente; el REVOKE lo cierra también a nivel de privilegio
-- (incluido TRUNCATE, que no pasa por RLS).
revoke insert, update, delete, truncate on public.profile_roles from anon, authenticated;
