-- Reversión de la migración profile_roles_solo_lectura_propia.
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir.
--
-- ATENCIÓN: devuelve el estado VULNERABLE anterior. Con "Rol propio" FOR ALL
-- sin WITH CHECK, cualquier usuario con sesión puede volver a darse el rol
-- admin a sí mismo. Solo tiene sentido como paso intermedio hacia otra
-- corrección, nunca como estado final.

begin;

drop policy if exists "Rol propio - lectura" on public.profile_roles;

create policy "Rol propio"
  on public.profile_roles
  for all
  using (auth.uid() = profile_id);

grant insert, update, delete, truncate on public.profile_roles to anon, authenticated;

commit;
