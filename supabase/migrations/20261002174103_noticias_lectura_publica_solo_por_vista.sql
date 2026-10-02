-- Noticias: el público lee solo a través de la vista noticias_publicas.
--
-- La política "Noticias publicadas visibles" (migración noticias) dejaba a
-- anon y authenticated leer TODAS las columnas de las noticias publicadas
-- directamente en la tabla, incluidas las internas (revisado_por,
-- lote_importacion, origen, motivos). La web ya no la usa: /noticias lee de
-- noticias_publicas, que expone solo las columnas de la tarjeta y se ejecuta
-- con los permisos de su propietario, así que no depende de esta política.
--
-- Sin ella, quien no modera no lee ninguna fila de la tabla noticias. La
-- política "Moderación gestiona noticias" (es_moderador()) sigue intacta: el
-- panel /admin/noticias funciona igual.

drop policy if exists "Noticias publicadas visibles" on public.noticias;
