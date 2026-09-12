-- Correctora de la migracion anterior: el REVOKE por columna no revocaba nada.
--
-- QUE FALLO. `revoke select (col1, col2, col3) on castings from anon,
-- authenticated` se aplico sin error, pero era inocuo: anon y authenticated
-- tienen un GRANT SELECT a NIVEL DE TABLA (lo concede Supabase por defecto), y
-- PostgreSQL trata la concesion de tabla y las de columna como concesiones
-- SEPARADAS. Revocar unas columnas no resta de una concesion que ya cubre la
-- tabla entera, de modo que la lectura directa seguia funcionando:
--
--   como authenticated: select email_recepcion from castings  -> PERMITIDO
--   como anon:          select * from castings                -> PERMITIDO
--
-- Es un fallo silencioso de los peores: la migracion se aplica limpiamente, el
-- objeto "revocado" aparece en information_schema.column_privileges como
-- revocado, y la brecha sigue abierta. Solo se ve probandolo.
--
-- LA FORMA CORRECTA. Retirar el permiso de tabla y devolverlo columna a
-- columna, enumerando todas MENOS las tres. A partir de aqui, pedir una de las
-- tres en un SELECT -- incluido un `select *` -- falla por permisos.
revoke select on public.castings from anon, authenticated;

grant select (
  id, user_id, titulo, nombre_proyecto, entidad_organizadora, tipo_entidad,
  descripcion, sinopsis, tipo_otro, perfil_nombre, perfil_descripcion,
  edad_min, edad_max, genero_escenico, idiomas_requeridos,
  experiencia_requerida, formacion_requerida, habilidades_especiales,
  importe, fechas_previstas, lugar_trabajo, pais, ciudad,
  fecha_apertura, fecha_cierre, modalidad, descripcion_proceso,
  forma_candidatura, estado, publicado, destacado, scenaia_activo,
  created_at, updated_at, motivo_rechazo, motivo_filtro,
  tipo_remuneracion, categorias
) on public.castings to anon, authenticated;

-- CONSECUENCIA A TENER PRESENTE: al enumerar columnas, cualquier columna que se
-- anada a public.castings en el futuro NO sera legible por anon ni por
-- authenticated hasta que se le conceda permiso explicitamente. Es el precio de
-- cerrar esto de verdad, y es el lado seguro en el que equivocarse: una columna
-- nueva nace invisible en vez de nacer publicada por descuido.
--
-- Tambien implica que `select *` sobre castings deja de funcionar para esos
-- roles. Las consultas de la aplicacion enumeran columnas, salvo la pagina de
-- edicion, que se corrige en el mismo cambio.
