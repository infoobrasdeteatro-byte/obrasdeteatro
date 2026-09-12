-- Castings: el filtro de ciudad pasa a poder usar indice.
--
-- HALLAZGO QUE LO MOTIVA. Los indices de 20260912134628 no servian a los dos
-- filtros de ubicacion del listado publico, porque la pagina los consultaba
-- con ILIKE '%valor%'. Un btree no puede resolver un patron con comodin
-- inicial: el indice se ignora y las filas se descartan en memoria. Medido
-- sobre 5.002 castings (3.002 publicados):
--
--   pais   ilike '%España%' -> 52,7 ms, Rows Removed by Filter: 2625
--   ciudad ilike '%Madrid%' -> 48,4 ms, Rows Removed by Filter: 2501
--
-- Los dos campos se arreglan de forma distinta porque no son la misma clase
-- de dato:
--
--   PAIS es un vocabulario cerrado y corto. No necesita busqueda aproximada:
--   se convierte en un selector de opciones y la consulta pasa a igualdad
--   exacta, que idx_castings_pais ya sabe resolver. Ese cambio es de la
--   aplicacion, no de la base, y por eso aqui no hay nada sobre `pais`: su
--   indice se queda tal cual, y lo que cambia es quien pregunta.
--
--   CIUDAD es texto escrito a mano, con variantes, tildes y erratas. Ahi la
--   busqueda parcial es justo lo que hace falta, asi que lo que hay que
--   cambiar es el indice.

create extension if not exists pg_trgm;

-- El btree de ciudad se retira: no servia al unico filtro que existe sobre
-- esa columna, y mantenerlo seria coste de escritura sin ninguna lectura.
drop index if exists public.idx_castings_ciudad;

-- GIN de trigramas: descompone cada valor en secuencias de tres caracteres,
-- de modo que un patron con comodines a ambos lados si puede buscarse por
-- indice. Es tambien lo que da tolerancia a erratas y variantes.
create index if not exists idx_castings_ciudad_trgm
  on public.castings using gin (ciudad gin_trgm_ops);

comment on index public.idx_castings_ciudad_trgm is
  'Trigramas para el filtro ILIKE de ciudad del listado publico. Un btree no puede resolver un patron con comodin inicial.';
