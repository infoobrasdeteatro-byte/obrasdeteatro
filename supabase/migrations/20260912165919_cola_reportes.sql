-- Cola de reportes: la pagina que faltaba para que reportar sirviera de algo.
--
-- public.casting_reportes existe desde 20260911221521 con su politica y su
-- boton, pero nadie podia revisarlos: los reportes se acumulaban sin pantalla
-- donde resolverlos. Esta funcion entrega esa cola.
--
-- Orden ASCENDENTE por fecha, al reves que las dos bandejas: aqui lo que
-- importa es lo que lleva mas tiempo esperando, no lo ultimo que ha llegado.
-- El cursor compara con > en vez de <, por lo mismo.
--
-- SECURITY DEFINER para poder acompanar cada reporte con el casting reportado
-- SEA CUAL SEA SU ESTADO -- un casting ya rechazado o cerrado sigue teniendo
-- reportes que resolver -- y con el nombre de quien reporto. Al ser definer, la
-- comprobacion de rol NO puede delegarse en la RLS: se hace en el cuerpo, y
-- quien no modera recibe cero filas.
create or replace function public.cola_reportes(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limite integer default 20
)
returns table (
  id uuid,
  casting_id uuid,
  motivo text,
  created_at timestamptz,
  reportante text,
  casting_titulo text,
  casting_estado text,
  organizador text
)
language plpgsql
stable
security definer
set search_path = 'public'
as $fn$
declare
  v_sql text := 'select r.id, r.casting_id, r.motivo, r.created_at,
                        nullif(trim(coalesce(pr.nombre,'''') || '' '' || coalesce(pr.apellidos,'''')), ''''),
                        c.titulo, c.estado,
                        nullif(trim(coalesce(po.nombre,'''') || '' '' || coalesce(po.apellidos,'''')), '''')
                 from public.casting_reportes r
                 join public.castings c on c.id = r.casting_id
                 left join public.profiles pr on pr.id = r.reporter_id
                 left join public.profiles po on po.id = c.user_id
                 where r.estado = ''pendiente''';
begin
  -- El rol se comprueba aqui, no en una politica: la funcion es definer.
  if not public.es_moderador() then
    return;
  end if;

  -- SQL dinamico por la misma razon que en las otras colas: el patron
  -- "parametro is null or columna = parametro" genera un plan generico.
  if p_cursor_created_at is not null then
    v_sql := v_sql || ' and (r.created_at, r.id) > ($1, $2)';
  end if;
  v_sql := v_sql || ' order by r.created_at asc, r.id asc limit $3';

  return query execute v_sql
    using p_cursor_created_at, p_cursor_id, least(greatest(p_limite, 1), 100);
end;
$fn$;

comment on function public.cola_reportes is
  'Cola de reportes pendientes, del mas antiguo al mas reciente, keyset sobre (created_at asc, id asc). SECURITY DEFINER: comprueba es_moderador() en el cuerpo y devuelve cero filas a quien no modera.';

-- Indice para el recorrido: filtro por estado y orden por fecha.
create index if not exists idx_casting_reportes_cola
  on public.casting_reportes (estado, created_at, id);
