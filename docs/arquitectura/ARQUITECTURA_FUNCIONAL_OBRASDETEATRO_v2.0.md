# ARQUITECTURA FUNCIONAL OBRASDETEATRO® v2.0

**Proyecto:** obrasdeteatro.com  
**Empresa:** CONECTA PLUS GLOBAL, S.L.U. · Team Show Producciones  
**Versión:** 2.0  
**Fecha de emisión:** 2026-06-19  
**Fecha de congelación:** 2026-06-19  
**Estado:** ✅ CONGELADO  
**Sustituye a:** ARQUITECTURA_FUNCIONAL_OBRASDETEATRO v1.0 (no localizada; reconstruida con fuentes de Nivel 0–4)

> Este documento está **CONGELADO**. No debe modificarse salvo por una nueva versión numerada (v2.1+). Cualquier cambio de producto, nueva fase o resolución de huecos de §12 genera una revisión documentada.

---

## Preámbulo — Jerarquía documental y fuentes autoritativas

Este documento es el **Nivel 5** de la jerarquía documental del proyecto. En caso de conflicto entre fuentes, prevalece el nivel más bajo (más cercano al estado real del sistema).

| Nivel | Documento(s) | Autoritativo para |
|---|---|---|
| **0** | Código fuente + git log | Qué está implementado, rutas reales, estado de producción |
| **1** | ARQUITECTURA_BD_SUPABASE_v1.2.docx | Nombres de tablas, campos, tipos, FK, RLS, triggers |
| **2** | Tabla Definitiva de Planes v2 · Formularios funcionales (16) · Políticas especializadas (10) | Features por plan, cuotas, campos de entidad, reglas legales y operativas |
| **3** | ROADMAP_DESARROLLO_v1.1.docx | Orden de fases, alcance MVP, criterios de cierre |
| **4** | Informe_Auditoria_Funcional_ObrasDeTeatro.docx | Fuente secundaria; cede ante Niveles 0–3 |
| **5** | **Este documento** | Capa funcional consolidada; autoritativo una vez completado |

**Regla de resolución de conflictos:**  
> Cuando dos fuentes contradigan el mismo dato, prevalece la de nivel más bajo. En empate de nivel, prevalece la fecha de modificación más reciente. Si persiste la ambigüedad, este documento declara explícitamente qué fuente adopta y por qué.

**Corrección aplicada:** Las cuotas de ScenaIA declaradas en el ROADMAP v1.1 (Premium=50, Destacado=200) son incorrectas. La Tabla Definitiva de Planes v2 (Nivel 2, posterior) fija: **Gratuito=5, Premium=30, Destacado=60, Empresa=ilimitado**. Se adopta la Tabla Definitiva como fuente autoritativa para todas las restricciones por plan.

---

## 1. Catálogo de roles del sistema

### 1.1 Roles de usuario — desarrollados (8)

Cada uno de estos roles tiene un formulario de perfil propio que define sus campos, funcionalidades disponibles y configuración de ScenaIA.

| Rol | Nombre visible | Tipo | Formulario origen | Puede verificarse |
|---|---|---|---|---|
| `actor` | Actor / Actriz | Artístico individual | Formulario_Actor-Atriz.docx | No (artístico) |
| `director` | Director / Directora | Artístico individual | Formulario_Perfil_Director.docx | No (artístico) |
| `dramaturgo` | Dramaturgo / Dramaturga | Artístico individual | Formulario_Perfil_Dramaturgo.docx | No (artístico) |
| `company` | Compañía Teatral | Organizacional | Formulario_Perfil_Compañía_Teatral.docx | Sí |
| `producer` | Productora | Organizacional | Formulario_Perfil_Productora.docx | Sí |
| `theater` | Teatro / Sala de Teatro | Organizacional | Formulario_Perfil_salas_de_Teatro.docx | Sí |
| `festival` | Festival | Organizacional | Formulario_Perfil_Festival.docx | Sí |
| `school` | Escuela / Formación | Organizacional | Formulario_escuelas_y_formaciones.docx | Sí |

> Un usuario puede tener múltiples roles simultáneamente (ej. actor Y dramaturgo). La tabla `profile_roles` gestiona esta multiplicidad. El campo `is_primary` indica el rol principal del perfil.

### 1.2 Roles de usuario — parciales (3)

Mencionados en el Formulario de Registro y en los Términos y Condiciones, pero sin formulario de perfil dedicado. Quedan pendientes de desarrollo.

| Rol | Nombre visible | Descripción | Estado |
|---|---|---|---|
| `institution` | Institución Pública | Organismos públicos que organizan convocatorias o festivales. Aparece como tipo de entidad organizadora en Convocatoria y Casting, pero carece de perfil autónomo. | ◐ Parcial |
| `arts_professional` | Profesional de Artes Escénicas | Rol ambiguo; posiblemente cubre escenógrafos, técnicos de iluminación, vestuario u otros perfiles técnicos no artísticos. Requiere decisión sobre si es un perfil independiente o una subcategoría de `actor`. | ◐ Parcial |
| `audience` | Público General | Usuarios sin perfil profesional, interesados en el consumo de contenido (espectadores, aficionados). Sin permisos de publicación. Requiere definición de su experiencia de navegación. | ◐ Parcial |

### 1.3 Roles administrativos (2)

El rol Administrador no tiene formulario de perfil público. Opera exclusivamente en el backoffice. Los roles administrativos **no utilizan `profile_roles`** — se gestionan mediante un sistema independiente basado en `auth.users.app_metadata` de Supabase Auth.

**Mecanismo de implementación:**

```sql
-- Asignación de rol admin (solo vía service_role / Supabase Dashboard)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"admin_role": "superadmin"}'
WHERE id = '<user-uuid>';

-- Lectura en RLS policies
CREATE POLICY "admin_access" ON audit_logs
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin_role') IN ('superadmin', 'moderator')
  );
```

**Propiedades del sistema:**
- Los roles admin viven en `auth.users.app_metadata` (JWT claim persistente), no en tablas de la aplicación
- `app_metadata` solo es modificable por `service_role` — nunca por el cliente
- Compatible con RLS: cualquier policy puede leer `auth.jwt()->'app_metadata'->>'admin_role'`
- No requiere tabla adicional ni modifica el esquema de `profile_roles`
- El mismo usuario puede tener perfil público en `profiles` y rol admin en `app_metadata` simultáneamente

| Rol admin | Valor en `app_metadata.admin_role` | Alcance funcional |
|---|---|---|
| `superadmin` | `"superadmin"` | Acceso total: gestión de usuarios, planes, configuración del sistema, resolución de cualquier incidencia, acceso a `audit_logs`, posibilidad de suspender cuentas y modificar datos sensibles. |
| `moderator` | `"moderator"` | Revisión y aprobación de contenido publicado, gestión de reportes, moderación de comentarios, verificación de perfiles. **No puede** suspender cuentas, modificar planes ni acceder a configuración del sistema. |

### 1.4 Roles técnicos del sistema (Supabase)

Definidos en `ARQUITECTURA_BD_SUPABASE_v1.2`. No son roles de usuario sino contextos de ejecución de Supabase/PostgreSQL.

| Rol Supabase | Contexto | Notas |
|---|---|---|
| `anon` | Visitantes no autenticados | Solo lectura de contenido público (`deleted_at IS NULL`) |
| `authenticated` | Cualquier usuario registrado | Base de todos los usuarios activos |
| `service_role` | Servidor / webhooks Stripe / triggers | Nunca expuesto al cliente. Usado por el backend y los triggers. |

---

## 2. Matriz de permisos por rol

### 2.1 Permisos de publicación por tipo de rol

| Funcionalidad | Actor/Dir/Dram | Compañía | Productora | Teatro | Festival | Escuela | Institución | Admin |
|---|---|---|---|---|---|---|---|---|
| Publicar Castings | — | ✅ | ✅ | — | — | — | — | ✅ (todo) |
| Publicar Convocatorias | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (todo) |
| Publicar Eventos | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (todo) |
| Publicar Obras/Guiones | ✅ | — | — | — | — | — | — | ✅ (todo) |
| Solicitar Derechos de Representación | ✅ | ✅ | ✅ | — | — | — | — | — |
| Crear perfil profesional | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | — |
| Solicitar Verificación | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Candidatarse a Casting | ✅ | — | — | — | — | — | — | — |
| Moderar / aprobar contenido | — | — | — | — | — | — | — | ✅ |
| Gestionar incidencias/reportes | — | — | — | — | — | — | — | ✅ |
| Suspender cuentas | — | — | — | — | — | — | — | SuperAdmin |
| Acceder a audit_logs | — | — | — | — | — | — | — | SuperAdmin |

### 2.2 Funcionalidades y límites por plan de suscripción

Fuente autoritativa: **Tabla Definitiva de Planes v2** (Nivel 2).

| Funcionalidad | 🆓 Gratuito (0€) | ⭐ Premium (2,99€) | 🌟 Destacado (6,99€) | 🏢 Empresa (8,99€) |
|---|---|---|---|---|
| **PERFIL** | | | | |
| Crear perfil artístico | ✅ | ✅ | ✅ | ✅ |
| Badge de usuario | Básico | Premium | Premium | Verificado |
| Perfil indexable en Google | ✅ | ✅ | ✅ | ✅ |
| URLs públicas compartibles | ✅ | ✅ | ✅ | ✅ |
| Portfolio (fotos, textos) | Básico | Básico | Ampliado | Completo |
| Videos y multimedia en perfil | — | — | ✅ | ✅ |
| Perfil verificado (badge) | — | — | — | ✅ |
| Página empresarial propia | — | — | — | ✅ |
| Historial profesional | — | ✅ | ✅ | ✅ |
| **DIRECTORIO Y BÚSQUEDA** | | | | |
| Buscar teatros y compañías | ✅ | ✅ | ✅ | ✅ |
| Acceso al directorio teatral | ✅ | ✅ | ✅ | ✅ |
| Prioridad en búsquedas internas | — | — | ✅ | ✅ |
| Perfil destacado en resultados | — | — | ✅ | ✅ |
| **CONVOCATORIAS Y CASTINGS** | | | | |
| Ver convocatorias y castings | ✅ | ✅ | ✅ | ✅ |
| Publicar convocatorias | 3/mes | Ilimitadas | Ilimitadas | Ilimitadas |
| Convocatorias destacadas | — | — | ⚠️ pago extra | ✅ incluidas |
| Alertas de convocatorias/castings | Básicas | Ilimitadas | Ilimitadas | Ilimitadas |
| Favoritos avanzados ¹ | — | ✅ | ✅ | ✅ |
| **MENSAJERÍA** | | | | |
| Iniciar conversación | — | ✅ | ✅ | ✅ |
| Responder mensajes recibidos | ✅ | ✅ | ✅ | ✅ |
| **DASHBOARD Y ANALYTICS** | | | | |
| Dashboard de usuario | Básico | Avanzado | Avanzado | Avanzado |
| Analytics / estadísticas | — | — | Básico | Completo |
| Promoción interna en la plataforma | — | — | — | ✅ |
| Acceso al blog | ✅ | ✅ | ✅ | ✅ |
| **SCENAIA** | | | | |
| Bio artística básica | ✅ | ✅ | ✅ | ✅ |
| Generador de textos simple | ✅ | ✅ | ✅ | ✅ |
| Recomendaciones básicas | ✅ | ✅ | ✅ | ✅ |
| **Cuota mensual de usos ScenaIA** | **5/mes** | **30/mes** | **60/mes** | **Ilimitado** |
| Análisis de casting | — | ✅ | ✅ | ✅ |
| Generador de monólogos | — | ✅ | ✅ | ✅ |
| Dossier artístico IA | — | ✅ | ✅ | ✅ |

> ¹ **Favoritos — implementación futura:** La feature `Favoritos avanzados` aparece en la Tabla Definitiva de Planes v2 como funcionalidad Premium+ (Nivel 2 autoritativo). Sin embargo, no existe tabla `favorites` en BD v1.2 y el ROADMAP v1.1 la clasifica como v2.0 (fuera del MVP). **Decisión:** se implementará mediante una nueva tabla `favorites (id, profile_id, target_type, target_id, created_at)` en una migración de Fase 2 o posterior, según prioridad de producto. Hasta entonces, el campo aparece en el plan como feature pero no puede activarse.

> **Nota:** Los campos `is_premium` y `plan` en `profiles` reflejan el plan activo. El campo `plan` acepta: `free`, `premium`, `featured`, `company`. La tabla `subscriptions` almacena el estado detallado de Stripe.

### 2.3 Permisos del backoffice (SuperAdmin vs. Moderador)

| Acción | Moderador | SuperAdmin |
|---|---|---|
| Ver cola de moderación de contenido | ✅ | ✅ |
| Aprobar / rechazar publicaciones | ✅ | ✅ |
| Revisar y resolver reportes | ✅ | ✅ |
| Aprobar / rechazar verificaciones de perfil | ✅ | ✅ |
| Añadir notas internas a reportes | ✅ | ✅ |
| Ver historial de un usuario | ✅ | ✅ |
| Suspender / cancelar cuenta de usuario | — | ✅ |
| Modificar plan de suscripción manualmente | — | ✅ |
| Acceder a `audit_logs` | Solo lectura propia | ✅ completo |
| Configuración del sistema | — | ✅ |
| Gestión de otros administradores | — | ✅ |

---

## 3. Catálogo de módulos funcionales

### 3.1 Auth

| Campo | Valor |
|---|---|
| **Estado** | ✅ Implementado en producción (Fase 1 completada) |
| **Tablas BD** | `auth.users` (Supabase nativo), `profiles`, `profile_roles` |
| **Fase** | Fase 1 (completada) |

**Funcionalidades:**

| Funcionalidad | Estado | Notas |
|---|---|---|
| Registro (email + contraseña) | ✅ Implementado | Trigger `handle_new_user` crea `profiles` automáticamente |
| Verificación de email | ✅ Implementado | Supabase Auth; redirige a `/verificar-email` |
| Login | ✅ Implementado | Supabase Auth; sesión gestionada por `onAuthStateChange` |
| Logout | ✅ Implementado | Usa redirect HTTP 303 para evitar 405 en POST |
| Recuperación de contraseña | ✅ Implementado | Supabase Auth; flujo completo funcional |
| Middleware de rutas protegidas | ✅ Implementado | Protege todas las rutas `/dashboard/*` |

**Rutas Next.js:** `/registro` · `/login` · `/recuperar-contrasena` · `/verificar-email` · `/dashboard`

---

### 3.2 Perfiles

| Campo | Valor |
|---|---|
| **Estado** | ✅ Implementado en producción (Fase 1 completada) |
| **Tablas BD** | `profiles`, `profile_roles` |
| **Storage** | bucket `avatars` (5 MB, image/*) · bucket `media-portfolios` (500 MB, video) |
| **Fase** | Fase 1 |

**Funcionalidades:**

- Perfil público en `/perfil/[slug]` — accesible sin autenticación
- Edición de perfil propio en `/perfil/editar`
- Roles múltiples vía `profile_roles` — mínimo 1 rol obligatorio
- Upload de avatar al bucket `avatars`
- Upload de videobook/showreel al bucket `media-portfolios` (Destacado+)
- Solicitud de verificación (roles organizacionales: company, producer, theater, festival, school)
- Soft delete: `deleted_at = now()` — el perfil desaparece de listados pero no se elimina de BD

**Tipos de perfil y campos clave:** Los campos específicos de cada tipo de perfil están definidos en los 8 formularios funcionales (Nivel 2). En la BD se modelan como columnas opcionales en `profiles` o como datos adicionales en una tabla de extensión futura.

---

### 3.3 Obras y Guiones

| Campo | Valor |
|---|---|
| **Estado** | Definido · Fase 2 |
| **Tablas BD** | `works`, `work_files` |
| **Storage** | bucket `covers` (10 MB, image/*) · bucket `work-files` (50 MB, PDF) |
| **Fase** | Fase 2 |

**Funcionalidades:**

- Publicación de obra con clasificación de derechos: `public_domain` / `copyrighted` / `licensed`
- Si `rights_type = licensed`: campo `rights_holder` obligatorio
- Obras con `copyrighted` o `licensed`: solo se muestra información descriptiva y fragmentos autorizados, **nunca el texto completo**
- Upload de texto completo (PDF) al bucket `work-files` con acceso privado (URL firmada)
- `is_featured` solo disponible para plan `featured` o `company`
- Precio de venta opcional (`price = 0` para obras gratuitas)

**Rutas:** `/obras` · `/obra/[slug]` · `/obra/nueva`

---

### 3.4 Castings

| Campo | Valor |
|---|---|
| **Estado** | Definido · Fase 2 |
| **Tablas BD** | `castings`, `casting_applications` |
| **Storage** | bucket `cv-files` (20 MB, PDF) para CVs de candidatos |
| **Fase** | Fase 2 (publicación) · Fase 2 (candidaturas) |

**Funcionalidades:**

- Publicación de casting por roles organizacionales (company, producer)
- Campos: `roles_needed[]`, `deadline`, `is_paid`, `location`
- Candidatura por actores/directores/dramaturgos vía `casting_applications`
- Tres canales de candidatura (ver Flujo 4.4):
  1. Formulario interno (guarda en `casting_applications`)
  2. Email externo (redirige al email del organizador)
  3. URL externa (redirige a formulario externo)
- Estado de candidatura: `pending → reviewed → selected / rejected`
- Moderación editorial antes de publicar (hasta 48 horas)
- `is_featured` solo para plan `featured` o `company`

**Rutas:** `/castings` · `/casting/[slug]` · `/casting/nuevo`

---

### 3.5 Convocatorias (`calls`)

| Campo | Valor |
|---|---|
| **Estado** | Definido · Fase 2 |
| **Tablas BD** | `calls` |
| **Fase** | Fase 2 |

**Funcionalidades:**

- Publicación de convocatorias culturales generales (festivales, premios, residencias, becas)
- Categorías: festival, premio, residencia, beca
- Campos: `deadline`, `prize`, `location`, `category`
- Límite de publicación por plan: **3/mes** para Gratuito, **ilimitado** para Premium+
- Moderación editorial antes de publicar (hasta 48 horas)
- `is_featured` solo disponible con pago adicional (Destacado) o incluido (Empresa)

**Rutas:** `/convocatorias` · `/convocatoria/[slug]` · `/convocatoria/nueva`

---

### 3.6 Eventos

| Campo | Valor |
|---|---|
| **Estado** | Definido (publicación) · ⏳ Pendiente de implementación (venta de entradas) |
| **Tablas BD** | `events`, `tickets`, `ticket_orders` |
| **Storage** | bucket `event-media` (25 MB, image/video) |
| **Fase** | Fase 2 (publicación) · Fase 7 (ticketing) |

**Funcionalidades:**

- Publicación de espectáculos teatrales con `start_date`, `venue`, `location`, `cover_url`
- Tipos de entrada en `tickets` (`label`, `price`, `quantity`) con `remaining` calculado automáticamente
- Venta de entradas vía Stripe Checkout: **Definido funcionalmente / Pendiente Fase 7**
- Moderación editorial antes de publicar (hasta 48 horas)
- Tres opciones de venta: sistema propio ObrasDeTeatro® · sistema externo · sin venta online

**Rutas:** `/eventos` · `/evento/[slug]` · `/evento/nuevo`

---

### 3.7 Suscripciones y Pagos (Stripe)

| Campo | Valor |
|---|---|
| **Estado** | ✅ Configurado (Stripe conectado) · Definido · Fase 3 |
| **Tablas BD** | `subscriptions`, `profiles` (campos `plan`, `is_premium`, `stripe_customer_id`) |
| **Fase** | Fase 3 |

Ver [Sección 8 — Integración con Stripe](#8-integración-con-stripe) para detalle completo.

---

### 3.8 Mensajería y Conversaciones

| Campo | Valor |
|---|---|
| **Estado** | Definido funcionalmente / Pendiente de implementación (Fase 4) |
| **Tablas BD** | `conversations`, `messages` |
| **Fase** | Fase 4 |

**Funcionalidades:**

- Mensajería directa entre dos usuarios (modelo 1:1, tipo LinkedIn)
- UNIQUE constraint garantiza un único hilo A↔B: `UNIQUE(least(a,b), greatest(a,b))`
- Supabase Realtime: suscripción al canal `notifications:profile_id=<uid>` al iniciar sesión
- **Restricción por plan:** solo usuarios Premium+ pueden **iniciar** una conversación. Plan Gratuito puede **responder** mensajes recibidos.
- Los mensajes no se eliminan (`DELETE Prohibido` en RLS)
- Moderación: sin supervisión permanente; usuario responsable de su uso (Aviso Legal)

> **Nota de implementación — aplicación de la restricción Premium:**  
> La RLS de `conversations` en BD v1.2 permite `INSERT` a cualquier usuario `authenticated`. La restricción "solo Premium+ puede iniciar conversaciones" **no se aplica a nivel de RLS** sino en la **capa de aplicación** (middleware Next.js o API route), verificando `profiles.plan != 'free'` antes de permitir el `INSERT`. Esta decisión es intencional: la RLS solo controla acceso a datos; las reglas de negocio de plan se aplican server-side para facilitar cambios futuros sin migraciones de BD.

**Rutas:** `/mensajes` · `/mensajes/[conversation_id]`

---

### 3.9 Notificaciones

| Campo | Valor |
|---|---|
| **Estado** | Definido funcionalmente / Pendiente de implementación (Fase 4) |
| **Tablas BD** | `notifications` |
| **Fase** | Fase 4 |

**Tipos de notificación definidos en BD:**

`message_received` · `casting_selected` · `rights_request` · `verification_approved` · `verification_rejected` · `subscription_renewed` · `ticket_purchased` · `event_published` · `system_notification`

**Funcionalidades:**

- Historial persistente: el usuario ve notificaciones aunque no estuviera conectado
- Supabase Realtime para entrega en tiempo real
- Campana en header con contador de no leídas
- Marcar como leído: `UPDATE notifications SET is_read = true`
- Deep linking: `reference_type` + `reference_id` para navegar directamente al recurso

**Rutas:** `/notificaciones`

---

### 3.10 ScenaIA

| Campo | Valor |
|---|---|
| **Estado** | Definido funcionalmente / Pendiente de implementación (Fase 5) |
| **Tablas BD** | `ai_requests` |
| **Fase** | Fase 5 |

Ver [Sección 9 — Integración con ScenaIA](#9-integración-con-scenaia) para detalle completo.

---

### 3.11 Verificación de Perfiles

| Campo | Valor |
|---|---|
| **Estado** | Definido · Fase 6 (backoffice) |
| **Tablas BD** | `verification_requests`, `profiles` (campo `is_verified`) |
| **Storage** | bucket `id-documents` (10 MB, image/PDF) |
| **Fase** | Fase 6 |

**Funcionalidades:**

- Solo disponible para roles organizacionales: company, producer, theater, festival, school
- El solicitante aporta: CIF/NIF, URL de web oficial, correo corporativo, documentación adicional
- Sin UNIQUE en `profile_id`: permite reenvíos tras rechazo
- Estados: `pending → approved / rejected`
- Al aprobar: `profiles.is_verified = true`
- La verificación **no es** garantía de solvencia, calidad ni capacidad artística (regla de negocio)
- Revisado por: Moderador o SuperAdmin

---

### 3.12 Derechos de Representación

| Campo | Valor |
|---|---|
| **Estado** | Definido · Fase 5 |
| **Tablas BD** | `work_rights_requests` |
| **Fase** | Fase 5 |

**Funcionalidades:**

- Solicitud formal de derechos de representación sobre una obra publicada
- Disponible para: actor, director, dramaturgo, company, producer
- Campos: `message` (mensaje al autor), `response` (respuesta del autor)
- Estados: `pending → approved / rejected`
- ObrasDeTeatro® actúa como intermediaria tecnológica, no gestiona ni garantiza los derechos (Aviso Legal)

---

### 3.13 Moderación e Incidencias

| Campo | Valor |
|---|---|
| **Estado** | Definido · Fase 6 |
| **Tablas BD** | `reports`, `audit_logs` |
| **Fase** | Fase 6 |

**Tipología de reportes** (`target_type`): `profile` · `work` · `casting` · `call` · `event`

> **Decisión sobre `call` (convocatoria):** Las convocatorias culturales son **reportables**. La BD v1.2 define `target_type` con valores `profile, work, casting, event` pero omite `call`. Esta especificación funcional amplía el conjunto a 5 valores incluyendo `call`. Se requiere una migración de BD en Fase 6 para actualizar el CHECK constraint.  
> **Migración requerida (Fase 6):** `ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_target_type_check; ALTER TABLE reports ADD CONSTRAINT reports_target_type_check CHECK (target_type IN ('profile','work','casting','call','event'));`

**Motivos de reporte:** copyright · suplantación · fraude · spam · contenido inapropiado · otros

**Funcionalidades:**

- Cualquier usuario autenticado puede reportar contenido o perfiles
- El equipo de ObrasDeTeatro® puede solicitar más información a las partes
- El equipo puede adoptar medidas provisionales antes de la resolución
- Sin SLA de tiempo explícito (a diferencia de la moderación de publicación que tiene 48h)
- Resolución: `open → reviewed → resolved / dismissed`
- Acciones posibles: mantenimiento, modificación o retirada del contenido reportado
- Todas las acciones administrativas se registran en `audit_logs` (inmutable)

---

### 3.14 Búsqueda y Directorio

| Campo | Valor |
|---|---|
| **Estado** | Definido funcionalmente / Pendiente de implementación (Fase 2) |
| **Tablas BD** | Vistas: `public_profiles`, `published_works`, índices full-text |
| **Fase** | Fase 2 (buscador básico) |

**Funcionalidades:**

- Buscador unificado: obras + castings + perfiles + convocatorias
- Full-text search con `to_tsvector` en Supabase (título + descripción)
- Filtros: género, tipo de derechos, idioma, ubicación, tipo de rol
- Perfil destacado en resultados: solo plan Destacado y Empresa (`is_featured = true`)
- Prioridad en búsquedas: plan Destacado y Empresa

**Rutas:** `/buscar`

---

### 3.15 Ticketing / Venta de Entradas

| Campo | Valor |
|---|---|
| **Estado** | Definido funcionalmente / Pendiente de implementación (Fase 7) |
| **Tablas BD** | `tickets`, `ticket_orders` |
| **Fase** | Fase 7 (Beta) |

**Funcionalidades (especificación funcional):**

- Tipos de entrada por evento: General, VIP, Estudiante, etc.
- `remaining` calculado automáticamente: `quantity - sold` (columna generada en BD)
- Compra vía Stripe Checkout: `stripe_session_id` almacenado en `ticket_orders`
- Trigger `update_ticket_sold`: incrementa `sold` al confirmar pago; **decrementa** al procesar reembolso (corrección v1.1)
- Estados del pedido: `pending → paid / cancelled / refunded`
- Política de reembolsos: según Política de Reembolsos (Nivel 2); integrada con flujo de cancelación de Stripe

---

### 3.16 Panel de Administración (Backoffice)

| Campo | Valor |
|---|---|
| **Estado** | Definido funcionalmente / Pendiente de implementación (Fase 6) |
| **Tablas BD** | `audit_logs`, `reports`, `verification_requests` + acceso a todas las tablas |
| **Fase** | Fase 6 |

Ver [Sección 10 — Backoffice / Panel de Administración](#10-backoffice--panel-de-administración) para detalle completo.

---

## 4. Flujos principales

### 4.1 Registro y alta de perfil

**Actor:** Usuario nuevo (cualquier tipo de perfil)  
**Precondición:** Email válido no registrado previamente

| Paso | Acción | Sistema | Notas |
|---|---|---|---|
| 1 | Accede a `/registro` y selecciona tipo de perfil (11 opciones) | — | |
| 2 | Completa datos de acceso: email, contraseña, nombre, username, rol principal | — | |
| 3 | Completa datos generales: país, ciudad, idioma | — | |
| 4 | Verificación anti-bot | reCAPTCHA o equivalente | |
| 5 | Acepta consentimientos: T&C, Privacidad, mayoría de edad (≥18), veracidad | — | Consentimientos obligatorios |
| 6 | Envía formulario | `INSERT auth.users` | |
| 7 | — | Trigger `handle_new_user` crea `profiles` con `username` único (sufijo incremental si colisión) | |
| 8 | — | Supabase envía email de verificación | |
| 9 | Redirige a `/verificar-email` | — | |
| 10 | Usuario confirma email | `profiles.is_verified = true` para email (distinto de verificación de perfil organizacional) | |
| 11 | Redirige a `/dashboard` | Sesión activa | |

**Postcondición:** Registro en `auth.users` + `profiles` + entrada en `profile_roles` (rol primario). Slug SEO generado automáticamente por trigger `auto_slug`.

---

### 4.2 Login y gestión de sesión

**Actor:** Usuario registrado  
**Estado:** ✅ Implementado

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Accede a `/login` con email + contraseña | — |
| 2 | Supabase valida credenciales | Supabase Auth |
| 3 | — | Sesión activada · `onAuthStateChange` gestiona estado |
| 4 | Redirige a `/dashboard` | Middleware verifica sesión |
| **Logout** | Usuario hace clic en "Cerrar sesión" | `POST /api/auth/logout` → redirect 303 (evita HTTP 405) |
| **Recuperación** | Accede a `/recuperar-contrasena` · introduce email | Supabase envía enlace de reset |
| — | Usuario hace clic en el enlace del email | Supabase gestiona el token de recuperación |
| — | Redirige a formulario de nueva contraseña | Contraseña actualizada en `auth.users` |

---

### 4.3 Publicación de contenido con moderación

**Actor:** Usuario con permisos de publicación (company, producer, theater, festival, school según tipo de contenido)  
**Aplica a:** Castings · Convocatorias · Eventos

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Accede a formulario de publicación (`/casting/nuevo`, `/convocatoria/nueva`, `/evento/nuevo`) | — |
| 2 | Completa campos del formulario | Validación client-side |
| 3 | Declara veracidad y autorización suficiente para publicar | Consentimiento obligatorio |
| 4 | Envía pulsando "Enviar para revisión" (no "Publicar") | `INSERT` con `is_published = false` |
| 5 | — | Trigger `auto_slug` genera slug SEO |
| 6 | — | Notificación interna al equipo de moderación |
| 7 | Moderador/SuperAdmin revisa en backoffice | Plazo máximo: **48 horas** |
| 8a | **Aprobación** → `is_published = true` | Notificación al publicador · indexación en directorio · alertas a usuarios compatibles |
| 8b | **Rechazo** → `is_published = false` (permanece) | Notificación al publicador con motivo |
| 8c | **Solicitud de info adicional** → moderador contacta al publicador | Sin cambio de estado hasta resolución |

**Regla crítica:** Todo contenido pasa por moderación antes de ser visible públicamente. No existe publicación instantánea para castings, convocatorias ni eventos.

---

### 4.4 Aplicación a casting/convocatoria (candidato)

**Actor:** Actor, director o dramaturgo  
**Precondición:** El casting/convocatoria está publicado (`is_published = true`)

**Canal 1 — Formulario interno (canal principal):**

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Candidato visita `/casting/[slug]` y pulsa "Candidatarme" | — |
| 2 | Completa carta de presentación + sube CV/portfolio | Upload a bucket `cv-files` |
| 3 | Envía | `INSERT casting_applications` con `status = 'pending'` |
| 4 | — | Notificación al organizador |
| 5 | Organizador revisa candidaturas en su dashboard | — |
| 6 | Organizador cambia estado: `pending → reviewed → selected / rejected` | `UPDATE casting_applications.status` |
| 7 | — | Notificación al candidato con resolución |

**Canal 2 — Email externo:** El casting incluye un email de contacto. El botón "Candidatarme" abre el cliente de correo del usuario con asunto predefinido.

**Canal 3 — URL externa:** El casting incluye URL a formulario externo. El botón "Candidatarme" abre esa URL en nueva pestaña. La candidatura no se registra en la BD de ObrasDeTeatro®.

---

### 4.5 Suscripción y pago (Stripe)

**Actor:** Cualquier usuario autenticado  
**Precondición:** Cuenta activa con email verificado

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Usuario accede a `/suscripcion` y selecciona plan (Premium / Destacado / Empresa) | — |
| 2 | Introduce datos de facturación: nombre/razón social, NIF/CIF, dirección | — |
| 3 | Selecciona método de pago vía Stripe (tarjeta, Apple Pay, Google Pay) | Stripe Checkout |
| 4 | Revisa resumen: plan, precio, periodicidad mensual, impuestos, total | — |
| 5 | Acepta condiciones de renovación automática y suscripción | Consentimiento obligatorio |
| 6 | Confirma pago | Stripe procesa el cobro |
| 7 | — | Stripe envía webhook `checkout.session.completed` |
| 8 | — | `/api/webhooks/stripe` procesa: `INSERT subscriptions` · `UPDATE profiles.plan` · `UPDATE profiles.is_premium = true` |
| 9 | Usuario tiene acceso inmediato a funciones del nuevo plan | Notificación de confirmación |
| **Renovación** | Mensual automática | Webhook `customer.subscription.updated` |
| **Impago** | — | Webhook `customer.subscription.updated` con `status = 'past_due'` → acceso degradado |

---

### 4.6 Cancelación de suscripción

**Actor:** Usuario con suscripción activa

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Accede a portal de cliente Stripe desde su dashboard | Stripe Customer Portal |
| 2 | Selecciona "Cancelar suscripción" | — |
| 3 | Confirma la cancelación | `subscriptions.cancel_at_period_end = true` |
| 4 | — | Webhook `customer.subscription.updated` |
| 5 | El usuario mantiene acceso al plan hasta el fin del período actual | — |
| 6 | Al fin del período | Webhook `customer.subscription.deleted` → `UPDATE profiles.plan = 'free'` · `UPDATE profiles.is_premium = false` |

**Regla:** La cancelación no genera reembolso de períodos ya abonados, salvo lo que establezca la normativa aplicable (Términos y Condiciones, Formulario de Suscripción).

---

### 4.7 Verificación de perfil organizacional

**Actor:** Perfil de tipo company, producer, theater, festival o school  
**Precondición:** Perfil creado y email verificado

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Usuario accede a su dashboard y solicita verificación | — |
| 2 | Aporta documentación: CIF/NIF, URL web oficial, correo corporativo | Upload a bucket `id-documents` |
| 3 | Envía | `INSERT verification_requests` con `status = 'pending'` |
| 4 | — | Notificación al equipo de verificación |
| 5 | Moderador/SuperAdmin revisa en backoffice | Sin SLA explícito |
| 6a | **Aprobación** | `UPDATE verification_requests.status = 'approved'` · `UPDATE profiles.is_verified = true` · Notificación al usuario |
| 6b | **Rechazo** | `UPDATE verification_requests.status = 'rejected'` · Notificación al usuario con motivo |
| 7 | Si rechazado: usuario puede reenviar solicitud | Sin UNIQUE en `profile_id` — permite múltiples envíos |

**Regla:** La verificación acredita que el perfil corresponde a la entidad declarada, **no** garantiza su solvencia, calidad ni capacidad artística.

---

### 4.8 Reporte de incidencia y resolución

**Actor:** Cualquier usuario autenticado

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Usuario detecta irregularidad · Accede al formulario de reporte | — |
| 2 | Selecciona tipo de elemento reportado (`target_type`: profile, work, casting, event) | — |
| 3 | Selecciona motivo y añade descripción | — |
| 4 | Aporta evidencias y, si aplica, declaración de titularidad de derechos | — |
| 5 | Envía | `INSERT reports` con `status = 'open'` |
| 6 | — | Notificación al equipo de moderación |
| 7 | Moderador/SuperAdmin revisa | Puede solicitar más información a las partes; puede adoptar medidas provisionales |
| 8 | Resolución | `UPDATE reports.status = 'reviewed' → 'resolved' / 'dismissed'` |
| 9 | — | `INSERT audit_logs` con acción, actor, target y metadata |
| 10 | — | Notificación a las partes implicadas |

---

### 4.9 Solicitud de derechos de representación

**Actor:** Actor, director, dramaturgo, company o producer  
**Precondición:** La obra está publicada en `/obra/[slug]`

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Usuario visita ficha de obra · pulsa "Solicitar derechos de representación" | — |
| 2 | Completa formulario: datos de la producción, mensaje al autor | — |
| 3 | Envía | `INSERT work_rights_requests` con `status = 'pending'` |
| 4 | — | Notificación al autor de la obra (`notification type: rights_request`) |
| 5 | Autor revisa la solicitud desde su dashboard | — |
| 6a | **Aprobación** | `UPDATE work_rights_requests.status = 'approved'` · `response` del autor · Notificación al solicitante |
| 6b | **Rechazo** | `UPDATE work_rights_requests.status = 'rejected'` · `response` opcional · Notificación al solicitante |

**Regla:** ObrasDeTeatro® actúa como intermediaria tecnológica. No gestiona ni garantiza los derechos. La responsabilidad de la negociación es exclusiva de las partes.

---

### 4.10 Mensajería interna

**Actor:** Usuario Premium+ (inicia) · Cualquier usuario autenticado (responde)  
**Estado:** Definido funcionalmente / Pendiente de implementación (Fase 4)

| Paso | Acción | Sistema |
|---|---|---|
| 1 | Usuario Premium+ visita perfil de otro usuario · pulsa "Enviar mensaje" | — |
| 2 | — | Busca hilo existente: `SELECT FROM conversations WHERE (participant_a=A AND participant_b=B) OR (participant_a=B AND participant_b=A)` |
| 3a | **Hilo existente** → navega a `/mensajes/[conversation_id]` | — |
| 3b | **Sin hilo previo** → `INSERT conversations` | UNIQUE index evita duplicados |
| 4 | Usuario escribe y envía mensaje | `INSERT messages` |
| 5 | — | Trigger `notify_on_message` → `INSERT notifications` con `type = 'message_received'` |
| 6 | — | Supabase Realtime entrega notificación en tiempo real |
| 7 | Receptor lee el mensaje | `UPDATE messages.is_read = true` |
| 8 | — | Trigger actualiza `conversations.last_message_at` |

---

## 5. Casos de uso por rol

### Actor / Actriz / Director / Dramaturgo

| Caso de uso | Plan mínimo | Estado |
|---|---|---|
| Crear y editar perfil artístico | Gratuito | ✅ |
| Buscar castings y convocatorias | Gratuito | ✅ |
| Candidatarse a un casting | Gratuito | Fase 2 |
| Publicar obras y guiones | Gratuito | Fase 2 |
| Solicitar derechos de representación | Gratuito | Fase 5 |
| Iniciar conversación con otro usuario | Premium | Fase 4 |
| Guardar favoritos | Premium | Fase 2 |
| Analizar casting con ScenaIA | Premium | Fase 5 |
| Portfolio multimedia (vídeo) | Destacado | Fase 2 |
| Perfil destacado en búsquedas | Destacado | Fase 2 |

### Compañía / Productora / Teatro / Festival / Escuela

| Caso de uso | Plan mínimo | Estado |
|---|---|---|
| Crear y editar perfil organizacional | Gratuito | ✅ |
| Publicar convocatorias (3/mes) | Gratuito | Fase 2 |
| Publicar convocatorias ilimitadas | Premium | Fase 2 |
| Publicar castings | Gratuito | Fase 2 |
| Publicar eventos | Gratuito | Fase 2 |
| Solicitar verificación de perfil | Gratuito | Fase 6 |
| Convocatorias destacadas en listados | Empresa (o pago extra Destacado) | Fase 2 |
| Venta de entradas vía sistema propio | Cualquier plan | Fase 7 |
| Analytics de perfil y publicaciones | Destacado | Fase 6 |
| Página empresarial propia | Empresa | Fase 1+ |

### Administrador (SuperAdmin / Moderador)

| Caso de uso | Rol mínimo | Estado |
|---|---|---|
| Revisar y aprobar publicaciones | Moderador | Fase 6 |
| Resolver reportes de incidencias | Moderador | Fase 6 |
| Aprobar/rechazar verificaciones | Moderador | Fase 6 |
| Ver historial de usuario | Moderador | Fase 6 |
| Suspender cuenta de usuario | SuperAdmin | Fase 6 |
| Modificar plan de suscripción | SuperAdmin | Fase 6 |
| Consultar audit_logs | SuperAdmin | Fase 6 |

---

## 6. Reglas de negocio

### 6.1 Reglas globales

| # | Regla | Documento(s) origen |
|---|---|---|
| RG-01 | Edad mínima de registro: **18 años**. Cualquier usuario que acepte los T&C declara ser mayor de edad. | Formulario Nº1, Aviso Legal, T&C |
| RG-02 | Todo contenido (casting, convocatoria, evento) pasa por **revisión editorial antes de publicarse**. No existe publicación instantánea. | Formularios Nº12/13, T&C |
| RG-03 | Plazo máximo de moderación editorial: **hasta 48 horas** desde el envío. | Formularios Nº12/13, T&C |
| RG-04 | ObrasDeTeatro® actúa como **intermediaria tecnológica**. No garantiza resultados (contrataciones, ayudas, ventas, representaciones). | Todos los formularios de publicación, Aviso Legal, T&C |
| RG-05 | La verificación de perfil **no es** garantía de solvencia, calidad ni capacidad artística. | 8 formularios organizacionales, Aviso Legal, T&C |
| RG-06 | ScenaIA es **orientativa** y no vinculante. El usuario es responsable de los derechos sobre el contenido que somete a análisis IA. | Todos los formularios con bloque ScenaIA, Aviso Legal, T&C |
| RG-07 | Pasarela de pago única declarada: **Stripe**. | Formulario Nº15, Aviso Legal |
| RG-08 | Las suscripciones se renuevan **automáticamente** cada mes hasta cancelación expresa. | Formulario Nº15, T&C |
| RG-09 | La cancelación **no genera reembolso** de períodos ya abonados, salvo normativa aplicable. | Formulario Nº15, Aviso Legal, T&C |
| RG-10 | Obras con derechos: solo información descriptiva + fragmentos autorizados. **Nunca el texto completo** en acceso público. | Formulario Nº10, Aviso Legal, T&C |
| RG-11 | La mensajería interna no tiene supervisión permanente. El usuario es **responsable de su uso**. | Aviso Legal, T&C |

### 6.2 Reglas por módulo

| Módulo | Regla |
|---|---|
| Perfiles | Slug SEO generado automáticamente. Nunca modificar tras primera publicación. |
| Perfiles | Soft delete obligatorio: `UPDATE deleted_at`. Nunca `DELETE`. |
| Perfiles | Mínimo 1 rol obligatorio por perfil. |
| Convocatorias | Usuarios Gratuito: máximo 3 convocatorias/mes. |
| Castings | `is_featured` requiere plan `featured` o `company`. |
| Obras | Si `rights_type = 'licensed'`, campo `rights_holder` obligatorio. |
| Mensajería | Solo Premium+ puede iniciar conversaciones. Gratuito puede responder. |
| Mensajería | Un único hilo A↔B (UNIQUE constraint en BD). |
| Verificación | Sin UNIQUE en `profile_id`: permite reenvíos tras rechazo. |
| Moderación | Sin SLA de tiempo para resolución de reportes (a diferencia de los 48h de publicación). |
| Tickets | `remaining = quantity - sold` (columna calculada). Trigger decrementa `sold` en reembolsos. |
| Notificaciones | Las notificaciones persisten aunque el usuario no esté conectado. |
| Audit logs | Inmutables: `INSERT` solo por `service_role`. `DELETE Prohibido`. |

### 6.3 Restricciones por plan (Tabla Definitiva v2 — Nivel 2 autoritativo)

| Restricción | Gratuito | Premium | Destacado | Empresa |
|---|---|---|---|---|
| Convocatorias publicadas | 3/mes | Ilimitadas | Ilimitadas | Ilimitadas |
| ScenaIA usos/mes | **5** | **30** | **60** | **Ilimitado** |
| Iniciar mensajes | No | Sí | Sí | Sí |
| Perfil destacado en búsquedas | No | No | Sí | Sí |
| Videos en perfil | No | No | Sí | Sí |
| Analytics | No | No | Básico | Completo |
| Convocatorias destacadas | No | No | Pago extra | Incluidas |
| Página empresarial | No | No | No | Sí |
| Badge | Básico | Premium | Premium | Verificado |

---

## 7. Integración con Arquitectura BD (Supabase v1.2)

### 7.1 Mapa módulo → tabla(s)

| Módulo funcional | Tabla(s) principal(es) |
|---|---|
| Auth | `auth.users` (Supabase nativo) |
| Perfiles | `profiles`, `profile_roles` |
| Obras y Guiones | `works`, `work_files` |
| Derechos de Representación | `work_rights_requests` |
| Castings | `castings`, `casting_applications` |
| Convocatorias | `calls` |
| Eventos | `events`, `tickets` |
| Ticketing | `ticket_orders` |
| Suscripciones / Stripe | `subscriptions` |
| Mensajería | `conversations`, `messages` |
| Notificaciones | `notifications` |
| ScenaIA | `ai_requests` |
| Verificación de Perfiles | `verification_requests` |
| Moderación / Reportes | `reports`, `audit_logs` |

**Total: 19 tablas** (referencia: ARQUITECTURA_BD_SUPABASE_v1.2, Nivel 1)

### 7.2 Storage Buckets (7)

| Bucket | Acceso | Tamaño máx. | MIME | Uso |
|---|---|---|---|---|
| `avatars` | Público | 5 MB | `image/*` | Avatares de perfil |
| `covers` | Público | 10 MB | `image/*` | Portadas de obras, eventos, castings |
| `work-files` | Privado | 50 MB | `application/pdf`, `image/*` | Textos completos de obras (URL firmada) |
| `cv-files` | Privado | 20 MB | `application/pdf` | CVs y portfolios de candidatos (URL firmada) |
| `id-documents` | Privado | 10 MB | `image/*`, `application/pdf` | Documentos de verificación de perfil |
| `event-media` | Público | 25 MB | `image/*`, `video/*` | Fotos y vídeos de eventos |
| `media-portfolios` | Privado | 500 MB | `video/mp4`, `video/webm`, `video/quicktime` | Videobooks, showreels y escenas (URL firmada, exp. 1h) |

### 7.3 Triggers activos

| Trigger | Tabla | Evento | Función | Corrección v1.1 |
|---|---|---|---|---|
| `handle_new_user` | `auth.users` | AFTER INSERT | Crea `profiles` con `username` único (sufijo incremental si colisión) | Sí — colisiones de username/slug |
| `auto_slug` | `profiles`, `works`, `castings`, `calls`, `events` | BEFORE INSERT | Genera slug SEO a partir del título usando `TG_TABLE_NAME` | Sí — usaba tabla `works` hardcodeada |
| `set_updated_at` | `profiles`, `works`, `castings`, `calls`, `events`, `subscriptions`, etc. | BEFORE UPDATE | Actualiza `updated_at = now()` | — |
| `update_ticket_sold` | `ticket_orders` | AFTER INSERT/UPDATE | Incrementa `sold` al confirmar pago; **decrementa** al procesar reembolso | Sí — no decrementaba en reembolsos |
| `notify_on_message` | `messages` | AFTER INSERT | Crea `notifications` con `type = 'message_received'` | — |
| `update_conversation_timestamp` | `messages` | AFTER INSERT | Actualiza `conversations.last_message_at` | — |

### 7.4 RLS — resumen por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Público (no eliminados) | Propietario | Propietario | Solo Admin |
| `profile_roles` | Público | Propietario | Propietario | Propietario |
| `works` | Público (publicadas) o Propietario | Propietario | Propietario | Soft delete |
| `conversations` | Participantes | Autenticado | Sistema (trigger) | Prohibido |
| `messages` | Participantes | Participantes | Receptor (marcar leído) | Prohibido |
| `notifications` | Propietario | Sistema/trigger | Propietario | Propietario |
| `audit_logs` | Solo Admin | Solo service_role | Prohibido | Prohibido |
| `verification_requests` | Propietario + Admin | Autenticado | Solo Admin | Prohibido |

---

## 8. Integración con Stripe

**Proyecto Supabase:** `pnsirwtiiurczjwrayza` (eu-west-1)  
**Variable:** `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`

### 8.1 Productos y precios

| Plan | ID lógico en BD | Precio | Renovación |
|---|---|---|---|
| Premium | `premium` | €2,99/mes | Mensual automática |
| Destacado | `featured` | €6,99/mes | Mensual automática |
| Empresa | `company` | €8,99/mes | Mensual automática |

### 8.2 Webhook — endpoint: `/api/webhooks/stripe`

| Evento Stripe | Acción en BD |
|---|---|
| `checkout.session.completed` | `INSERT subscriptions` · `UPDATE profiles.plan` · `UPDATE profiles.is_premium = true` |
| `customer.subscription.updated` | `UPDATE subscriptions.status` · Ajustar `profiles.plan` si cambió |
| `customer.subscription.deleted` | `UPDATE subscriptions.status = 'cancelled'` · `UPDATE profiles.plan = 'free'` · `UPDATE profiles.is_premium = false` |

### 8.3 Portal de cliente

Stripe Customer Portal habilitado para que los usuarios gestionen su suscripción (cancelar, cambiar plan, actualizar datos de facturación) sin código adicional.

### 8.4 Flujo de activación de plan

```
Usuario confirma pago
    → Stripe webhook checkout.session.completed
    → /api/webhooks/stripe verifica firma
    → UPDATE profiles SET plan = 'premium|featured|company', is_premium = true
    → INSERT subscriptions (stripe_subscription_id, plan, status, period_start, period_end)
    → Notificación al usuario (subscription_renewed)
```

---

## 9. Integración con ScenaIA

**Estado:** Definido funcionalmente / Pendiente de implementación (Fase 5)  
**Tabla BD:** `ai_requests`

### 9.1 Tipos de consulta (`type`)

> **Estado de migración BD:** La tabla `ai_requests` en BD v1.2 define 4 tipos originales: `matching`, `rewrite`, `summary`, `cast_suggest`. Esta especificación funcional extiende el conjunto a 9 tipos. Los 5 tipos adicionales marcados con ⚠️ requieren una migración de BD antes de la implementación de Fase 5 para ampliar el campo `type` (añadir a CHECK constraint o cambiar a enum).  
> **Migración requerida:** `ALTER TABLE ai_requests DROP CONSTRAINT IF EXISTS ai_requests_type_check; ALTER TABLE ai_requests ADD CONSTRAINT ai_requests_type_check CHECK (type IN ('matching','rewrite','summary','cast_suggest','bio_basic','text_generation','recommendations','monologue_gen','dossier_gen'));`

| Tipo | Descripción | Plan mínimo | Estado BD |
|---|---|---|---|
| `cast_suggest` | Análisis de casting (matching de perfil con roles buscados) | Premium | ✅ En BD v1.2 |
| `matching` | Matching avanzado de perfiles con proyectos | Destacado+ | ✅ En BD v1.2 |
| `rewrite` | Reescritura y mejora de textos | Destacado+ | ✅ En BD v1.2 |
| `summary` | Resumen y síntesis de obras o proyectos | Premium+ | ✅ En BD v1.2 |
| `bio_basic` | Bio artística básica | Gratuito | ⚠️ Pendiente migración |
| `text_generation` | Generador de textos simple | Gratuito | ⚠️ Pendiente migración |
| `recommendations` | Recomendaciones básicas | Gratuito | ⚠️ Pendiente migración |
| `monologue_gen` | Generador de monólogos | Premium | ⚠️ Pendiente migración |
| `dossier_gen` | Generador de dossier artístico | Premium | ⚠️ Pendiente migración |

### 9.2 Cuotas mensuales por plan (fuente autoritativa: Tabla Definitiva v2)

| Plan | Usos/mes | Control |
|---|---|---|
| Gratuito | 5 | Contar `ai_requests` del mes actual por `profile_id` |
| Premium | 30 | Ídem |
| Destacado | 60 | Ídem |
| Empresa | Ilimitado | Sin control de cuota |

### 9.3 Modelo de consentimiento

Cada formulario funcional que integra ScenaIA incluye un bloque de checkboxes de consentimiento/activación. El usuario decide explícitamente qué datos autoriza a procesar con IA.

### 9.4 Regla legal

ScenaIA es orientativa y no vinculante. El usuario es **responsable de los derechos** sobre el contenido que somete a análisis. ObrasDeTeatro® no garantiza la exactitud de los resultados (RG-06).

### 9.5 Almacenamiento

Cada consulta se registra en `ai_requests` con: `profile_id`, `type`, `input`, `output`, `tokens_used`, `created_at`. El historial es accesible al usuario y a SuperAdmin.

---

## 10. Backoffice / Panel de Administración

**Estado:** Definido funcionalmente / Pendiente de implementación (Fase 6)

### 10.1 Módulos del backoffice

| Módulo | Moderador | SuperAdmin | Tabla(s) |
|---|---|---|---|
| Cola de moderación | ✅ | ✅ | `castings`, `calls`, `events` (`is_published = false`) |
| Gestión de reportes | ✅ | ✅ | `reports` |
| Verificaciones pendientes | ✅ | ✅ | `verification_requests` |
| Gestión de usuarios | Solo lectura | ✅ CRUD | `profiles`, `profile_roles` |
| Gestión de suscripciones | Solo lectura | ✅ | `subscriptions` |
| Registro de auditoría | Solo propio | ✅ completo | `audit_logs` |
| Configuración del sistema | — | ✅ | — |

### 10.2 Flujo de moderación de contenido (backoffice)

```
Cola de moderación muestra:
    castings/calls/events con is_published = false y deleted_at IS NULL

Moderador revisa:
    → Aprueba: UPDATE is_published = true
               INSERT audit_logs (action: 'content_approved', target_type, target_id)
               INSERT notifications (type: 'event_published' al organizador)

    → Rechaza: No cambia is_published
               INSERT audit_logs (action: 'content_rejected')
               Notificación al organizador con motivo
```

### 10.3 Audit Log — acciones registradas

| Acción | Actor | Cuándo |
|---|---|---|
| `profile_verified` | Moderador/SuperAdmin | Al aprobar verificación |
| `profile_banned` | SuperAdmin | Al suspender cuenta |
| `report_resolved` | Moderador/SuperAdmin | Al resolver incidencia |
| `content_approved` | Moderador/SuperAdmin | Al aprobar publicación |
| `content_rejected` | Moderador/SuperAdmin | Al rechazar publicación |
| `subscription_cancelled` | Sistema (Stripe webhook) | Al cancelar suscripción |
| `rights_approved` | Sistema (autor) | Al aprobar derechos |
| `admin_login` | SuperAdmin | Al acceder al backoffice |

Cada entrada en `audit_logs` es **inmutable** (solo `INSERT` vía `service_role`). Incluye `actor_id`, `action`, `target_type`, `target_id`, `metadata` (JSON), `ip_address` y `created_at`.

---

## 11. Matrices de trazabilidad

### 11.1 Roles → módulos accesibles

| Módulo | anon | authenticated | Premium+ | Destacado+ | Empresa | Moderador | SuperAdmin |
|---|---|---|---|---|---|---|---|
| Ver perfiles/directorio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear/editar perfil | — | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Publicar contenido | — | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Candidatarse a casting | — | ✅ | ✅ | ✅ | ✅ | — | — |
| Iniciar mensajes | — | — | ✅ | ✅ | ✅ | — | — |
| Responder mensajes | — | ✅ | ✅ | ✅ | ✅ | — | — |
| ScenaIA (básica) | — | ✅ (5/mes) | ✅ | ✅ | ✅ | — | — |
| ScenaIA (análisis/monólogo) | — | — | ✅ | ✅ | ✅ | — | — |
| Perfil destacado búsqueda | — | — | — | ✅ | ✅ | — | — |
| Analytics | — | — | — | Básico | Completo | — | ✅ |
| Moderación de contenido | — | — | — | — | — | ✅ | ✅ |
| Gestión de usuarios | — | — | — | — | — | Solo lectura | ✅ |
| Audit logs | — | — | — | — | — | — | ✅ |

### 11.2 Módulos → tablas BD

| Módulo | Tablas |
|---|---|
| Auth | `auth.users`, `profiles`, `profile_roles` |
| Perfiles | `profiles`, `profile_roles` |
| Obras | `works`, `work_files` |
| Derechos | `work_rights_requests` |
| Castings | `castings`, `casting_applications` |
| Convocatorias | `calls` |
| Eventos | `events`, `tickets` |
| Ticketing | `ticket_orders` |
| Suscripciones | `subscriptions` |
| Mensajería | `conversations`, `messages` |
| Notificaciones | `notifications` |
| ScenaIA | `ai_requests` |
| Verificación | `verification_requests` |
| Moderación | `reports`, `audit_logs` |

### 11.3 Módulos → fase de implementación

| Módulo | Fase | Estado actual |
|---|---|---|
| Auth | Fase 1 | ✅ Completado |
| Perfiles (8 roles) | Fase 1 | ✅ Completado |
| Obras, Castings, Convocatorias, Eventos, Buscador | Fase 2 | Pendiente |
| Suscripciones / Stripe | Fase 3 | Stripe configurado · implementación pendiente |
| Mensajería / Notificaciones | Fase 4 | Pendiente |
| ScenaIA / Derechos de Representación | Fase 5 | Pendiente |
| Verificación / Panel Admin / Moderación | Fase 6 | Pendiente |
| Ticketing / Legal / RGPD | Fase 7 (Beta) | Pendiente |
| Lanzamiento público | Fase 8 | Pendiente |

### 11.4 Documentos fuente por sección de este documento

| Sección | Fuente primaria | Nivel |
|---|---|---|
| Roles de usuario (§1.1–1.2) | Formularios Nº1–9, Informe Auditoría | 2 / 4 |
| Roles administrativos (§1.3) | Decisión arquitectónica (este documento) | 5 |
| Matriz de permisos (§2.1) | Formularios funcionales (sección "Funcionalidades Disponibles") | 2 |
| Funcionalidades por plan (§2.2) | Tabla Definitiva de Planes v2 | 2 |
| Módulos funcionales (§3) | Formularios + Informe Auditoría + BD v1.2 | 2 / 4 / 1 |
| Flujos (§4) | Informe Auditoría Funcional (reconstruidos) | 4 |
| Reglas de negocio (§6) | Formularios + Políticas + T&C | 2 |
| Integración BD (§7) | ARQUITECTURA_BD_SUPABASE_v1.2 | 1 |
| Integración Stripe (§8) | FASE_0_PLAN_EJECUCION_v1.1 + Formulario Nº15 | 3 / 2 |
| ScenaIA (§9) | Tabla Definitiva de Planes v2 + Formularios con bloque ScenaIA | 2 |
| Backoffice (§10) | Decisión arquitectónica + Informe Auditoría | 5 / 4 |

---

## 12. Huecos y elementos pendientes de definición

Los siguientes elementos están **identificados** pero **no completamente especificados**. Deben resolverse antes de iniciar la fase correspondiente.

| # | Elemento | Bloquea | Prioridad |
|---|---|---|---|
| H-01 | 3 roles sin formulario (Institución Pública, Profesional Artes Escénicas, Público General): campos de perfil, permisos exactos y experiencia de navegación | Onboarding completo · Directorio unificado | Media |
| H-02 | Especificación técnica de ScenaIA: arquitectura del motor IA, prompts base, modelo, latencia esperada | Fase 5 | Alta |
| H-03 | Flujo de mensajería: moderación proactiva (si se implementa), límites de mensajes, gestión de spam | Fase 4 | Media |
| H-04 | Especificación de búsqueda/directorio: algoritmo de matching, ponderación de campos, idiomas indexados | Fase 2 | Alta |
| H-05 | SLA de resolución de incidencias (actualmente sin plazo, a diferencia de los 48h de moderación) | Fase 6 | Baja |
| H-06 | Flujo de venta de entradas: integración con Stripe Checkout para ticketing, gestión de aforo, PDF de entrada | Fase 7 | Media |
| H-07 | `obrasdeteatro_modelo_v2.html`: mencionado en Informe Auditoría como fuente de especificación de interfaz. Pendiente de localizar y revisar | Arquitectura UI | Baja |

**Huecos resueltos en esta versión (v2.0 — 2026-06-19):**

| ID | Descripción | Resolución |
|---|---|---|
| ~~H-08~~ | Favoritos sin tabla BD | Declarado: tabla `favorites` en migración futura Fase 2+. Ver §2.2 nota ¹. |
| ~~H-09~~ | Admin roles en `profile_roles` | Resuelto: roles admin usan `auth.users.app_metadata`, no `profile_roles`. Ver §1.3. |
| ~~H-10~~ | `call` no reportable en BD | Resuelto: `call` añadido a `target_type`. Migración pendiente Fase 6. Ver §3.13. |
| ~~H-11~~ | Política de moderación de Obras | Resuelto: obras NO requieren revisión 48h. Los autores autopublican. Véase que `is_published` en `works` lo gestiona el propio autor, a diferencia de castings/convocatorias/eventos. |
| ~~H-12~~ | Tipos de notificación para aprobación de contenido | Resuelto: aprobación de castings y convocatorias usa `type = 'system_notification'`. Solo eventos usan `event_published`. El backoffice distingue por `reference_type`. |

---

---

**ARQUITECTURA FUNCIONAL OBRASDETEATRO® v2.0 — ✅ CONGELADO**  
Emitido: 2026-06-19 · Congelado: 2026-06-19 · CONECTA PLUS GLOBAL, S.L.U. · Team Show Producciones  
Supersede a: `Informe_Auditoria_Funcional_ObrasDeTeatro.docx` y `ARQUITECTURA_FUNCIONAL_OBRASDETEATRO v1.0` (no localizada).  
Próxima revisión: v2.1 — ante cambios de producto, resolución de huecos pendientes en §12, o inicio de Fase 5+.
