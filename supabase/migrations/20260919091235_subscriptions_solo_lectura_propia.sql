-- subscriptions: el usuario solo puede LEER su propia fila.
--
-- La política "Suscripcion propia" era FOR ALL: el usuario podía insertar,
-- modificar y borrar su fila de subscriptions (status, plan, ids de Stripe).
-- Hoy no daba acceso a nada, porque los permisos salen de profiles.plan
-- (protegido desde 20260918151325), pero es escritura que nadie necesita:
-- todas las escrituras las hace el servidor con la service key (webhook de
-- Stripe y cancelación de suscripción), que no pasa por RLS. El único acceso
-- con la sesión del usuario es la lectura de lib/repository-layer/subscription.ts.
drop policy if exists "Suscripcion propia" on public.subscriptions;

create policy "Suscripcion propia - lectura"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = profile_id);
