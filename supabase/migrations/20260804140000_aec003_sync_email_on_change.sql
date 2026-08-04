-- AEC-003 Fase 4 (DA-002): profiles.email debe reflejar siempre y solo lo
-- que hay en auth.users.email -- sin segunda fuente de verdad. El trigger
-- fiere ante cualquier cambio real de auth.users.email (registro de
-- confirmacion segura de dos pasos incluido), sin depender de que el
-- cambio se origine en esta parte concreta del codigo.

create or replace function public.handle_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
  after update on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_changed();
