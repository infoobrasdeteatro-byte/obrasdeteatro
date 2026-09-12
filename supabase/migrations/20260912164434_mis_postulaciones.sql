-- Mis postulaciones: el actor puede ver a que se ha presentado.
--
-- Es el reverso de bandeja_postulaciones. Hasta ahora un actor podia
-- postularse y no tenia ninguna pantalla donde ver su propia actividad: la
-- politica "Postulación propia - lectura" ya le dejaba leer sus filas, pero
-- faltaba poder acompanarlas del casting al que pertenecen.
--
-- POR QUE HACE FALTA UNA FUNCION Y NO BASTA LA RLS. Comprobado:
--
--   el actor ve sus 2 postulaciones
--   pero de sus 2 castings solo ve 1
--
-- Las politicas de castings dejan ver los publicados y los propios. En cuanto
-- el organizador cierra o cancela una convocatoria, deja de ser publicada y el
-- actor pierde de vista el casting al que se presento -- su postulacion
-- quedaria en pantalla sin titulo, sin entidad y sin explicacion. Y esa es
-- justo la fila que mas necesita entender: la que ya no va a ninguna parte.
--
-- La funcion es SECURITY DEFINER para poder acompanar la postulacion con los
-- datos de su casting sea cual sea el estado, y filtra por
-- applicant_id = auth.uid() en el cuerpo: solo devuelve lo propio.
--
-- NO devuelve datos de contacto. Esos siguen pasando por
-- contacto_del_casting(), que aplica su propia regla.
create or replace function public.mis_postulaciones(
  p_cursor_applied_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limite integer default 20
)
returns table (
  id uuid,
  casting_id uuid,
  status text,
  applied_at timestamptz,
  cover_letter text,
  portfolio_url text,
  casting_titulo text,
  casting_entidad text,
  casting_estado text,
  casting_fecha_apertura date,
  casting_fecha_cierre date
)
language plpgsql
stable
security definer
set search_path = 'public'
as $fn$
declare
  -- SQL dinamico por la misma razon que en bandeja_postulaciones: el patron
  -- "parametro is null or columna = parametro" produce un plan generico que
  -- ignora el indice del orden.
  v_sql text := 'select a.id, a.casting_id, a.status, a.applied_at,
                        a.cover_letter, a.portfolio_url,
                        c.titulo, c.entidad_organizadora, c.estado,
                        c.fecha_apertura, c.fecha_cierre
                 from public.casting_applications a
                 join public.castings c on c.id = a.casting_id
                 where a.applicant_id = auth.uid()';
begin
  if p_cursor_applied_at is not null then
    v_sql := v_sql || ' and (a.applied_at, a.id) < ($1, $2)';
  end if;
  v_sql := v_sql || ' order by a.applied_at desc, a.id desc limit $3';

  return query execute v_sql
    using p_cursor_applied_at, p_cursor_id, least(greatest(p_limite, 1), 100);
end;
$fn$;

comment on function public.mis_postulaciones is
  'Una pagina de las postulaciones propias, keyset sobre (applied_at desc, id desc), acompanadas del casting al que pertenecen aunque ya este cerrado o cancelado. SECURITY DEFINER, filtrada por applicant_id = auth.uid(). No devuelve datos de contacto: eso es contacto_del_casting().';

-- Indice para el recorrido ordenado de las postulaciones de UN actor. El que
-- ya existia sobre (applicant_id) resuelve el filtro pero obliga a ordenar
-- despues; este permite recorrer en orden y detenerse al completar la pagina,
-- igual que idx_casting_applications_orden hace para el organizador.
create index if not exists idx_casting_applications_mias
  on public.casting_applications (applicant_id, applied_at desc, id desc);
