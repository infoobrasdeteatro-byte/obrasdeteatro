-- Perfiles públicos: quedan fuera los que han solicitado la Extinción de Identidad.
--
-- CAPTURA DE UN CAMBIO YA APLICADO. Esta política se corrigió directamente
-- sobre la base de datos de producción; el cambio está vivo desde entonces.
-- Este archivo NO introduce nada nuevo: existe para que supabase/migrations/
-- refleje el estado real y no haya deriva entre el repo y producción.
--
-- QUÉ CAMBIA RESPECTO A LO QUE HABÍA. La política la dejó SEC-001
-- (20260803120000) como:
--
--   perfil_publico = true and activo = true and verificado = true
--
-- Le faltaba la cuarta condición. `extincion_solicitada_at` se añadió en
-- 20260804180000_aec003b_fase1_extincion_identidad_modelo_base, pero la
-- política no se actualizó entonces: un perfil que había pedido su extinción
-- seguía siendo legible públicamente mientras el proceso estuviera en curso.
--
-- Se usa `alter policy` y no `drop` + `create` a propósito: solo cambia el
-- predicado, y así no hay un instante -- por breve que sea dentro de la
-- transacción -- en el que la tabla quede sin esa política.
--
-- REAPLICARLO ES INOCUO. Esta migración no consta en el historial de
-- migraciones del proyecto remoto, porque el cambio se hizo fuera de ese
-- circuito. La primera vez que se ejecute `supabase db push` la aplicará, y
-- eso no tiene efecto alguno: el predicado que fija es exactamente el que la
-- política ya tiene.
alter policy "Perfiles públicos visibles" on public.profiles
  using (
    perfil_publico = true
    and activo = true
    and verificado = true
    and extincion_solicitada_at is null
  );
