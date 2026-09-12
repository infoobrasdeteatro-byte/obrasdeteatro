-- Postulaciones: crear una exige plan de pago, y el aplicante deja de poder
-- reescribir la decision del organizador.
--
-- CONTEXTO. public.casting_applications se creo antes de que el modelo de
-- negocio estuviera cerrado, con una sola politica "Aplicacion propia" de tipo
-- ALL sobre auth.uid() = applicant_id. De ahi salian dos problemas distintos:
--
--   1. Postularse no exigia plan de pago. Publicar si lo exige desde
--      20260911222915; presentarse a una convocatoria, no. Era el mismo
--      requisito comercial aplicado en un solo lado.
--
--   2. Una politica ALL autoriza tambien el UPDATE, y RLS no distingue
--      columnas: el aplicante podia escribir `status`, `notes`, `reviewer_id`
--      y `reviewed_at` de su propia postulacion. Es decir, podia declararse
--      'selected' a si mismo y borrar la valoracion del organizador.
--
-- Se parte igual que "Casting propio" en 20260911221359: una politica por
-- comando, porque PostgreSQL 17 no admite varios en una sola clausula FOR y
-- porque WITH CHECK solo vale en INSERT y UPDATE.
--
-- NO se tocan las politicas del organizador ("Aplicaciones del casting propio"
-- y "Propietario gestiona aplicaciones"), que siguen dandole acceso completo a
-- las postulaciones recibidas en sus castings.

drop policy if exists "Aplicacion propia" on public.casting_applications;

-- Leer lo propio: sin condicion de plan. Quien se postulo cuando pagaba debe
-- seguir viendo su postulacion aunque despues baje de plan.
drop policy if exists "Postulación propia - lectura" on public.casting_applications;
create policy "Postulación propia - lectura" on public.casting_applications
  for select
  using (auth.uid() = applicant_id);

-- Retirar la propia candidatura: tampoco exige plan, por el mismo motivo.
-- Retirarse es siempre potestad de quien se presento.
drop policy if exists "Postulación propia - retirada" on public.casting_applications;
create policy "Postulación propia - retirada" on public.casting_applications
  for delete
  using (auth.uid() = applicant_id);

-- NO se crea politica de UPDATE para el aplicante, y es deliberado: era la via
-- por la que podia alterar `status`, `notes` y `reviewer_id`, que son el
-- registro de una decision ajena. Si mas adelante se quiere que pueda corregir
-- su carta o su portfolio, no basta con anadir aqui un UPDATE: haria falta
-- restringir por columna (GRANT UPDATE (cover_letter, portfolio_url) o un
-- trigger que rechace cambios en el resto), porque RLS no distingue columnas.
-- Mientras tanto, corregir una postulacion es retirarla y volver a presentarla.

-- Crear: exige plan de pago, con la misma funcion que usa la creacion de
-- castings, para que la regla comercial tenga una sola definicion.
drop policy if exists "Postulación propia - creación" on public.casting_applications;
create policy "Postulación propia - creación" on public.casting_applications
  for insert
  with check (
    auth.uid() = applicant_id
    and public.plan_de_pago()
  );

-- El UNIQUE (casting_id, applicant_id) que impide postularse dos veces al
-- mismo casting YA EXISTE, y de hecho por duplicado: las restricciones
-- `casting_applications_casting_id_applicant_id_key` y `unique_application`
-- son identicas. No se anade ninguna. La duplicacion es inocua en correccion
-- -- mantiene dos indices unicos equivalentes -- pero sobra uno; retirarlo es
-- una limpieza aparte, no un cambio de comportamiento, y por eso no se hace
-- aqui.
