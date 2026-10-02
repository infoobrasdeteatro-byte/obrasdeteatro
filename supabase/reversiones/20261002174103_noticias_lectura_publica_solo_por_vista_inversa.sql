-- Reversión de la migración noticias_lectura_publica_solo_por_vista.
--
-- NO es una migración: está fuera de supabase/migrations a propósito, para
-- que ni `supabase db push` ni el historial la apliquen. Se ejecuta a mano,
-- solo si Dirección decide revertir.
--
-- Devuelve la lectura directa de las publicadas en la tabla noticias, con
-- todas sus columnas internas, a anon y authenticated.

begin;

create policy "Noticias publicadas visibles" on public.noticias
  for select
  using (estado = 'publicada');

commit;
