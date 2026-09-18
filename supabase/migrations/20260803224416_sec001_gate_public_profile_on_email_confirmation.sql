-- SEC-001 Fase 1: la visibilidad pública de un perfil queda condicionada a la
-- confirmación del correo. `verificado` deja de ser una columna sin efecto.

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.profiles
  set verificado = true
  where id = new.id
    and verificado = false;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;

create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_email_confirmed();

-- Backfill: usuarios que ya confirmaron su correo antes de esta migración no
-- disparan el trigger anterior (solo reacciona a la transición null -> not null).
update public.profiles p
set verificado = true
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and p.verificado = false;

drop policy if exists "Perfiles públicos visibles" on public.profiles;

create policy "Perfiles públicos visibles"
  on public.profiles
  for select
  to public
  using (perfil_publico = true and activo = true and verificado = true);
