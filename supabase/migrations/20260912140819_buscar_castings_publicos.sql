-- El indice de trigramas de la migracion anterior es correcto y funciona, pero
-- bajo RLS no se alcanza nunca. Medido sobre 5.002 castings:
--
--   como propietario (sin RLS): Bitmap Index Scan on idx_castings_ciudad_trgm -> 3,2 ms
--   como anon (con RLS):        Filter: ciudad ~~* '%Madrid%'                 -> 52,0 ms
--
-- La causa no es el indice ni el volumen: PostgreSQL no empuja una clausula NO
-- LEAKPROOF por debajo de la barrera de seguridad que impone RLS, porque
-- hacerlo podria revelar filas que la politica oculta. En pg_proc:
--   texteq     (=)   proleakproof = true   -> el filtro de pais si llega al indice
--   texticlike (~~*) proleakproof = false  -> el de ciudad no
--
-- Por eso el listado publico se sirve desde una funcion SECURITY DEFINER: sin
-- RLS de por medio, la condicion vuelve a ser indexable. La funcion es MAS
-- estrecha que la politica publica a la que sustituye -- fija estado
-- 'publicado' en el propio cuerpo y no devuelve ninguna columna de contacto --,
-- de modo que no expone nada que "Castings públicos" no expusiera ya.
create or replace function public.buscar_castings_publicos(
  p_pais text default null,
  p_ciudad text default null,
  p_categorias text[] default null,
  p_limite integer default 50
)
returns table (
  id uuid,
  titulo text,
  nombre_proyecto text,
  entidad_organizadora text,
  categorias text[],
  pais text,
  ciudad text,
  fecha_apertura date,
  fecha_cierre date,
  tipo_remuneracion text
)
language plpgsql
stable
security definer
set search_path = 'public'
as $fn$
declare
  v_sql text := 'select c.id, c.titulo, c.nombre_proyecto, c.entidad_organizadora, c.categorias,
                        c.pais, c.ciudad, c.fecha_apertura, c.fecha_cierre, c.tipo_remuneracion
                 from public.castings c
                 where c.estado = ''publicado''';
begin
  if p_pais is not null then v_sql := v_sql || ' and c.pais = $1'; end if;
  if p_ciudad is not null then v_sql := v_sql || ' and c.ciudad ilike ''%'' || $2 || ''%'''; end if;
  if p_categorias is not null and array_length(p_categorias, 1) > 0 then
    v_sql := v_sql || ' and c.categorias && $3';
  end if;
  v_sql := v_sql || ' order by c.fecha_cierre asc limit $4';

  return query execute v_sql
    using p_pais, p_ciudad, p_categorias, least(greatest(p_limite, 1), 200);
end;
$fn$;

comment on function public.buscar_castings_publicos is
  'Listado publico de convocatorias. SECURITY DEFINER para que el filtro ILIKE de ciudad pueda usar el indice de trigramas: bajo RLS, una clausula no leakproof nunca se convierte en condicion de indice. Acota a estado publicado en el cuerpo y no devuelve datos de contacto.';

-- Los paises realmente presentes, para el selector del listado. Mismo patron
-- que listOrganizationLocations en el Repository Layer: el vocabulario sale del
-- dato real, nunca de un diccionario geografico inventado.
create or replace function public.paises_con_castings()
returns table (pais text)
language sql
stable
security definer
set search_path = 'public'
as $$
  select distinct c.pais
  from public.castings c
  where c.estado = 'publicado' and c.pais is not null
  order by 1;
$$;
