-- extinguish_personal_identity(p_profile_id) es SECURITY DEFINER y no comprueba
-- quién la llama: anonimiza el perfil que se le pase. Tenía EXECUTE para
-- public/anon/authenticated, así que cualquiera, sin sesión, podía vaciar el
-- perfil de cualquier usuario vía /rest/v1/rpc/extinguish_personal_identity.
--
-- Su único uso legítimo es el Evento Arquitectónico Atómico
-- (app/api/cuenta/eliminar/ejecutar/route.ts), que la invoca con la
-- service key tras verificar identidad y condiciones. Se deja solo a service_role.
revoke execute on function public.extinguish_personal_identity(uuid) from public, anon, authenticated;
grant execute on function public.extinguish_personal_identity(uuid) to service_role;
