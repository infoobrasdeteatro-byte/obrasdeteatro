-- Títulos de la carga de la BNE que empezaban por coma o punto, restos de
--    «Comedia famosa, …» en el catálogo original: fuera la puntuación inicial
--    y primera letra en mayúscula.
update public.works
set title = upper(left(regexp_replace(title, '^[\s,;:.]+', ''), 1))
         || substr(regexp_replace(title, '^[\s,;:.]+', ''), 2)
where external_ref like 'bne:%' and title ~ '^[\s,;:.]';
