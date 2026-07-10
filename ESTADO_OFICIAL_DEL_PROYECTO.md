# ESTADO OFICIAL DEL PROYECTO
## ObrasDeTeatro® — Auditoría Maestra

---

## ÚLTIMA ACTUALIZACIÓN — 2026-07-10

### Sprint PP2-B — Editor Profesional — CERRADO Y CONGELADO

| Sprint | Estado | Commit | Fecha |
|--------|--------|--------|-------|
| PP2-A — Arquitectura de datos Perfiles 2.0 | ✅ CERRADO Y CONGELADO | `c43371d` | 2026-07-09 |
| PP2-B — Editor Profesional modular (5 editores) | ✅ **CERRADO Y CONGELADO** | `46b701d` | 2026-07-10 |
| fix(a11y) — contraste panel perfil WCAG AA+ | ✅ CERRADO | `de4bf3f` | 2026-07-10 |
| UX-001A — estado Próximamente sin opacity | ✅ CERRADO | `f7e3700` | 2026-07-10 |

**PP2-B — Alcance implementado:**
- B2 Formación y Premios — `profile_training` + `profile_awards`
- B3 Especialidades — `profile_specialties` (gate: 3 gratuito / ilimitado premium)
- B4 Experiencia Profesional — `professional_experience` (gate: 5 gratuito / ilimitado premium)
- B6 Redes y Contacto — `profiles.website_url` + `profiles.social_links` JSONB
- B7 Disponibilidad — `profile_availability` (1-to-1 con upsert)

**PP2-B — Restricciones permanentes:**
El Editor Profesional está congelado. No modificar tipografía, colores, espaciados, estructura, componentes, responsive, lógica de negocio ni gate por plan sin incidencia autorizada expresamente.

**Auditoría visual:** APROBADA — 2026-07-10
**develop HEAD:** `f7e3700` — branch limpio, build limpio, TypeScript 0 errores
**Vercel preview:** `obrasdeteatro-k5uyrth20-obrasdeteatro-s-projects.vercel.app` READY
**Próximo sprint:** PP2-C (Perfil Público) — PENDIENTE DE AUTORIZACIÓN EXPRESA

---

**Fecha auditoría original:** 2026-06-29
**Auditoría realizada por:** Claude Sonnet 4.6
**Sprint de referencia:** OA-1.3 (último completado)

---

## 1. Estado General

### Resumen ejecutivo

ObrasDeTeatro® es una plataforma digital para el ecosistema teatral hispanohablante. Combina dos módulos estructurales activos: (1) un **directorio profesional** con registro, autenticación y planes de suscripción, y (2) una **Biblioteca Oficial** de obras del patrimonio teatral.

La infraestructura técnica está consolidada. La monetización funciona. El directorio de profesionales está operativo. La Biblioteca tiene arquitectura de datos sólida con un primer catálogo real (5 obras). La plataforma es pública y accesible.

El proyecto no tiene ningún módulo en producción que esté roto o inaccesible. El estado general es **estable y funcional** dentro del alcance implementado.

### Estado de ramas

| Rama | Último commit | Descripción |
|------|--------------|-------------|
| `main` | `372f8db` | Micro Sprint UX-001 — shimmer botón Registrarse |
| `develop` | `69fe818` | OA-1.3 — Biblioteca conectada a Supabase |

### Estado de despliegues

| Entorno | URL | Estado |
|---------|-----|--------|
| **Producción** | `obrasdeteatro.com` | READY — commit `372f8db` |
| **Preview (develop)** | `obrasdeteatro-git-develop-obrasdeteatro-s-projects.vercel.app` | READY — commit `69fe818` |

**Nota importante:** La Biblioteca Oficial (módulo Sistema Obras) está en `develop` únicamente. No ha pasado a producción. El merge a `main` requiere aprobación explícita tras auditoría visual.

---

## 2. Arquitectura Congelada

Los siguientes elementos no pueden modificarse sin sprint explícito y autorización previa.

### 2.1 Middleware de autenticación
- **Estado:** Congelado
- **Rutas protegidas:** `/dashboard`, `/perfil`, `/mis-obras`, `/obras/nueva`, `/obras/*/editar`
- **Sprint:** Sprint-4a / build inicial

### 2.2 Supabase Auth
- **Estado:** Congelado — Supabase SSR, `@supabase/ssr`, cookies
- **Flujos:** Login, registro, recuperación de contraseña, OAuth callback, recovery callback, logout, email de bienvenida
- **Sprint:** Sprints 2a–4c

### 2.3 Stripe — Monetización
- **Estado:** Congelado
- **Planes:** gratuito (0€), premium (2.99€/mes), destacado (6.99€/mes), empresas (14.99€/mes)
- **Operativo:** `/api/create-checkout-session`, `/api/webhooks/stripe`, tabla `subscriptions`
- **Sprint:** Sprint-2c, Sprint-4a

### 2.4 RLS (Row Level Security)
- **Estado:** Congelado en todas las tablas. RLS habilitado en las 29 tablas del schema public
- **Sprint:** Múltiples sprints — no modificar sin análisis de seguridad específico

### 2.5 Storage
- **Estado:** Congelado — Supabase Storage para avatares
- **Bucket activo:** avatares de perfiles
- **Sprint:** Sprint P2.0-A

### 2.6 Modelo de Propiedad Dual (works)
- **Estado:** Congelado
- **Fecha:** 2026-06-28
- **Sprint:** ETS P2.2.2A
- **Descripción:** `works.profile_id` XOR `works.institution_id`. Constraint `works_single_owner` activo. Las obras pertenecen a un usuario O a una institución, nunca a ambos ni a ninguno.

### 2.7 Tabla `institutions`
- **Estado:** Congelado
- **Fecha:** 2026-06-28
- **Sprint:** ETS P2.2.2A
- **Registro único activo:** Biblioteca Oficial ObrasDeTeatro® (`d0a54895-ac1a-4dc4-9286-9ff84c9841ee`, slug `biblioteca-oficial`)

### 2.8 Sistema de Importación — work_files
- **Estado:** Congelado — `work_files_file_type_check` permite únicamente: `script | image | video | audio | document`
- **Nota:** Los guiones PDF se importan como `file_type = 'script'`. Evaluar ampliación en sprint específico.
- **Sprint:** ETS P2.2.2B (hallazgo)

### 2.9 Archivo Maestro de la Biblioteca
- **Estado:** Congelado — repositorio documental en `ARCHIVO_MAESTRO_BIBLIOTECA/`
- **Fecha:** 2026-06-28
- **Sprint:** ETS P2.2.4
- **Regla:** Ninguna obra puede importarse a Supabase sin pasar primero por el Archivo Maestro

### 2.10 Libro de Incorporaciones
- **Estado:** Congelado — `ARCHIVO_MAESTRO_BIBLIOTECA/00_DOCUMENTACION/LIBRO_DE_INCORPORACIONES.md`
- **Incorporación activa:** Nº 001 — Pedro Calderón de la Barca (Colección Fundacional, Lote 001)
- **Sprint:** ETS P2.2.6

### 2.11 Estructura de la Biblioteca Oficial (`/obras`)
- **Estado:** Arquitectura congelada, contenido en evolución
- **Fecha:** 2026-06-29 (OA-1.3 cierra el ciclo inicial)
- **Sprint:** OA-1.2 → OA-1.3

### 2.12 Taxonomía Oficial de Obras
- **Estado:** Congelado — 59 géneros en 9 bloques temáticos
- **Ubicación:** `app/obras/page.tsx` (constante `TAXONOMIA`) y `components/design-system/TopNav.tsx` (`OBRAS_TAXONOMIA`)
- **Sprint:** ETS-001

---

## 3. Funcionalidades Implementadas

### 3.1 Infraestructura y plataforma

| Funcionalidad | Ruta / Archivo | Estado |
|--------------|----------------|--------|
| Home pública con hero y planes | `/` | ✅ Producción |
| TopNav (público + autenticado) | `components/design-system/TopNav.tsx` | ✅ Producción |
| Sidebar (dashboard) | `components/design-system/Sidebar.tsx` | ✅ Producción |
| Footer | Inline en layouts | ✅ Producción |
| Sistema de variables CSS | `app/globals.css` | ✅ Producción |

### 3.2 Autenticación y seguridad

| Funcionalidad | Ruta | Estado |
|--------------|------|--------|
| Login | `/auth/login` | ✅ Producción |
| Registro con email | `/auth/registro` | ✅ Producción |
| Recuperación de contraseña | `/auth/recuperar` | ✅ Producción |
| Update password | `/auth/update-password` | ✅ Producción |
| Callback OAuth | `/auth/callback` | ✅ Producción |
| Callback recovery | `/auth/callback/recovery` | ✅ Producción |
| Logout | `/auth/logout` | ✅ Producción |
| Email de bienvenida | `/api/auth/welcome-email` | ✅ Producción |
| Middleware de protección de rutas | `middleware.ts` | ✅ Producción |

### 3.3 Directorio profesional

| Funcionalidad | Ruta | Estado |
|--------------|------|--------|
| Directorio público con filtros | `/directorio` | ✅ Producción |
| Filtros por tipo de profesional | `FiltrosGeo.tsx` | ✅ Producción |
| Filtros geográficos (país/región) | `FiltrosGeo.tsx` | ✅ Producción |
| Perfil público por slug | `/perfil/[slug]` | ✅ Producción |
| Edición de perfil (datos básicos) | `/perfil` | ✅ Producción |
| Bloques de perfil (9 bloques) | `/perfil/bloque/[n]` | ✅ Producción |
| Upload de avatar | `AvatarUpload.tsx` | ✅ Producción |
| Slug generado automáticamente | Supabase DB function | ✅ Producción |

### 3.4 Sistema de obras (usuario)

| Funcionalidad | Ruta | Estado |
|--------------|------|--------|
| Listado de mis obras | `/mis-obras` | ✅ Producción |
| Crear nueva obra | `/obras/nueva` | ✅ Producción |
| Editar obra | `/obras/[slug]/editar` | ✅ Producción |
| Ficha pública de obra por slug | `/obras/[slug]` | ✅ Develop (no en producción) |

### 3.5 Monetización

| Funcionalidad | Archivo | Estado |
|--------------|---------|--------|
| Página de precios | `/precios` | ✅ Producción |
| Checkout Stripe | `/api/create-checkout-session` | ✅ Producción |
| Webhook Stripe | `/api/webhooks/stripe` | ✅ Producción |
| 4 planes definidos | `lib/plans.ts` | ✅ Producción |
| Plan badge en Dashboard | `app/dashboard/page.tsx` | ✅ Producción |

### 3.6 Dashboard profesional

| Funcionalidad | Estado |
|--------------|--------|
| Bienvenida personalizada | ✅ Producción |
| Stats (tipo, plan, visibilidad, fecha) | ✅ Producción |
| URL pública del perfil | ✅ Producción |
| Módulos (Mi perfil, Mis obras, Convocatorias placeholder) | ✅ Producción |
| Banner onboarding plan gratuito | ✅ Producción |
| Banner éxito tras suscripción | ✅ Producción |

### 3.7 Biblioteca Oficial (Sistema Obras)

| Funcionalidad | Ruta | Estado |
|--------------|------|--------|
| Página principal Biblioteca | `/obras` | ✅ Develop |
| Catálogo real desde Supabase | `/obras` | ✅ Develop |
| Fichas públicas navegables | `/obras/[slug]` | ✅ Develop |
| Ficha institucional (obra Biblioteca) | `/obras/[slug]` | ✅ Develop |
| Arquitectura Modelo Propiedad Dual | Supabase schema | ✅ Develop |
| Colección Fundacional — Lote 001 | Supabase + Archivo Maestro | ✅ Develop |

---

## 4. Funcionalidades Parcialmente Implementadas

### 4.1 Ficha pública de obra (`/obras/[slug]`)
**Qué funciona:** título, autor, sinopsis, género, año, idioma, reparto (min/max), nombre de institución o enlace al perfil del autor, fecha de creación.
**Qué falta:**
- Botón de descarga de guión (necesita `work_files` con PDF real y lógica de acceso según `access_type`)
- Información de derechos visible al usuario
- Enlace a ficha del autor (actualmente enlaza a `/perfil/[slug]` solo si existe `profile_id`)
- Portada/imagen de la obra (`cover_image_url` está en schema, sin UI)
- `synopsis_full` diferenciada de `synopsis_short` (actualmente se usa `synopsis` genérico)

**Sprint previsto para completar:** no asignado todavía

### 4.2 Biblioteca `/obras` — buscador
**Qué existe:** input UI deshabilitado con placeholder "Buscar una obra, autor o género..."
**Qué falta:** lógica de búsqueda (full-text search en Supabase o similar), debounce, resultados
**Sprint previsto:** no asignado

### 4.3 Biblioteca `/obras` — filtros por género
**Qué existe:** bloque visual de 59 géneros con tags `<span>`, sin interactividad
**Qué falta:** lógica de filtrado por género conectada a Supabase
**Sprint previsto:** no asignado

### 4.4 Autores destacados en `/obras`
**Qué existe:** `AUTORES_PLACEHOLDER` estático con 4 entradas (García Lorca, Calderón, Lope de Vega, Valle-Inclán) y datos inventados
**Qué falta:** tabla de autores en Supabase, datos reales, enlace a fichas de autor
**Sprint previsto:** no asignado (requiere definición del modelo de datos de autores)

### 4.5 Perfil público (`/perfil/[slug]`) — bloques especializados
**Qué existe:** perfil básico con bio, tipo, país, avatar. 9 tablas especializadas en Supabase (`perfil_actor`, `perfil_director`, etc.) — todas con 0 filas.
**Qué falta:** UI para mostrar información especializada según tipo de perfil (créditos para actor, filmografía para director, repertorio para compañía, etc.)
**Sprint previsto:** no asignado

### 4.6 Plan enforcement
**Qué existe:** columna `plan` en `profiles`, badge visual en dashboard, lógica de Stripe activa
**Qué falta:** enforcement real de límites por plan (obras máximas para plan gratuito, visibilidad prioritaria para destacado, etc.). Las diferencias entre planes son actualmente visuales, no funcionales.
**Sprint previsto:** no asignado

---

## 5. Placeholders

| Placeholder | Ubicación | Finalidad | Sprint previsto |
|------------|-----------|-----------|-----------------|
| `AUTORES_PLACEHOLDER` | `app/obras/page.tsx:59-64` | Lista de autores destacados en Biblioteca | Sin asignar (requiere tabla de autores) |
| Buscador `disabled` | `app/obras/page.tsx:113-114` | Campo de búsqueda en Biblioteca | Sin asignar |
| Tags de género no interactivos | `app/obras/page.tsx:138-142` | Filtros de género en Biblioteca | Sin asignar |
| `+4.000 Obras` en Hero home | `app/page.tsx:49` | Indicador aspiracional de catálogo | Cuando el catálogo justifique el número real |
| `20 Países` en Hero home | `app/page.tsx:50` | Indicador geográfico | Actualizar con datos de directorio cuando sea representativo |
| "Próximamente" módulo Convocatorias | `app/dashboard/page.tsx:172-176` | Módulo futuro en dashboard | Sprint Convocatorias (sin asignar) |
| ScenaIA en narrative home | `app/page.tsx:103-105` | Bloque de funcionalidad de IA | Sprint ScenaIA (sin asignar) |
| `OBRAS_TAXONOMIA` en TopNav | `components/design-system/TopNav.tsx` | Dead code de taxonomía de géneros | Limpiar en sprint OA futuro |

---

## 6. Backlog Técnico

### Prioridad alta

1. **Merge develop → main** — La Biblioteca Oficial está únicamente en `develop`. Requiere auditoría visual aprobada antes del merge.

2. **Enforcement de límites por plan** — El plan gratuito en teoría limita a 3 obras, pero no hay lógica que bloquee la creación de más. Riesgo de inconsistencia entre promesas comerciales y comportamiento real.

3. **URLs de edición específicas para obras Calderón** — Las 5 obras tienen `source_url` apuntando al portal general de Cervantes Virtual, no a ediciones individuales. Necesario antes de asociar PDFs reales.

4. **Limpieza de dead code** — `OBRAS_TAXONOMIA` en `TopNav.tsx` no se usa. CSS `nav-dropdown-*`, `nav-mp-*`, `bib-stat-*` son clases huérfanas.

### Prioridad media

5. **Tabla de autores en Supabase** — No existe un modelo de datos para autores/dramaturgos como entidades independientes. Actualmente el autor es solo un campo de texto en `works.author`.

6. **Sistema de descarga de guiones** — La tabla `work_files` existe (1 registro piloto) pero no hay UI ni lógica de acceso (`access_type` definido, no implementado).

7. **Migración tipográfica** — El Sistema Editorial 2026 especifica Newsreader + IBM Plex. La plataforma usa DM Serif Display + DM Sans. Pendiente sprint de migración explícita.

8. **3 archivos no trackeados en raíz** — `INFORME_PRE_COMMIT_AVATAR_v1.0.md`, `INFORME_PRE_COMMIT_FASES_4_5.md`, `INFORME_PRE_COMMIT_REFINAMIENTOS.md`. Pueden eliminarse cuando se autorice.

### Prioridad baja

9. **Ambigüedades de fechas en el catálogo** — *El alcalde de Zalamea* (año 1636 provisional), *El gran teatro del mundo* (1655 publicación vs. c. 1633-1649 composición). Documentadas en `Informe_Lote_001_Calderon.md`.

10. **`work_files_file_type_check`** — Evaluar si los 5 tipos actuales (`script | image | video | audio | document`) son suficientes para la Biblioteca a largo plazo.

---

## 7. Backlog Funcional

### Módulos con schema en Supabase pero sin frontend

| Módulo | Tabla Supabase | Filas actuales | Descripción |
|--------|---------------|---------------|-------------|
| Castings | `castings`, `casting_applications` | 0 | Publicación y aplicación a castings |
| Convocatorias | `calls` | 0 | Residencias, festivales, oportunidades |
| Eventos/Espectáculos | `events`, `tickets`, `ticket_orders` | 0 | Gestión de funciones y venta de entradas |
| Mensajería | `conversations`, `messages` | 0 | Comunicación entre usuarios |
| Notificaciones | `notifications` | 0 | Sistema de alertas en plataforma |
| Denuncias | `reports` | 0 | Moderación de contenido |
| Verificación | `verification_requests` | 0 | Badges de perfil verificado |
| Solicitudes de derechos | `work_rights_requests` | 0 | Gestión de derechos de representación |
| ScenaIA | `ai_requests` | 0 | Herramienta de IA para el sector |

### Módulos sin schema ni frontend

| Módulo | Descripción |
|--------|-------------|
| Teatros / Salas | Fichas de espacios escénicos |
| Compañías | Fichas avanzadas de compañías |
| Festivales | Fichas de festivales |
| Escuelas | Fichas de centros de formación |
| Panel de administración | Gestión interna de contenido y usuarios |
| Analytics / Métricas | Visitas, conversiones, engagement |

---

## 8. Backlog Editorial

### Colección Fundacional

1. **Lote 002 en adelante** — No planificado. El siguiente autor a incorporar debe decidirse editorialmente.

2. **URLs individuales de edición** — Las 5 obras del Lote 001 tienen `source_url` apuntando al portal general de Calderón en Cervantes Virtual. Necesario localizar y registrar URLs de ediciones específicas antes de asociar PDFs.

3. **PDFs reales** — Ningún guión tiene archivo PDF asociado aún. La infraestructura técnica (tabla `work_files`, campo `access_type = 'public_download'`) está lista pero sin contenido.

4. **Sinopsis editorial** — Las 5 obras de Calderón tienen `synopsis_short` y `synopsis_full` en Supabase, pero la ficha pública actualmente solo muestra `synopsis` (campo genérico del schema antiguo). Necesario unificar los campos.

5. **Imágenes de portada** — `cover_image_url` existe en schema pero ninguna obra tiene imagen. Necesario definir criterios (grabados históricos, portadas de ediciones críticas, etc.).

6. **Ficha editorial completa de la Biblioteca** — La ficha pública de obra (`/obras/[slug]`) muestra datos básicos. Pendiente diseño editorial de la ficha completa: portada, acceso al guión, información de derechos, ediciones, notas críticas.

7. **Criterios editoriales para Lote 002** — Definir si el siguiente lote es otro autor del Siglo de Oro, teatro del siglo XX, teatro contemporáneo, etc.

---

## 9. Colección Fundacional

| Dato | Valor |
|------|-------|
| Autores en Supabase | 0 (no existe tabla de autores — el autor es un campo de texto en `works.author`) |
| Autores en Archivo Maestro | 1 (Pedro Calderón de la Barca — `02_AUTORES/Pedro_Calderon_de_la_Barca.xlsx`) |
| Obras en Supabase | 5 |
| Instituciones | 1 (Biblioteca Oficial ObrasDeTeatro®) |
| Work files | 1 (obra piloto, sin PDF real) |
| Último lote incorporado | Lote_001_Calderon (2026-06-28, Sprint P2.2.6) |
| Próximo lote previsto | No planificado — pendiente decisión editorial |

### Obras de la Colección Fundacional

| Obra | Año | Género | ID Supabase |
|------|-----|--------|-------------|
| La vida es sueño | 1635 | Teatro clásico | `4bfbe073` |
| El alcalde de Zalamea | 1636* | Drama de honor | `3a06cfdf` |
| El gran teatro del mundo | 1655** | Auto sacramental | `f531ebd7` |
| La dama duende | 1629 | Comedia de enredo | `e580a304` |
| Casa con dos puertas mala es de guardar | 1629 | Comedia de enredo | `2f7a12a0` |

*Año provisional — composición debatida (c. 1636–1645)
**Año de publicación — composición c. 1633–1649

---

## 10. Estado de la Biblioteca Oficial

### Completamente terminado

- Modelo de datos (Supabase schema, constraint XOR, tabla `institutions`)
- Importación Lote 001 (5 obras Calderón, verificadas)
- Archivo Maestro (estructura documental en 7 directorios)
- Libro de Incorporaciones (Incorporación Nº 001 registrada)
- Página `/obras` conectada a datos reales con fichas clicables
- Fichas públicas `/obras/[slug]` funcionales (obras institucionales y de usuario)
- Sistema de Importación documentado (`work_files_file_type_check` conocido)

### Congelado (arquitectura estable, contenido en evolución)

- Taxonomía oficial de géneros (59 géneros, 9 bloques) — estática
- Hero editorial de `/obras` — sin estadísticas reales todavía
- Diseño visual de tarjetas y fichas — usando sistema visual actual (DM Serif/DM Sans)

### Pendiente de evolución

- Buscador funcional (placeholder deshabilitado)
- Filtrado por género (tags no interactivos)
- Tabla de autores en Supabase
- Sistema de descarga de PDFs
- Gestión de derechos visible al usuario
- Fichas editoriales completas (portada, notas críticas, ediciones)
- Lotes 002 en adelante

---

## 11. Riesgos Conocidos

### Riesgo 1 — Desarrollo asimétrico: Biblioteca vs. Directorio
La Biblioteca tiene un catálogo real muy pequeño (5 obras, 1 autor). El home promete "+4.000 obras". Hay una brecha significativa entre la promesa editorial y el contenido real que puede afectar a la percepción de la plataforma en el momento del merge a producción.

### Riesgo 2 — Plan enforcement sin implementar
Los planes de pago prometen diferencias funcionales (número de obras, visibilidad, etc.) que no están implementadas. Un usuario gratuito puede crear más de 3 obras sin restricción. Esto representa una inconsistencia entre el modelo comercial y el código.

### Riesgo 3 — Tablas vacías con schema definido
29 tablas en Supabase. 20 de ellas con 0 filas. Algunas (castings, events, tickets, messages) sugieren funcionalidades que el home o el dashboard mencionan pero no están operativas. Si los usuarios descubren estas inconsistencias puede generar desconfianza.

### Riesgo 4 — Sistema tipográfico pendiente de migración
El Sistema Editorial 2026 aprobado especifica Newsreader + IBM Plex Serif/Sans. La plataforma usa DM Serif Display + DM Sans. Cualquier sprint visual que se haga antes de la migración tipográfica puede necesitar rehacerse.

### Riesgo 5 — Años de composición en el catálogo
Dos obras del Lote 001 tienen años provisionales o debatidos. Si se despliega contenido que dice "1636" y luego se descubre que es incorrecto, la Biblioteca pierde credibilidad editorial.

### Riesgo 6 — Producción desactualizada
`main` está en el commit `372f8db` (Micro Sprint UX-001, shimmer), anterior a todo el Sistema Obras. Hay 13 commits de develop que no están en producción. Mientras más tiempo pase sin merge, más diverge el entorno real del entorno de desarrollo.

### Riesgo 7 — `work_files_file_type_check`
El constraint solo permite 5 tipos de archivo. Si la Biblioteca necesita tipos adicionales en el futuro (por ejemplo, materiales de producción, partituras, etc.), requerirá una migración SQL con análisis de impacto en RLS.

---

## 12. Próximos Sprints Recomendados

El orden siguiente representa una propuesta lógica. Ninguno está autorizado hasta instrucción explícita.

### Nivel 0 — Prerequisito inmediato
1. **Auditoría visual de `/obras`** — Revisar la Biblioteca y las fichas en preview antes de cualquier merge. Único prerequisito para pasar a producción.
2. **Merge develop → main** — Tras aprobación de la auditoría visual. Lleva 13 sprints de trabajo a producción.

### Nivel 1 — Consolidación Biblioteca
3. **Sprint tipográfico** — Migración DM Serif/DM Sans → Newsreader/IBM Plex según Sistema Editorial 2026. Requiere plantilla visual previa del usuario.
4. **Ficha editorial completa** — Diseño y desarrollo de la ficha pública `/obras/[slug]` con portada, synopsis_short/full, botón de descarga, información de derechos.
5. **Sistema de descarga** — Lógica de acceso a PDFs según `access_type`. Solo cuando haya al menos un PDF real disponible.

### Nivel 2 — Catálogo
6. **Tabla de autores en Supabase** — Definición del modelo de datos, migración, y conexión con `works`.
7. **Lote 002** — Incorporación del siguiente autor/colección al Archivo Maestro y Supabase.
8. **Buscador Biblioteca** — Full-text search funcional sobre el catálogo.
9. **Filtros por género** — Filtrado interactivo conectado a Supabase.

### Nivel 3 — Directorio avanzado
10. **Perfiles especializados** — UI para mostrar información de las 8 tablas de perfiles especializados (`perfil_actor`, `perfil_director`, etc.).
11. **Plan enforcement** — Implementar los límites reales por plan (obras, visibilidad, etc.).

### Nivel 4 — Nuevos módulos
12. **Convocatorias** — Schema existe (`calls`). UI de publicación y listado público.
13. **Castings** — Schema existe (`castings`, `casting_applications`). UI de publicación y aplicación.
14. **Mensajería** — Schema existe (`conversations`, `messages`). UI de conversaciones entre usuarios.
15. **ScenaIA** — Herramienta de IA especializada. Schema existe (`ai_requests`). Requiere integración con Claude API.

### Nivel 5 — Ecosistema completo
16. **Eventos y entradas** — Schema existe (`events`, `tickets`, `ticket_orders`). Gestión de espectáculos y venta de entradas.
17. **Panel de administración** — Gestión interna de contenido, moderación, verificación.
18. **Verificación de perfiles** — Schema existe (`verification_requests`). Proceso editorial de badges verificados.

---

## 13. Porcentaje de Avance

Las estimaciones siguientes miden el avance respecto al alcance completo de la plataforma tal como está descrita en el home y en el sistema de tablas de Supabase.

| Área | Avance | Justificación |
|------|--------|---------------|
| **Infraestructura** | 90% | Next.js, Supabase, Stripe, Vercel, middleware, CI/CD vía GitHub integration — todo operativo. Pendiente: monitorización, optimización CDN, alertas. |
| **Arquitectura** | 80% | Dual ownership model, RLS, auth flow, subscription model, instituciones — sólidos. Pendiente: modelo de autores, motor de búsqueda, sistema de notificaciones completo. |
| **Backend** | 65% | Auth, checkout, webhook, queries principales funcionando. Pendiente: descargas, solicitudes de derechos, mensajería, enforcement de planes, search engine. |
| **Frontend** | 60% | Home, directorio, perfil, obras Biblioteca, fichas, dashboard, mis-obras, auth completos. Pendiente: convocatorias, castings, perfiles especializados, admin, ScenaIA. |
| **Biblioteca** | 35% | Arquitectura sólida, 5 obras importadas, fichas navegables. Pendiente: buscador, filtros, descarga PDFs, más de 5 obras, autores como entidad, fichas editoriales completas. |
| **Contenido** | 3% | 1 autor, 5 obras. El home promete +4.000 obras. El catálogo actual representa menos del 1% del objetivo declarado. |
| **Administración** | 0% | No existe panel de administración. Toda gestión de contenido se realiza directamente desde Supabase. |
| **Monetización** | 60% | Stripe activo, 4 planes configurados, checkout y webhook funcionando. Pendiente: enforcement de límites, analytics de ingresos, gestión de suscripciones (cancelación, upgrade/downgrade). |
| **Ecosistema global** | 15% | Home menciona teatros, compañías, festivales, convocatorias — solo el directorio básico y la Biblioteca están operativos. El resto son tablas vacías o menciones sin implementar. |

**Avance global estimado: 42%**

El 42% refleja que la infraestructura y los módulos fundacionales están sólidos, pero el ecosistema completo (convocatorias, castings, mensajería, ScenaIA, panel admin, contenido editorial) representa más de la mitad del alcance total y no ha comenzado.

---

*Documento generado el 2026-06-29 como referencia oficial previa a la reanudación del desarrollo.*
*No ejecutar ningún sprint hasta aprobación explícita de esta auditoría.*
