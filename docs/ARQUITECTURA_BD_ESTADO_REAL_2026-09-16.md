# Arquitectura de BD — Estado REAL del esquema `public`

**Proyecto:** obrasdeteatro · **Supabase ref:** `pnsirwtiiurczjwrayza` · **Región:** `eu-west-1`  
**Fecha de generación:** 2026-09-16  
**Estado del proyecto en el momento de la lectura:** `ACTIVE_HEALTHY`  
**PostgreSQL:** 17.6.1.127 (engine 17, canal GA) · **Host:** `db.pnsirwtiiurczjwrayza.supabase.co`  
**Organización:** `kxrplhdenawtjwpeusdy` · **Proyecto creado:** 2026-06-05

---

## 0. Qué es este documento (y qué no es)

> ⚠️ **Esto es un *snapshot* real, no un diseño teórico.**
>
> Todo el contenido de las secciones 1–3 procede de una lectura directa del proyecto en producción
> vía MCP (`Supabase:get_project`, `Supabase:list_tables` con `verbose: true` sobre el esquema `public`,
> y `Supabase:list_migrations`), ejecutada el **2026-09-16**. No se ha inferido ni completado nada a partir
> de migraciones, de código de la aplicación ni de documentación previa.
>
> **No sustituye a `ARQUITECTURA_BD_SUPABASE_v1.2`**, que sigue siendo el documento de diseño.
> Este describe lo que la base de datos *es* hoy; aquel describe lo que se *pretendía* que fuera.
> Donde ambos difieren, la sección 4 lo hace explícito.
>
> **Operaciones realizadas:** solo lectura. Ninguna migración, DDL ni escritura de datos.

### Límites de esta lectura

Lo que `list_tables` devuelve y por tanto está aquí: nombre de tabla, comentario, estado de RLS,
recuento de filas, y por cada columna su tipo, nulabilidad y valor por defecto, más la clave primaria.

Lo que **no** está cubierto y requeriría una lectura aparte: claves foráneas y `ON DELETE`, índices,
constraints `CHECK` y `UNIQUE`, el texto de las políticas RLS, triggers, funciones, vistas,
valores de los tipos `enum`, y la configuración de Storage. Que una tabla figure con **RLS habilitado**
significa que el interruptor está activo — **no** dice si las políticas que cuelgan de él son correctas.

---

## 1. Resumen

| Métrica | Valor |
|---|---|
| Tablas en `public` | **41** |
| Tablas con RLS habilitado | **41 / 41** |
| Tablas con datos (> 0 filas) | 11 |
| Tablas vacías | 30 |
| Tablas con comentario en BD | 3 |
| Migraciones aplicadas | 50 (última: `20260916082039_rls_perfiles_publicos_excluye_extincion`) |

### Tablas con datos

| Tabla | Filas | Lectura |
|---|---:|---|
| `telemetry_metrics` | 168 | Telemetría acumulada; el módulo está vivo. |
| `credit_reservations` | 84 | Motor de contabilidad de créditos en uso real. |
| `profiles` | 38 | Base de usuarios registrados. |
| `nucleo_activity_log` | 16 | Actividad del núcleo registrada. |
| `works` | 11 | Obras cargadas (fondo de biblioteca). |
| `work_files` | 11 | 1 archivo por obra: paridad exacta con `works`. |
| `casting_categorias` | 10 | Vocabulario semilla cargado. |
| `moderacion_reglas` | 5 | Reglas semilla del filtro automático. |
| `profile_roles` | 1 | Un único rol asignado en toda la plataforma. |
| `subscriptions` | 1 | Una única suscripción registrada. |
| `institutions` | 1 | Una única institución dada de alta. |
| `profile_follows` | 1 | Un único seguimiento entre perfiles. |

---

## 2. Inventario por módulo

| Módulo | Tablas | Nuevas vs v1.2 |
|---|---:|---:|
| Auth / Perfiles (núcleo) | 2 | 0 |
| Perfiles especializados por rol | 8 | 8 |
| Perfil extendido (currículum y actividad social) | 7 | 7 |
| Castings | 3 | 1 |
| Suscripciones / Stripe y consumo | 2 | 1 |
| Contenido / Works | 4 | 1 |
| Convocatorias, eventos y ticketing | 4 | 0 |
| Mensajería y notificaciones | 3 | 0 |
| Moderación | 4 | 2 |
| Telemetría / Admin | 4 | 2 |
| **Total** | **41** | **22** |

---

## 3. Detalle por tabla

Leyenda: 🆕 = tabla que no figura en `ARQUITECTURA_BD_SUPABASE_v1.2`.

### Auth / Perfiles (núcleo)

#### `profiles`

**RLS:** ✅ habilitado · **Filas:** 38 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | — |
| `nombre` | `text` | **NOT NULL** | — |
| `apellidos` | `text` | NULL | — |
| `nombre_artistico` | `text` | NULL | — |
| `email` | `text` | **NOT NULL** | — |
| `tipo_perfil` | `tipo_perfil` (enum) | **NOT NULL** | `'publico'::tipo_perfil` |
| `pais` | `text` | **NOT NULL** | `'España'::text` |
| `ciudad` | `text` | NULL | — |
| `idioma` | `text` | **NOT NULL** | `'es'::text` |
| `plan` | `plan_suscripcion` (enum) | **NOT NULL** | `'gratuito'::plan_suscripcion` |
| `acepta_terminos` | `boolean` | **NOT NULL** | `false` |
| `acepta_privacidad` | `boolean` | **NOT NULL** | `false` |
| `mayor_de_edad` | `boolean` | **NOT NULL** | `false` |
| `info_veraz` | `boolean` | **NOT NULL** | `false` |
| `marketing_general` | `boolean` | **NOT NULL** | `false` |
| `marketing_comercial` | `boolean` | **NOT NULL** | `false` |
| `verificado` | `boolean` | **NOT NULL** | `false` |
| `perfil_publico` | `boolean` | **NOT NULL** | `true` |
| `activo` | `boolean` | **NOT NULL** | `true` |
| `scenaia_analisis` | `boolean` | **NOT NULL** | `false` |
| `scenaia_recomendaciones` | `boolean` | **NOT NULL** | `false` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `slug` | `text` | NULL | — |
| `bio` | `text` | NULL | — |
| `avatar_url` | `text` | NULL | — |
| `cover_url` | `text` | NULL | — |
| `phone` | `text` | NULL | — |
| `is_premium` | `boolean` | **NOT NULL** | `false` |
| `deleted_at` | `timestamp with time zone` | NULL | — |
| `country_code` | `character varying` | NULL | — |
| `region` | `text` | NULL | — |
| `postal_code` | `text` | NULL | — |
| `website_url` | `text` | NULL | — |
| `social_links` | `jsonb` | NULL | — |
| `welcome_email_sent_at` | `timestamp with time zone` | NULL | — |
| `extincion_solicitada_at` | `timestamp with time zone` | NULL | — |
| `identidad_extinguida_at` | `timestamp with time zone` | NULL | — |

#### `profile_roles`

**RLS:** ✅ habilitado · **Filas:** 1 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `role` | `text` | **NOT NULL** | — |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

---

### Perfiles especializados por rol

#### `perfil_actor`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `fecha_nacimiento` | `date` | NULL | — |
| `nacionalidad` | `text` | NULL | — |
| `foto_principal` | `text` | NULL | — |
| `biografia` | `text` | NULL | — |
| `experiencia` | `text` | NULL | — |
| `formacion` | `text` | NULL | — |
| `premios` | `text` | NULL | — |
| `genero` | `text` | NULL | — |
| `altura` | `integer` | NULL | — |
| `idiomas` | `text[]` | NULL | — |
| `acentos` | `text[]` | NULL | — |
| `habilidad_canto` | `boolean` | NULL | `false` |
| `habilidad_danza` | `boolean` | NULL | `false` |
| `habilidad_improvisacion` | `boolean` | NULL | `false` |
| `habilidad_esgrima` | `boolean` | NULL | `false` |
| `habilidad_musical` | `boolean` | NULL | `false` |
| `habilidad_doblaje` | `boolean` | NULL | `false` |
| `habilidad_presentacion` | `boolean` | NULL | `false` |
| `habilidad_magia` | `boolean` | NULL | `false` |
| `habilidad_circo` | `boolean` | NULL | `false` |
| `otras_habilidades` | `text` | NULL | — |
| `disp_castings` | `boolean` | NULL | `false` |
| `disp_teatro` | `boolean` | NULL | `false` |
| `disp_cine` | `boolean` | NULL | `false` |
| `disp_television` | `boolean` | NULL | `false` |
| `disp_publicidad` | `boolean` | NULL | `false` |
| `disp_giras` | `boolean` | NULL | `false` |
| `disp_internacional` | `boolean` | NULL | `false` |
| `web` | `text` | NULL | — |
| `email_profesional` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `mostrar_email` | `boolean` | NULL | `false` |
| `mostrar_telefono` | `boolean` | NULL | `false` |
| `mostrar_whatsapp` | `boolean` | NULL | `false` |
| `mostrar_redes` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_director`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `fecha_nacimiento` | `date` | NULL | — |
| `nacionalidad` | `text` | NULL | — |
| `foto_principal` | `text` | NULL | — |
| `biografia` | `text` | NULL | — |
| `trayectoria` | `text` | NULL | — |
| `formacion` | `text` | NULL | — |
| `premios` | `text` | NULL | — |
| `esp_clasico` | `boolean` | NULL | `false` |
| `esp_contemporaneo` | `boolean` | NULL | `false` |
| `esp_musical` | `boolean` | NULL | `false` |
| `esp_infantil` | `boolean` | NULL | `false` |
| `esp_experimental` | `boolean` | NULL | `false` |
| `esp_opera` | `boolean` | NULL | `false` |
| `esp_zarzuela` | `boolean` | NULL | `false` |
| `esp_performance` | `boolean` | NULL | `false` |
| `esp_comunitario` | `boolean` | NULL | `false` |
| `otras_especialidades` | `text` | NULL | — |
| `disp_proyectos` | `boolean` | NULL | `false` |
| `disp_coproducciones` | `boolean` | NULL | `false` |
| `disp_festivales` | `boolean` | NULL | `false` |
| `disp_giras` | `boolean` | NULL | `false` |
| `disp_internacional` | `boolean` | NULL | `false` |
| `disp_formacion` | `boolean` | NULL | `false` |
| `web` | `text` | NULL | — |
| `email_profesional` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `mostrar_email` | `boolean` | NULL | `false` |
| `mostrar_telefono` | `boolean` | NULL | `false` |
| `mostrar_redes` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_dramaturgo`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `fecha_nacimiento` | `date` | NULL | — |
| `nacionalidad` | `text` | NULL | — |
| `foto_principal` | `text` | NULL | — |
| `biografia` | `text` | NULL | — |
| `trayectoria` | `text` | NULL | — |
| `formacion` | `text` | NULL | — |
| `premios` | `text` | NULL | — |
| `esp_comedia` | `boolean` | NULL | `false` |
| `esp_drama` | `boolean` | NULL | `false` |
| `esp_tragedia` | `boolean` | NULL | `false` |
| `esp_musical` | `boolean` | NULL | `false` |
| `esp_infantil` | `boolean` | NULL | `false` |
| `esp_experimental` | `boolean` | NULL | `false` |
| `esp_historico` | `boolean` | NULL | `false` |
| `esp_monologo` | `boolean` | NULL | `false` |
| `esp_microteatro` | `boolean` | NULL | `false` |
| `otras_especialidades` | `text` | NULL | — |
| `total_obras_escritas` | `integer` | NULL | `0` |
| `total_obras_estrenadas` | `integer` | NULL | `0` |
| `total_obras_publicadas` | `integer` | NULL | `0` |
| `acepta_solicitudes_representacion` | `boolean` | NULL | `false` |
| `acepta_licenciamiento` | `boolean` | NULL | `false` |
| `acepta_publicacion_editorial` | `boolean` | NULL | `false` |
| `acepta_traduccion` | `boolean` | NULL | `false` |
| `acepta_adaptacion_audiovisual` | `boolean` | NULL | `false` |
| `web` | `text` | NULL | — |
| `email_profesional` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `mostrar_email` | `boolean` | NULL | `false` |
| `mostrar_telefono` | `boolean` | NULL | `false` |
| `mostrar_redes` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_compania`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `nombre_compania` | `text` | **NOT NULL** | — |
| `nombre_comercial` | `text` | NULL | — |
| `anio_fundacion` | `integer` | NULL | — |
| `direccion` | `text` | NULL | — |
| `nif_cif` | `text` | NULL | — |
| `logo` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `historia` | `text` | NULL | — |
| `mision` | `text` | NULL | — |
| `vision` | `text` | NULL | — |
| `valores` | `text` | NULL | — |
| `num_producciones` | `integer` | NULL | `0` |
| `num_integrantes` | `integer` | NULL | `0` |
| `tipo_clasico` | `boolean` | NULL | `false` |
| `tipo_contemporaneo` | `boolean` | NULL | `false` |
| `tipo_musical` | `boolean` | NULL | `false` |
| `tipo_infantil` | `boolean` | NULL | `false` |
| `tipo_experimental` | `boolean` | NULL | `false` |
| `tipo_comunitario` | `boolean` | NULL | `false` |
| `tipo_profesional` | `boolean` | NULL | `false` |
| `tipo_amateur` | `boolean` | NULL | `false` |
| `serv_contratacion` | `boolean` | NULL | `false` |
| `serv_coproducciones` | `boolean` | NULL | `false` |
| `serv_giras` | `boolean` | NULL | `false` |
| `serv_formacion` | `boolean` | NULL | `false` |
| `serv_internacional` | `boolean` | NULL | `false` |
| `responsable_nombre` | `text` | NULL | — |
| `responsable_cargo` | `text` | NULL | — |
| `responsable_email` | `text` | NULL | — |
| `responsable_telefono` | `text` | NULL | — |
| `web` | `text` | NULL | — |
| `email_corporativo` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `verificado_solicitado` | `boolean` | NULL | `false` |
| `mostrar_contacto` | `boolean` | NULL | `true` |
| `mostrar_responsable` | `boolean` | NULL | `false` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_productora`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `nombre_productora` | `text` | **NOT NULL** | — |
| `nombre_comercial` | `text` | NULL | — |
| `anio_fundacion` | `integer` | NULL | — |
| `direccion` | `text` | NULL | — |
| `nif_cif` | `text` | NULL | — |
| `logo` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `historia` | `text` | NULL | — |
| `num_producciones` | `integer` | NULL | `0` |
| `num_proyectos_activos` | `integer` | NULL | `0` |
| `tipo_teatral` | `boolean` | NULL | `false` |
| `tipo_audiovisual` | `boolean` | NULL | `false` |
| `tipo_musical` | `boolean` | NULL | `false` |
| `tipo_eventos` | `boolean` | NULL | `false` |
| `tipo_festivales` | `boolean` | NULL | `false` |
| `tipo_independiente` | `boolean` | NULL | `false` |
| `tipo_distribucion` | `boolean` | NULL | `false` |
| `tipo_gestion_cultural` | `boolean` | NULL | `false` |
| `tipo_coproducciones_int` | `boolean` | NULL | `false` |
| `responsable_nombre` | `text` | **NOT NULL** | — |
| `responsable_cargo` | `text` | **NOT NULL** | — |
| `responsable_email` | `text` | **NOT NULL** | — |
| `responsable_telefono` | `text` | NULL | — |
| `web` | `text` | NULL | — |
| `email_corporativo` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `verificado_solicitado` | `boolean` | NULL | `false` |
| `mostrar_contacto` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_teatro`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `nombre_teatro` | `text` | **NOT NULL** | — |
| `nombre_comercial` | `text` | NULL | — |
| `anio_fundacion` | `integer` | NULL | — |
| `direccion` | `text` | **NOT NULL** | — |
| `codigo_postal` | `text` | NULL | — |
| `logo` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `historia` | `text` | NULL | — |
| `naturaleza_juridica` | `text` | NULL | — |
| `capacidad_total` | `integer` | NULL | — |
| `num_salas` | `integer` | NULL | `1` |
| `tipo_escenario` | `text` | NULL | — |
| `accesibilidad_pmr` | `boolean` | NULL | `false` |
| `accesibilidad_ascensor` | `boolean` | NULL | `false` |
| `accesibilidad_bucle` | `boolean` | NULL | `false` |
| `descripcion_tecnica` | `text` | NULL | — |
| `usa_ticketing_obrasdeteatro` | `boolean` | NULL | `false` |
| `url_ticketing_externo` | `text` | NULL | — |
| `disponible_alquiler` | `boolean` | NULL | `false` |
| `disponible_ensayos` | `boolean` | NULL | `false` |
| `responsable_nombre` | `text` | **NOT NULL** | — |
| `responsable_cargo` | `text` | **NOT NULL** | — |
| `responsable_email` | `text` | **NOT NULL** | — |
| `responsable_telefono` | `text` | NULL | — |
| `web` | `text` | NULL | — |
| `email_oficial` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `verificado_solicitado` | `boolean` | NULL | `false` |
| `mostrar_contacto` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_festival`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `nombre_festival` | `text` | **NOT NULL** | — |
| `nombre_comercial` | `text` | NULL | — |
| `anio_fundacion` | `integer` | NULL | — |
| `direccion` | `text` | NULL | — |
| `codigo_postal` | `text` | NULL | — |
| `logo` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `historia` | `text` | NULL | — |
| `entidad_organizadora` | `text` | **NOT NULL** | — |
| `naturaleza_juridica` | `text` | NULL | — |
| `tipo_clasico` | `boolean` | NULL | `false` |
| `tipo_contemporaneo` | `boolean` | NULL | `false` |
| `tipo_musical` | `boolean` | NULL | `false` |
| `tipo_infantil` | `boolean` | NULL | `false` |
| `tipo_experimental` | `boolean` | NULL | `false` |
| `tipo_multidisciplinar` | `boolean` | NULL | `false` |
| `periodicidad` | `text` | NULL | — |
| `num_asistentes` | `integer` | NULL | — |
| `num_companias` | `integer` | NULL | — |
| `publica_convocatorias` | `boolean` | NULL | `false` |
| `acepta_postulaciones` | `boolean` | NULL | `false` |
| `ofrece_residencias` | `boolean` | NULL | `false` |
| `concede_premios` | `boolean` | NULL | `false` |
| `usa_ticketing_obrasdeteatro` | `boolean` | NULL | `false` |
| `url_ticketing_externo` | `text` | NULL | — |
| `responsable_nombre` | `text` | **NOT NULL** | — |
| `responsable_cargo` | `text` | **NOT NULL** | — |
| `responsable_email` | `text` | **NOT NULL** | — |
| `responsable_telefono` | `text` | NULL | — |
| `web` | `text` | NULL | — |
| `email_oficial` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `verificado_solicitado` | `boolean` | NULL | `false` |
| `mostrar_contacto` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `perfil_escuela`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `nombre_escuela` | `text` | **NOT NULL** | — |
| `nombre_comercial` | `text` | NULL | — |
| `anio_fundacion` | `integer` | NULL | — |
| `direccion` | `text` | NULL | — |
| `codigo_postal` | `text` | NULL | — |
| `logo` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `historia` | `text` | NULL | — |
| `entidad_responsable` | `text` | NULL | — |
| `naturaleza_juridica` | `text` | NULL | — |
| `form_interpretacion` | `boolean` | NULL | `false` |
| `form_direccion` | `boolean` | NULL | `false` |
| `form_dramaturgia` | `boolean` | NULL | `false` |
| `form_musical` | `boolean` | NULL | `false` |
| `form_danza` | `boolean` | NULL | `false` |
| `form_voz` | `boolean` | NULL | `false` |
| `form_improvisacion` | `boolean` | NULL | `false` |
| `form_produccion` | `boolean` | NULL | `false` |
| `form_gestion_cultural` | `boolean` | NULL | `false` |
| `num_estudiantes` | `integer` | NULL | — |
| `perfil_estudiantes` | `text` | NULL | — |
| `ofrece_becas` | `boolean` | NULL | `false` |
| `ofrece_ayudas` | `boolean` | NULL | `false` |
| `ofrece_residencias` | `boolean` | NULL | `false` |
| `ofrece_practicas` | `boolean` | NULL | `false` |
| `descripcion_becas` | `text` | NULL | — |
| `responsable_nombre` | `text` | **NOT NULL** | — |
| `responsable_cargo` | `text` | **NOT NULL** | — |
| `responsable_email` | `text` | **NOT NULL** | — |
| `responsable_telefono` | `text` | NULL | — |
| `web` | `text` | NULL | — |
| `email_oficial` | `text` | NULL | — |
| `telefono` | `text` | NULL | — |
| `whatsapp` | `text` | NULL | — |
| `instagram` | `text` | NULL | — |
| `facebook` | `text` | NULL | — |
| `tiktok` | `text` | NULL | — |
| `linkedin` | `text` | NULL | — |
| `youtube` | `text` | NULL | — |
| `verificado_solicitado` | `boolean` | NULL | `false` |
| `mostrar_contacto` | `boolean` | NULL | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

---

### Perfil extendido (currículum y actividad social)

#### `profile_specialties`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `specialty` | `text` | **NOT NULL** | — |
| `is_primary` | `boolean` | **NOT NULL** | `false` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `professional_experience`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `tipo` | `text` | **NOT NULL** | — |
| `titulo` | `text` | **NOT NULL** | — |
| `organizacion` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `fecha_inicio` | `date` | NULL | — |
| `fecha_fin` | `date` | NULL | — |
| `en_curso` | `boolean` | **NOT NULL** | `false` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `profile_awards`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `nombre` | `text` | **NOT NULL** | — |
| `entidad` | `text` | NULL | — |
| `anio` | `integer` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `profile_training`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `titulo` | `text` | **NOT NULL** | — |
| `institucion` | `text` | NULL | — |
| `fecha_inicio` | `date` | NULL | — |
| `fecha_fin` | `date` | NULL | — |
| `en_curso` | `boolean` | **NOT NULL** | `false` |
| `descripcion` | `text` | NULL | — |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `profile_gallery`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `tipo` | `text` | **NOT NULL** | — |
| `url` | `text` | **NOT NULL** | — |
| `titulo` | `text` | NULL | — |
| `descripcion` | `text` | NULL | — |
| `posicion` | `smallint` | **NOT NULL** | `0` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `profile_availability`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `estado` | `text` | **NOT NULL** | `'abierto_a_propuestas'::text` |
| `alcance` | `text` | **NOT NULL** | `'nacional'::text` |
| `nota` | `text` | NULL | — |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `profile_follows`

**RLS:** ✅ habilitado · **Filas:** 1 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `follower_id` | `uuid` | **NOT NULL** | — |
| `following_id` | `uuid` | **NOT NULL** | — |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

---

### Castings

#### `castings`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL** | — |
| `titulo` | `text` | **NOT NULL** | — |
| `nombre_proyecto` | `text` | **NOT NULL** | — |
| `entidad_organizadora` | `text` | **NOT NULL** | — |
| `tipo_entidad` | `text` | NULL | — |
| `descripcion` | `text` | **NOT NULL** | — |
| `sinopsis` | `text` | NULL | — |
| `tipo_otro` | `text` | NULL | — |
| `perfil_nombre` | `text` | **NOT NULL** | — |
| `perfil_descripcion` | `text` | **NOT NULL** | — |
| `edad_min` | `integer` | NULL | — |
| `edad_max` | `integer` | NULL | — |
| `genero_escenico` | `text` | NULL | — |
| `idiomas_requeridos` | `text[]` | NULL | — |
| `experiencia_requerida` | `text` | NULL | — |
| `formacion_requerida` | `text` | NULL | — |
| `habilidades_especiales` | `text` | NULL | — |
| `importe` | `text` | NULL | — |
| `fechas_previstas` | `text` | NULL | — |
| `lugar_trabajo` | `text` | NULL | — |
| `pais` | `text` | NULL | — |
| `ciudad` | `text` | NULL | — |
| `fecha_apertura` | `date` | **NOT NULL** | — |
| `fecha_cierre` | `date` | **NOT NULL** | — |
| `modalidad` | `text` | NULL | — |
| `descripcion_proceso` | `text` | NULL | — |
| `forma_candidatura` | `text` | NULL | — |
| `email_recepcion` | `text` | NULL | — |
| `url_externa` | `text` | NULL | — |
| `estado` | `text` | **NOT NULL** | `'borrador'::text` |
| `publicado` | `boolean` | NULL | `false` |
| `destacado` | `boolean` | NULL | `false` |
| `scenaia_activo` | `boolean` | NULL | `false` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `motivo_rechazo` | `text` | NULL | — |
| `motivo_filtro` | `text` | NULL | — |
| `tipo_remuneracion` | `text` | **NOT NULL** | — |
| `categorias` | `text[]` | **NOT NULL** | `'{}'::text[]` |
| `telefono_contacto` | `text` | NULL | — |

#### `casting_applications`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `casting_id` | `uuid` | **NOT NULL** | — |
| `applicant_id` | `uuid` | **NOT NULL** | — |
| `cover_letter` | `text` | NULL | — |
| `portfolio_url` | `text` | NULL | — |
| `status` | `text` | NULL | `'pending'::text` |
| `applied_at` | `timestamp with time zone` | NULL | `now()` |
| `notes` | `text` | NULL | — |
| `reviewed_at` | `timestamp with time zone` | NULL | — |
| `reviewer_id` | `uuid` | NULL | — |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `casting_categorias`

**RLS:** ✅ habilitado · **Filas:** 10 · **PK:** `id` · 🆕 *no documentada en v1.2*

> Vocabulario de categorias de casting. Ampliable por moderacion sin migraciones; el formulario lo lee de aqui.

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `text` | **NOT NULL** | — |
| `etiqueta` | `text` | **NOT NULL** | — |
| `orden` | `integer` | **NOT NULL** | `0` |
| `activo` | `boolean` | **NOT NULL** | `true` |

---

### Suscripciones / Stripe y consumo

#### `subscriptions`

**RLS:** ✅ habilitado · **Filas:** 1 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `stripe_subscription_id` | `text` | NULL | — |
| `stripe_price_id` | `text` | NULL | — |
| `plan` | `text` | **NOT NULL** | — |
| `status` | `text` | **NOT NULL** | — |
| `current_period_start` | `timestamp with time zone` | NULL | — |
| `current_period_end` | `timestamp with time zone` | NULL | — |
| `cancel_at_period_end` | `boolean` | NULL | `false` |
| `created_at` | `timestamp with time zone` | NULL | `now()` |
| `updated_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `stripe_customer_id` | `text` | NULL | — |

#### `credit_reservations`

**RLS:** ✅ habilitado · **Filas:** 84 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `request_id` | `uuid` | NULL | — |
| `status` | `text` | **NOT NULL** | `'active'::text` |
| `estimated_cost` | `numeric` | **NOT NULL** | — |
| `settled_cost` | `numeric` | NULL | — |
| `authorized_limit_snapshot` | `numeric` | NULL | — |
| `expires_at` | `timestamp with time zone` | **NOT NULL** | — |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `settled_at` | `timestamp with time zone` | NULL | — |

---

### Contenido / Works

#### `works`

**RLS:** ✅ habilitado · **Filas:** 11 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | NULL | — |
| `title` | `text` | **NOT NULL** | — |
| `synopsis` | `text` | NULL | — |
| `genre` | `text` | NULL | — |
| `duration_minutes` | `integer` | NULL | — |
| `min_age` | `integer` | NULL | — |
| `cast_size_min` | `integer` | NULL | — |
| `cast_size_max` | `integer` | NULL | — |
| `language` | `text` | NULL | `'es'::text` |
| `is_published` | `boolean` | NULL | `false` |
| `is_featured` | `boolean` | NULL | `false` |
| `view_count` | `integer` | NULL | `0` |
| `created_at` | `timestamp with time zone` | NULL | `now()` |
| `updated_at` | `timestamp with time zone` | NULL | `now()` |
| `slug` | `text` | NULL | — |
| `deleted_at` | `timestamp with time zone` | NULL | — |
| `author` | `text` | NULL | — |
| `institution_id` | `uuid` | NULL | — |
| `subtitle` | `text` | NULL | — |
| `synopsis_short` | `text` | NULL | — |
| `synopsis_full` | `text` | NULL | — |
| `secondary_genres` | `text[]` | NULL | `'{}'::text[]` |
| `country_code` | `text` | NULL | — |
| `year` | `integer` | NULL | — |
| `rights_status` | `text` | NULL | — |
| `access_type` | `text` | NULL | `'private'::text` |
| `rights_manager` | `text` | NULL | — |
| `cover_image_url` | `text` | NULL | — |
| `source_name` | `text` | NULL | — |
| `source_url` | `text` | NULL | — |
| `is_library_work` | `boolean` | **NOT NULL** | `false` |

#### `work_files`

**RLS:** ✅ habilitado · **Filas:** 11 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `work_id` | `uuid` | **NOT NULL** | — |
| `file_type` | `text` | **NOT NULL** | — |
| `file_url` | `text` | **NOT NULL** | — |
| `file_name` | `text` | NULL | — |
| `file_size` | `integer` | NULL | — |
| `is_public` | `boolean` | NULL | `false` |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

#### `work_rights_requests`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `work_id` | `uuid` | **NOT NULL** | — |
| `requester_id` | `uuid` | **NOT NULL** | — |
| `status` | `text` | NULL | `'pending'::text` |
| `message` | `text` | NULL | — |
| `response_message` | `text` | NULL | — |
| `requested_at` | `timestamp with time zone` | NULL | `now()` |
| `responded_at` | `timestamp with time zone` | NULL | — |

#### `institutions`

**RLS:** ✅ habilitado · **Filas:** 1 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `name` | `text` | **NOT NULL** | — |
| `slug` | `text` | **NOT NULL** | — |
| `type` | `text` | **NOT NULL** | — |
| `country_code` | `text` | NULL | — |
| `website` | `text` | NULL | — |
| `is_public` | `boolean` | **NOT NULL** | `true` |
| `is_active` | `boolean` | **NOT NULL** | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `region` | `text` | NULL | — |
| `ciudad` | `text` | NULL | — |

---

### Convocatorias, eventos y ticketing

#### `calls`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `title` | `text` | **NOT NULL** | — |
| `description` | `text` | NULL | — |
| `call_type` | `text` | NULL | — |
| `location` | `text` | NULL | — |
| `deadline` | `timestamp with time zone` | NULL | — |
| `prize_amount` | `numeric` | NULL | — |
| `is_published` | `boolean` | NULL | `false` |
| `is_featured` | `boolean` | NULL | `false` |
| `view_count` | `integer` | NULL | `0` |
| `created_at` | `timestamp with time zone` | NULL | `now()` |
| `updated_at` | `timestamp with time zone` | NULL | `now()` |
| `slug` | `text` | NULL | — |
| `deleted_at` | `timestamp with time zone` | NULL | — |

#### `events`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `title` | `text` | **NOT NULL** | — |
| `description` | `text` | NULL | — |
| `venue` | `text` | NULL | — |
| `location` | `text` | NULL | — |
| `event_date` | `timestamp with time zone` | NULL | — |
| `event_end_date` | `timestamp with time zone` | NULL | — |
| `ticket_url` | `text` | NULL | — |
| `price_from` | `numeric` | NULL | — |
| `is_free` | `boolean` | NULL | `false` |
| `is_published` | `boolean` | NULL | `false` |
| `is_featured` | `boolean` | NULL | `false` |
| `view_count` | `integer` | NULL | `0` |
| `created_at` | `timestamp with time zone` | NULL | `now()` |
| `updated_at` | `timestamp with time zone` | NULL | `now()` |
| `deleted_at` | `timestamp with time zone` | NULL | — |

#### `tickets`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `event_id` | `uuid` | **NOT NULL** | — |
| `ticket_type` | `text` | **NOT NULL** | — |
| `price` | `numeric` | **NOT NULL** | `0` |
| `total_quantity` | `integer` | NULL | — |
| `available_quantity` | `integer` | NULL | — |
| `sale_start` | `timestamp with time zone` | NULL | — |
| `sale_end` | `timestamp with time zone` | NULL | — |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

#### `ticket_orders`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `ticket_id` | `uuid` | **NOT NULL** | — |
| `buyer_id` | `uuid` | **NOT NULL** | — |
| `quantity` | `integer` | **NOT NULL** | `1` |
| `total_amount` | `numeric` | **NOT NULL** | — |
| `status` | `text` | NULL | `'pending'::text` |
| `stripe_payment_intent_id` | `text` | NULL | — |
| `purchased_at` | `timestamp with time zone` | NULL | `now()` |

---

### Mensajería y notificaciones

#### `conversations`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `participant_1` | `uuid` | **NOT NULL** | — |
| `participant_2` | `uuid` | **NOT NULL** | — |
| `last_message_at` | `timestamp with time zone` | NULL | — |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

#### `messages`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `conversation_id` | `uuid` | **NOT NULL** | — |
| `sender_id` | `uuid` | **NOT NULL** | — |
| `content` | `text` | **NOT NULL** | — |
| `is_read` | `boolean` | NULL | `false` |
| `sent_at` | `timestamp with time zone` | NULL | `now()` |

#### `notifications`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `type` | `text` | **NOT NULL** | — |
| `title` | `text` | **NOT NULL** | — |
| `body` | `text` | NULL | — |
| `is_read` | `boolean` | NULL | `false` |
| `related_url` | `text` | NULL | — |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

---

### Moderación

#### `reports`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `reporter_id` | `uuid` | **NOT NULL** | — |
| `reported_profile_id` | `uuid` | NULL | — |
| `reported_work_id` | `uuid` | NULL | — |
| `reason` | `text` | **NOT NULL** | — |
| `description` | `text` | NULL | — |
| `status` | `text` | NULL | `'open'::text` |
| `created_at` | `timestamp with time zone` | NULL | `now()` |
| `resolved_at` | `timestamp with time zone` | NULL | — |

#### `verification_requests`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `document_url` | `text` | NULL | — |
| `notes` | `text` | NULL | — |
| `status` | `text` | NULL | `'pending'::text` |
| `reviewed_by` | `uuid` | NULL | — |
| `submitted_at` | `timestamp with time zone` | NULL | `now()` |
| `reviewed_at` | `timestamp with time zone` | NULL | — |

#### `moderacion_reglas`

**RLS:** ✅ habilitado · **Filas:** 5 · **PK:** `id` · 🆕 *no documentada en v1.2*

> Reglas del filtro automatico de castings. Editable por moderacion sin migraciones.

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `patron` | `text` | **NOT NULL** | — |
| `tipo` | `text` | **NOT NULL** | `'palabra'::text` |
| `motivo` | `text` | NULL | — |
| `activo` | `boolean` | **NOT NULL** | `true` |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `casting_reportes`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id` · 🆕 *no documentada en v1.2*

> Reportes de usuarios sobre castings publicados. Nunca cambian el estado del casting por si solos: los resuelve moderacion.

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `gen_random_uuid()` |
| `casting_id` | `uuid` | **NOT NULL** | — |
| `reporter_id` | `uuid` | **NOT NULL** | — |
| `motivo` | `text` | **NOT NULL** | — |
| `estado` | `text` | **NOT NULL** | `'pendiente'::text` |
| `revisado_por` | `uuid` | NULL | — |
| `revisado_en` | `timestamp with time zone` | NULL | — |
| `created_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

---

### Telemetría / Admin

#### `telemetry_metrics`

**RLS:** ✅ habilitado · **Filas:** 168 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | NULL | — |
| `metric_name` | `text` | **NOT NULL** | — |
| `metric_value` | `double precision` | **NOT NULL** | — |
| `metric_unit` | `text` | NULL | — |
| `tags` | `jsonb` | NULL | — |
| `recorded_at` | `timestamp with time zone` | **NOT NULL** | `now()` |

#### `nucleo_activity_log`

**RLS:** ✅ habilitado · **Filas:** 16 · **PK:** `id` · 🆕 *no documentada en v1.2*

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | NULL | — |
| `response_type` | `text` | **NOT NULL** | — |
| `occurred_at` | `timestamp with time zone` | **NOT NULL** | `now()` |
| `processed_at` | `timestamp with time zone` | NULL | — |

#### `audit_logs`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | NULL | — |
| `action` | `text` | **NOT NULL** | — |
| `table_name` | `text` | NULL | — |
| `record_id` | `uuid` | NULL | — |
| `old_data` | `jsonb` | NULL | — |
| `new_data` | `jsonb` | NULL | — |
| `ip_address` | `text` | NULL | — |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

#### `ai_requests`

**RLS:** ✅ habilitado · **Filas:** 0 · **PK:** `id`

| Columna | Tipo | Nulabilidad | Default |
|---|---|---|---|
| `id` | `uuid` | **NOT NULL** | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | **NOT NULL** | — |
| `request_type` | `text` | **NOT NULL** | — |
| `prompt` | `text` | NULL | — |
| `response` | `text` | NULL | — |
| `tokens_used` | `integer` | NULL | — |
| `created_at` | `timestamp with time zone` | NULL | `now()` |

---

## 4. Divergencias respecto a `ARQUITECTURA_BD_SUPABASE_v1.2`

Comparación contra el documento de diseño `docs/arquitectura/ARQUITECTURA_BD_SUPABASE_v1.2.docx`
(v1.2 · Junio 2026), cuya sección 1 «Visión general» enumera **19 tablas**.

**La base de datos real tiene 41 tablas: las 19 previstas siguen todas existiendo, y hay 22 tablas
adicionales que el documento no recoge.** Ninguna tabla del diseño ha desaparecido.

### 4.1 Las 19 tablas de v1.2 — todas presentes

`profiles` · `profile_roles` · `subscriptions` · `works` · `work_files` · `work_rights_requests` ·
`castings` · `casting_applications` · `calls` · `events` · `tickets` · `ticket_orders` ·
`conversations` · `messages` · `reports` · `verification_requests` · `ai_requests` ·
`notifications` · `audit_logs`

Existen todas, con RLS habilitado. Su **estructura de columnas sí ha divergido** en varios casos
(ver 4.3), de forma que el nombre coincide pero el contrato no.

### 4.2 Las 22 tablas nuevas, no documentadas en v1.2

La columna «Origen» indica la migración que creó la tabla, localizada en `supabase/migrations/`.
El propósito es **inferido** a partir de las columnas reales, del comentario en BD cuando existe,
y del nombre de la migración — salvo en las tres tablas que llevan comentario propio en la base de
datos, donde el propósito está documentado por el propio esquema.

#### Bloque A — Perfiles especializados por rol (8 tablas)

| Tabla | Origen | Propósito inferido |
|---|---|---|
| `perfil_actor` | `20260708000000_baseline_schema` | Ficha profesional del intérprete: físico (`altura`, `genero`), `idiomas[]`/`acentos[]`, 9 flags `habilidad_*` (canto, danza, esgrima, circo…), 7 flags `disp_*` de disponibilidad (castings, cine, giras, internacional) y bloque de contacto con 3 flags `mostrar_*`. |
| `perfil_director` | ídem | Análogo para dirección: 9 flags `esp_*` (clásico, ópera, zarzuela, comunitario…) y 6 `disp_*`. |
| `perfil_dramaturgo` | ídem | Autoría: 9 flags `esp_*` de género dramático, contadores `total_obras_escritas/estrenadas/publicadas` y 5 flags `acepta_*` que modelan **qué cesiones de derechos admite** (representación, licenciamiento, editorial, traducción, adaptación audiovisual). |
| `perfil_compania` | ídem | Entidad: fiscalidad (`nif_cif`), identidad (`mision`, `vision`, `valores`), 8 flags `tipo_*`, 5 `serv_*` y responsable de contacto. |
| `perfil_productora` | ídem | Entidad productora: 9 flags `tipo_*` (audiovisual, distribución, coproducciones internacionales…). Responsable **obligatorio** (`responsable_nombre/cargo/email` NOT NULL). |
| `perfil_teatro` | ídem | Espacio físico: `capacidad_total`, `num_salas`, `tipo_escenario`, 3 flags de accesibilidad (PMR, ascensor, bucle magnético), `descripcion_tecnica`, alquiler/ensayos y **decisión de ticketing** (`usa_ticketing_obrasdeteatro` vs `url_ticketing_externo`). |
| `perfil_festival` | ídem | Festival: `periodicidad`, `num_asistentes`, `num_companias`, y flags de actividad (`publica_convocatorias`, `acepta_postulaciones`, `ofrece_residencias`, `concede_premios`) + misma decisión de ticketing. |
| `perfil_escuela` | ídem | Centro formativo: 9 flags `form_*` por disciplina, `num_estudiantes`, `perfil_estudiantes` y 4 flags `ofrece_*` (becas, ayudas, residencias, prácticas). |

**Lectura de conjunto.** v1.2 resolvía la multiplicidad de rol únicamente con `profile_roles`
(una fila por rol). La implementación real añadió, por encima de eso, **una tabla satélite por rol**
enlazada por `user_id`, con la ficha profesional específica. Es una decisión de modelado de calado
que el documento de diseño no contempla: `profile_roles` dice *qué eres*, `perfil_*` dice *cómo eres
en ese rol*.

> **Observación.** Las 8 tablas están a **0 filas** frente a 38 registros en `profiles`. El esquema está
> desplegado pero ningún perfil especializado se ha rellenado todavía. Conviene confirmar si los
> formularios de alta escriben realmente en estas tablas o si el dato está quedándose en `profiles`.

#### Bloque B — Perfil extendido: currículum y actividad social (7 tablas)

| Tabla | Origen | Propósito inferido |
|---|---|---|
| `profile_specialties` | esquema de perfiles profesionales (PP2) | Especialidades normalizadas por perfil, con `is_primary` para marcar la principal. |
| `professional_experience` | ídem | Historial profesional: `tipo`, `titulo`, `organizacion`, rango `fecha_inicio`/`fecha_fin` y flag `en_curso`. |
| `profile_awards` | ídem | Premios y reconocimientos (`nombre`, `entidad`, `anio`). |
| `profile_training` | ídem | Formación académica, con `institucion` y flag `en_curso`. |
| `profile_gallery` | ídem | Galería multimedia ordenable (`tipo`, `url`, `posicion`). |
| `profile_availability` | ídem | Estado declarado de disponibilidad: `estado` (def. `abierto_a_propuestas`) y `alcance` (def. `nacional`). |
| `profile_follows` | `20260710000001_profile_follows` | Grafo social: `follower_id` → `following_id`. |

Este bloque normaliza en tablas 1:N lo que en las tablas `perfil_*` vive como campos de texto libre
(`experiencia`, `formacion`, `premios`). **Son dos representaciones del mismo dato conviviendo**, y el
documento de diseño no arbitra entre ellas. Merece una decisión explícita sobre cuál es la fuente de
verdad antes de que ambas acumulen datos.

#### Bloque C — Contabilidad, núcleo y telemetría (3 tablas)

| Tabla | Origen | Propósito inferido |
|---|---|---|
| `credit_reservations` | `20260716000000_accounting_engine_credit_reservations` | **Motor de reserva de crédito en dos fases** para consumo de IA: se reserva `estimated_cost` con `expires_at`, y al liquidar se escribe `settled_cost`/`settled_at`. `authorized_limit_snapshot` congela el límite vigente en el momento de reservar. Patrón *authorize / capture*. **84 filas: está en uso real.** |
| `nucleo_activity_log` | `20260717000000_nucleo_activity_log` | Registro de actividad del núcleo: `response_type`, `occurred_at` y `processed_at` — el par sugiere una **cola de procesamiento diferido** (fila pendiente mientras `processed_at` es NULL). 16 filas. |
| `telemetry_metrics` | `20260718000000_telemetry_metrics` | Métricas genéricas: `metric_name`, `metric_value` (float), `metric_unit` y `tags` jsonb. Formato clave/valor con dimensiones libres. **168 filas: el módulo más activo de la plataforma.** |

v1.2 solo preveía `ai_requests` (prompt/response/tokens) para ScenaIA. La realidad lo ha superado:
existe un **subsistema económico y de observabilidad completo** que el diseño no describe — y que,
además, es el único con volumen de datos significativo, mientras `ai_requests` sigue a 0 filas.

#### Bloque D — Moderación de castings (3 tablas)

Las únicas tres tablas de todo el esquema con **comentario propio en la base de datos**, transcrito literalmente:

| Tabla | Origen | Comentario en BD |
|---|---|---|
| `moderacion_reglas` | `20260911221521_castings_publicacion_automatica_filtro_y_reportes` | *«Reglas del filtro automatico de castings. Editable por moderacion sin migraciones.»* |
| `casting_reportes` | ídem | *«Reportes de usuarios sobre castings publicados. Nunca cambian el estado del casting por si solos: los resuelve moderacion.»* |
| `casting_categorias` | `20260912123437_castings_remuneracion_categorias_y_telefono` | *«Vocabulario de categorias de casting. Ampliable por moderacion sin migraciones; el formulario lo lee de aqui.»* |

Aquí no hay inferencia: el esquema documenta su propia intención. Dos de los tres comentarios expresan
la misma regla de diseño — **moderación opera sin desplegar código** — y el tercero fija una garantía de
seguridad: un reporte de usuario nunca despublica por sí solo.

`casting_categorias` es además la única tabla del esquema cuya PK **no es `uuid` sino `text`**
(el slug de categoría es la clave). 10 categorías y 5 reglas de filtro ya cargadas como semilla.

#### Bloque E — Institucional (1 tabla)

| Tabla | Origen | Propósito inferido |
|---|---|---|
| `institutions` | `20260708000000_baseline_schema` (+ `organizaciones_tipo_y_ubicacion`) | Entidades como titulares de contenido, independientes de un perfil de usuario. Enlaza con `works.institution_id`. Habilita el modelo de **doble titularidad** de obra: una obra pertenece a un perfil *o* a una institución. |

### 4.3 Divergencias de columna en tablas que sí estaban documentadas

Más relevantes que las tablas nuevas, porque aquí el nombre coincide con v1.2 y el contrato no.
Cualquier código escrito contra el documento de diseño fallará en estos puntos.

#### `profiles` — reescrita casi por completo

| v1.2 | Realidad | Impacto |
|---|---|---|
| `id` + `user_id` → `auth.users` UNIQUE | **Solo `id`**, `uuid` NOT NULL **sin default** | El PK *es* el id de `auth.users`. **La columna `user_id` no existe.** Toda consulta de v1.2 que filtre por `user_id` está rota. |
| `username` UNIQUE NOT NULL | **No existe** | — |
| `full_name` NOT NULL | `nombre` NOT NULL + `apellidos` + `nombre_artistico` | Nomenclatura en español y nombre descompuesto en tres campos. |
| `slug` UNIQUE **NOT NULL** | `slug` **NULL** | La restricción se relajó: hay perfiles sin slug. |
| `is_verified` | `verificado` | Renombrada. |
| `website` | `website_url` | Renombrada. |
| `location` (texto único) | `pais` (def. `'España'`), `ciudad`, `region`, `postal_code`, `country_code` | Geolocalización estructurada en 5 campos. |
| `plan` `text` def. `'free'` | `plan` **enum `plan_suscripcion`** def. `'gratuito'` | Cambio de tipo *y* de valor por defecto. Un `INSERT` con `'free'` falla. |
| `stripe_customer_id` UNIQUE | **No está en `profiles`** — vive en `subscriptions` | Movida de tabla. |

Además, `profiles` incorpora **19 columnas que v1.2 no contempla**, agrupables en cuatro bloques:

- **Consentimientos RGPD:** `acepta_terminos`, `acepta_privacidad`, `mayor_de_edad`, `info_veraz`, `marketing_general`, `marketing_comercial` (todas NOT NULL def. `false`).
- **Ciclo de vida de identidad:** `welcome_email_sent_at`, `extincion_solicitada_at`, `identidad_extinguida_at` — implementan un borrado en dos tiempos (solicitud → extinción) distinto del `deleted_at` genérico, que también sigue existiendo.
- **ScenaIA por perfil:** `scenaia_analisis`, `scenaia_recomendaciones` (opt-in por usuario).
- **Resto:** `tipo_perfil` (enum), `email`, `idioma`, `activo`, `perfil_publico`, `cover_url`, `phone`, `social_links` (jsonb).

#### `profile_roles`

v1.2 define `is_primary boolean DEFAULT false` («indica el rol principal del perfil»).
**Esa columna no existe en la realidad.** La tabla tiene solo `id`, `profile_id`, `role`, `created_at`,
de modo que **no hay forma de saber cuál es el rol principal de un perfil**. Si el producto lo necesita,
está sin implementar. Nótese que el concepto reaparece, desplazado, en `profile_specialties.is_primary`.

#### `works`

| v1.2 | Realidad |
|---|---|
| `profile_id` **NOT NULL** | `profile_id` **NULL** — necesario para la doble titularidad vía `institution_id` |
| `rights_type` (`public_domain`/`copyrighted`/`licensed`) + `rights_holder` | `rights_status` + `rights_manager` — **ambas renombradas** |
| `slug` UNIQUE NOT NULL | `slug` NULL |

Y 13 columnas añadidas no previstas: `institution_id`, `is_library_work` (NOT NULL def. `false`),
`access_type` (def. `'private'`), `source_name`, `source_url`, `author`, `subtitle`, `synopsis_short`,
`synopsis_full`, `secondary_genres[]`, `country_code`, `year`, `cover_image_url`.
En conjunto describen una **biblioteca de obras de fondo con procedencia externa** — un caso de uso
ausente del diseño original. Coherente con las 11 filas existentes.

#### `castings`

La tabla más alejada de v1.2. El documento fija la convención *«código en inglés, comentarios en
español»*; `castings` está **íntegramente en español** (`titulo`, `descripcion`, `fecha_apertura`,
`fecha_cierre`, `estado`, `publicado`, `destacado`…), al igual que las tablas `perfil_*` y el bloque
de moderación. **La convención de nomenclatura del diseño no se ha sostenido** en la mitad del esquema.

Sobre esa base, incorpora todo un ciclo de moderación que v1.2 no describe: `estado` (def. `'borrador'`),
`motivo_rechazo`, `motivo_filtro` (traza del filtro automático), `scenaia_activo`,
`tipo_remuneracion` NOT NULL, `categorias text[]` NOT NULL def. `'{}'` (apunta a `casting_categorias`),
`telefono_contacto`, `email_recepcion`, `url_externa`, `forma_candidatura` y `modalidad`.

### 4.4 Síntesis

1. **El diseño no se ha contradicho, se ha quedado corto.** Las 19 tablas siguen ahí; el esquema real es 2,2 veces mayor.
2. **Tres subsistemas completos nacieron después de v1.2** y no están documentados en ninguna parte salvo el propio código: perfiles especializados por rol, contabilidad de créditos + telemetría, y moderación de castings.
3. **El riesgo no son las tablas nuevas, son las columnas renombradas.** `profiles.user_id`, `profile_roles.is_primary`, `works.rights_type`/`rights_holder` y `plan = 'free'` son referencias que el documento de diseño avala y que la base de datos rechaza.
4. **Dos convenciones de nomenclatura conviven** (inglés en el bloque original, español en todo lo posterior) sin regla que las separe.
5. **Duplicidad de modelado pendiente de arbitrar:** currículum como texto libre en `perfil_*` frente a tablas normalizadas `profile_*`.
6. **El esquema está muy por delante del uso.** 30 de 41 tablas vacías; mensajería, ticketing, eventos, convocatorias y verificación no tienen ni una fila. Lo único con volumen es telemetría y contabilidad.

---

## 5. Estado de migraciones

**50 migraciones aplicadas** en remoto. La última es `20260916082039_rls_perfiles_publicos_excluye_extincion`.

### 5.1 Migraciones locales sin aplicar

La rama local `feat/convocatorias-fase1-bd` contiene **tres migraciones sin registrar en remoto**,
las tres sin seguimiento en git (`git status` las marca como `??`):

| Fichero | Efecto |
|---|---|
| `20260916132140_convocatorias_vocabulario_y_ciclo_de_vida.sql` | `alter table public.calls` — añade `estado` (def. `'borrador'`), `moderacion_entrada_at` y otras |
| `20260916132241_convocatorias_cupo_moderacion_y_destacado.sql` | `alter table public.calls` — añade `fecha_publicacion` |
| `20260916132342_convocatorias_rls_indices_y_cierre.sql` | RLS, índices y cierre del ciclo |

**Confirmado contra el esquema real:** `calls` tiene hoy 15 columnas y **ninguna** es `estado`,
`moderacion_entrada_at` ni `fecha_publicacion`. Las tres migraciones están efectivamente pendientes.
Su objetivo es trasladar a `calls` (convocatorias) el mismo ciclo de moderación que `castings` ya tiene.

### 5.2 Desalineación entre historial local y remoto

El directorio local `supabase/migrations/` contiene **34 ficheros** frente a **50 migraciones
registradas en remoto**, y los identificadores de versión no coinciden para la misma migración.
Ejemplo: el motor de contabilidad es `20260716000000_accounting_engine_credit_reservations.sql`
en local y consta como versión `20260727142403` en remoto.

Esto significa que **el historial local no reconstruye el estado remoto**. Un `db reset` o un
despliegue desde cero a partir de esta carpeta no produciría la base de datos que hay en producción.
Es un hallazgo de esta lectura, no un problema introducido por ella; no se ha intentado corregir.

---

## Anexo — Procedencia de los datos

| Dato | Origen |
|---|---|
| Estado, región, versión de Postgres | `Supabase:get_project` (`pnsirwtiiurczjwrayza`) |
| Tablas, columnas, tipos, defaults, PK, RLS, filas, comentarios | `Supabase:list_tables` (`schemas: ["public"]`, `verbose: true`) |
| Historial de migraciones aplicadas | `Supabase:list_migrations` |
| Migraciones pendientes y ficheros locales | Lectura del directorio `supabase/migrations/` en la rama `feat/convocatorias-fase1-bd` |
| Documento de diseño de contraste | `docs/arquitectura/ARQUITECTURA_BD_SUPABASE_v1.2.docx`, sección 1 |

Las secciones 1–3 son transcripción mecánica de la respuesta MCP, generada por script sin intervención
manual. Las secciones 4 y 5 contienen análisis e inferencia, señalados como tales en el texto.

**Ninguna operación de escritura, DDL ni migración se ejecutó contra la base de datos.**
