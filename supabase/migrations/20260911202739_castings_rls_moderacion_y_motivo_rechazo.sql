-- Castings: acceso de moderacion y motivo de rechazo.
--
-- Las dos migraciones anteriores dejaron el ciclo de vida cerrado
-- (20260911135109) y la decision de publicacion en el servidor
-- (20260911141543), pero moderacion no podia ejercerse: las unicas politicas
-- de public.castings eran "Casting propio" (auth.uid() = user_id) y "Castings
-- publicos" (publicado = true). Un admin/moderator no veia los castings
-- ajenos en 'pendiente_revision', de modo que la cola que el trigger alimenta
-- no era legible por nadie. Faltaba ademas donde escribir el motivo de un
-- rechazo, previsto en el flujo ("rechazado, con motivo, vuelve a edicion")
-- pero nunca anadido a la tabla.
--
-- No se toca el trigger trg_castings_sync_estado ni su funcion: el guard de
-- 'publicado'/'rechazado' sigue viviendo alli y sigue siendo la unica
-- autoridad sobre el estado. Esta migracion solo abre el acceso de lectura y
-- escritura que ese guard presupone.

-- 1. Motivo de rechazo.
--
--    NULL = no ha habido rechazo, o el rechazo no se motivo. No se rellena
--    con texto de relleno: la ausencia de motivo se dice callando (PRD-001).
--    No se limpia automaticamente al reenviar a revision; si mas adelante se
--    quiere que reenviar borre el motivo anterior, sera una decision
--    explicita del flujo, no un efecto colateral de esta columna.
alter table public.castings
  add column if not exists motivo_rechazo text;

comment on column public.castings.motivo_rechazo is
  'Motivo del rechazo, redactado por moderacion y visible para el organizador. NULL = sin rechazo o sin motivo declarado.';

-- 2. Moderacion gestiona cualquier casting.
--
--    Las politicas se acumulan (OR), asi que esta se suma a las dos ya
--    existentes sin modificarlas: el organizador conserva su acceso y el
--    publico el suyo. FOR ALL porque moderar exige leer la cola y escribir
--    el desenlace sobre filas que no son propias.
--
--    El EXISTS sobre profile_roles funciona bajo RLS porque la politica "Rol
--    propio" de esa tabla (auth.uid() = profile_id) permite a cada usuario
--    leer sus propias filas, que son justo las que se consultan aqui.
drop policy if exists "Moderación gestiona castings" on public.castings;

create policy "Moderación gestiona castings" on public.castings
  for all
  using (
    exists (
      select 1 from public.profile_roles
      where profile_id = auth.uid() and role in ('admin', 'moderator')
    )
  )
  with check (
    exists (
      select 1 from public.profile_roles
      where profile_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- 3. Moderacion lee el perfil de quien organiza.
--
--    ANADIDO respecto al diseno original de esta migracion, porque sin esto
--    el panel no puede cumplir su requisito de mostrar quien firma cada
--    convocatoria: las politicas de public.profiles solo dejan ver el perfil
--    propio y los perfiles publicos (perfil_publico and activo and
--    verificado), y hoy solo 15 de 36 perfiles cumplen esa condicion. El
--    resto llegaria al panel como un organizador anonimo.
--
--    Deliberadamente SOLO SELECT, no FOR ALL: moderar castings no es motivo
--    para poder editar perfiles ajenos. Es una ampliacion real de lo que un
--    moderador puede leer -- pasa a ver los 36 perfiles, no 15 --, y como
--    tal debe poder revertirse sola:
--
--      drop policy "Moderación consulta perfiles" on public.profiles;
drop policy if exists "Moderación consulta perfiles" on public.profiles;

create policy "Moderación consulta perfiles" on public.profiles
  for select
  using (
    exists (
      select 1 from public.profile_roles
      where profile_id = auth.uid() and role in ('admin', 'moderator')
    )
  );
