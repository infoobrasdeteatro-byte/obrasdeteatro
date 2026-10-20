-- Tres obras anónimas de la carga de la BNE (20261020220000) llegaron con el
-- título empezando por coma, como las 14 que corrigió 20261020200000: fuera la
-- puntuación inicial y primera letra en mayúscula. Los slugs ya estaban bien.
update public.works
set title = upper(left(regexp_replace(title, '^[\s,;:.]+', ''), 1))
         || substr(regexp_replace(title, '^[\s,;:.]+', ''), 2)
where external_ref like 'bne:%' and title ~ '^[\s,;:.]';
