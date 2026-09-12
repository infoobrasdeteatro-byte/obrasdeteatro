-- Castings: la condicion de plan deja de depender de una politica ajena.
--
-- "Casting propio - creación" (20260911221359) comprobaba el plan con un
-- EXISTS directo sobre public.profiles. Funcionaba, pero solo porque la
-- politica "Perfil propio" de profiles deja a cada usuario leer su propia
-- fila: la condicion de plan se apoyaba en una politica de OTRA tabla que
-- nadie habia declarado como dependencia. Si esa politica se endurece algun
-- dia, crear castings deja de funcionar y nada lo anuncia -- la misma clase
-- de acoplamiento implicito que produjo la recursion corregida en
-- 20260911203312.
--
-- Se resuelve igual que alli: el predicado pasa a una funcion SECURITY
-- DEFINER que lee profiles por encima de RLS y por tanto no depende de
-- ninguna politica. La regla de negocio no cambia en absoluto -- crear exige
-- plan de pago, gestionar lo ya creado no -- solo cambia de donde saca la
-- respuesta.

create or replace function public.plan_de_pago()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and plan <> 'gratuito'
  );
$$;

comment on function public.plan_de_pago() is
  'True si quien consulta tiene un plan distinto de gratuito. SECURITY DEFINER a proposito: leer profiles desde una politica RLS sin bypass ata la condicion de plan a las politicas de profiles, que son ajenas a esta regla.';

drop policy if exists "Casting propio - creación" on public.castings;

create policy "Casting propio - creación" on public.castings
  for insert
  with check (
    auth.uid() = user_id
    and public.plan_de_pago()
  );
