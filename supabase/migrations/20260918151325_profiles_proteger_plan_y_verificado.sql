-- profiles: plan, is_premium y verificado dejan de ser editables por el usuario.
--
-- La política "Usuario edita su propio perfil" (y "Perfil propio", FOR ALL)
-- no restringe columnas, así que cualquier usuario con sesión podía hacer
-- PATCH /rest/v1/profiles?id=eq.<su id> con plan='empresas', is_premium=true
-- y verificado=true: todas las ventajas de pago sin pagar, y el distintivo de
-- verificado sin la revisión documental. Con "Perfil propio" también podía
-- borrar su fila y volver a insertarla con esos valores.
--
-- Esos tres campos solo los escriben:
--   - el webhook de Stripe y la cancelación de suscripción (service_role);
--   - handle_new_user() y handle_user_email_confirmed(), triggers de la base
--     que corren como su propietario (postgres);
--   - la administración, desde la propia base.
-- Ninguna pantalla los modifica con la sesión del usuario.
--
-- La regla: si quien ejecuta es un rol de cliente (anon o authenticated),
-- esos campos no pueden cambiar en un UPDATE ni venir con valores distintos
-- de los de por defecto en un INSERT. La función NO es SECURITY DEFINER a
-- propósito: tiene que ver el current_user real de la petición (anon,
-- authenticated o service_role en PostgREST; postgres dentro de funciones
-- SECURITY DEFINER propiedad de postgres).

create or replace function public.profiles_proteger_campos_gestionados()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.plan is distinct from 'gratuito'
       or new.is_premium is distinct from false
       or new.verificado is distinct from false
    then
      raise exception 'plan, is_premium y verificado no se pueden fijar al crear un perfil'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.is_premium is distinct from old.is_premium
     or new.verificado is distinct from old.verificado
  then
    raise exception 'plan, is_premium y verificado solo los modifica la plataforma (suscripción de Stripe o verificación)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.profiles_proteger_campos_gestionados() is
  'Impide que anon/authenticated cambien plan, is_premium o verificado de un perfil (UPDATE) o los fijen con valores distintos de los de por defecto (INSERT). service_role y las funciones de la base no se ven afectados.';

drop trigger if exists profiles_proteger_campos_gestionados on public.profiles;
create trigger profiles_proteger_campos_gestionados
  before insert or update on public.profiles
  for each row execute function public.profiles_proteger_campos_gestionados();
