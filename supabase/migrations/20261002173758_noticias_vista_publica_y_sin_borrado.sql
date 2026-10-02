-- Noticias (bloque 2): vista pública y fin del borrado.
--
-- 1. VISTA noticias_publicas. La web pública lee SOLO de aquí, nunca de la
--    tabla noticias: la vista expone lo que pinta una tarjeta (titular,
--    resumen, categoría con su etiqueta, país, fuente, URL original y fechas)
--    y deja fuera lo interno (revisado_por, motivos, lote, origen).
--
--    La etiqueta de la categoría sale aunque la categoría esté desactivada:
--    la vista lee noticias_categorias con los permisos de su propietario, sin
--    pasar por la política "Categorías de noticias activas visibles". Igual
--    con la fuente, cuya tabla no tiene lectura pública.
--
--    Se ejecuta con los permisos de su propietario a propósito (no es
--    security_invoker). Solo SELECT para anon y authenticated.
--
-- 2. Sin DELETE sobre noticias para authenticated. Las noticias no se borran:
--    se descartan o se retiran, y así cada salida queda en noticias_registro
--    (el borrado no dejaba rastro). La política "Moderación gestiona
--    noticias" sigue siendo FOR ALL, pero sin el privilegio el DELETE falla.
--    service_role conserva el privilegio para mantenimiento.

create view public.noticias_publicas
with (security_barrier = true)
as
select
  n.id,
  n.titular,
  n.resumen,
  n.categoria_id,
  c.etiqueta  as categoria_etiqueta,
  n.pais_code,
  f.nombre    as fuente_nombre,
  f.dominio   as fuente_dominio,
  f.url_web   as fuente_url_web,
  n.url_original,
  n.fecha_original,
  n.publicado_at
from public.noticias n
join public.noticias_categorias c on c.id = n.categoria_id
join public.noticias_fuentes f on f.id = n.fuente_id
where n.estado = 'publicada';

comment on view public.noticias_publicas is
  'Noticias publicadas con las columnas de la tarjeta pública. Única fuente de la sección /noticias. Solo lectura para anon y authenticated.';

revoke all on public.noticias_publicas from anon, authenticated;
grant select on public.noticias_publicas to anon, authenticated;

revoke delete on public.noticias from authenticated;
