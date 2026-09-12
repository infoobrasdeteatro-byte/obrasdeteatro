-- Castings: indices para las consultas que ya existen, y retirada de dos
-- objetos duplicados.
--
-- Hasta ahora public.castings solo tenia el indice de su clave primaria. Todas
-- las pantallas construidas filtran por otra cosa -- el listado publico por
-- estado y ubicacion, "Mis castings" por user_id, el panel de moderacion por
-- estado -- de modo que cada una hacia un recorrido secuencial. Con dos filas
-- de prueba da igual; con miles, no.

-- 1. Indices de castings.
--
--    idx_castings_user_id        "Mis castings" y la politica "Casting propio".
--    idx_castings_estado_*       el listado publico y la cola de moderacion,
--                                que siempre filtran por estado primero.
--    idx_castings_pais/ciudad    los filtros del listado publico.
--    idx_castings_categorias     GIN, porque el filtro de categorias usa el
--                                operador de solapamiento (&&) sobre un
--                                text[], que un btree no puede resolver.
create index if not exists idx_castings_user_id
  on public.castings (user_id);

create index if not exists idx_castings_estado_fecha_apertura
  on public.castings (estado, fecha_apertura desc);

create index if not exists idx_castings_pais
  on public.castings (pais);

create index if not exists idx_castings_ciudad
  on public.castings (ciudad);

create index if not exists idx_castings_categorias
  on public.castings using gin (categorias);

-- 2. Indices de postulaciones.
--
--    applicant_id sirve a la politica "Postulación propia - lectura" y a la
--    comprobacion de "ya te postulaste" de la ficha publica.
--    casting_id NO lleva indice propio: es el primer elemento del indice
--    unico compuesto (casting_id, applicant_id), que un btree ya puede usar
--    como prefijo. Un indice adicional seria coste de escritura sin lectura
--    nueva.
--
--    Tampoco se indexa aqui el orden de la bandeja del organizador
--    (applied_at desc, id desc): ver la nota al final del archivo.
create index if not exists idx_casting_applications_applicant_id
  on public.casting_applications (applicant_id);

-- 3. Indice unico duplicado.
--
--    COMPROBADO antes de borrar: `unique_application` y
--    `casting_applications_casting_id_applicant_id_key` tienen definiciones
--    identicas en pg_indexes -- misma tabla, mismo metodo btree, mismas dos
--    columnas y en el mismo orden. Mantener los dos duplicaba el coste de
--    escritura y el espacio sin aportar ninguna garantia extra. Se conserva el
--    que genera Postgres por convencion a partir del UNIQUE de la tabla.
--
--    Se suelta la CONSTRAINT y no el indice: el indice existe porque lo exige
--    una constraint homonima, y `drop index` falla con 2BP01 mientras esa
--    constraint siga ahi. Al soltar la constraint desaparece su indice con ella.
alter table public.casting_applications
  drop constraint if exists unique_application;

-- 4. Politica de lectura redundante.
--
--    COMPROBADO antes de borrar: "Aplicaciones del casting propio" (SELECT) y
--    "Propietario gestiona aplicaciones" (ALL) tienen la MISMA expresion
--    USING, el mismo rol {public} y las dos son PERMISSIVE. Como las politicas
--    permisivas se combinan con OR y una politica ALL cubre tambien el SELECT,
--    la primera no autorizaba ni una sola fila que la segunda no autorizase ya.
drop policy if exists "Aplicaciones del casting propio" on public.casting_applications;

-- NOTA sobre el orden de la bandeja de postulaciones.
--
-- La bandeja del organizador pagina por keyset sobre (applied_at desc, id desc)
-- filtrando por los castings propios. El indice que serviria a esa consulta es
-- (casting_id, applied_at desc, id desc), no uno sobre applied_at a secas. No
-- se crea aqui porque conviene decidirlo con el plan de consulta real medido
-- sobre volumen, no de antemano: ver el resumen de esta fase.
