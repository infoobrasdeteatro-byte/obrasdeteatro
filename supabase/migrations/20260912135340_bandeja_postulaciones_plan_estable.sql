-- Correctora de la migracion anterior: la version en SQL plano de
-- bandeja_postulaciones generaba un plan generico por el patron
-- "parametro is null or columna = parametro", que ignora
-- idx_casting_applications_orden. Medido: 72 ms. Con SQL dinamico, que solo
-- anade al WHERE los filtros realmente presentes, el plan vuelve a recorrer el
-- indice en orden y detenerse al completar la pagina: 8 ms.
create or replace function public.bandeja_postulaciones(
  p_casting uuid default null,
  p_status text default null,
  p_cursor_applied_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limite integer default 20
)
returns setof public.casting_applications
language plpgsql
stable
set search_path = 'public'
as $fn$
declare
  v_sql text := 'select a.* from public.casting_applications a where public.es_mi_casting(a.casting_id)';
begin
  if p_casting is not null then v_sql := v_sql || ' and a.casting_id = $1'; end if;
  if p_status is not null then v_sql := v_sql || ' and a.status = $2'; end if;
  if p_cursor_applied_at is not null then
    v_sql := v_sql || ' and (a.applied_at, a.id) < ($3, $4)';
  end if;
  v_sql := v_sql || ' order by a.applied_at desc, a.id desc limit $5';

  return query execute v_sql
    using p_casting, p_status, p_cursor_applied_at, p_cursor_id, least(greatest(p_limite,1),100);
end;
$fn$;
