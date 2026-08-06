# ACTA DE CIERRE OFICIAL — P-017
## Adaptador de Entrada: Conexión de la Aplicación con el SPO

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** Ninguna — integración de capa de aplicación, no un componente de ScenaIA (ver Sección 2)
**Estado anterior:** Verificación documental de P-017 confirmada; Plan Técnico revisado con tres ajustes de redacción de la Dirección
**Estado resultante:** IMPLEMENTADO · VALIDADO · CERRADO

---

### 1. Objeto del Acta

Certifica la finalización de P-017: la primera ruta HTTP real que conecta una petición de usuario autenticado con `processRequest()` (SPO), resolviendo el síntoma que originalmente motivó P-006 en el Corte de Control del 2026-07-18 — desde ahora, ScenaIA puede responder a una petición real, no solo a datos de prueba en tests unitarios.

### 2. Naturaleza del componente — no forma parte del inventario de ScenaIA

Conforme al Plan Técnico ya confirmado: **la ruta actúa exclusivamente como Adaptador de Entrada (Input Adapter). No forma parte del Núcleo ScenaIA.** Su única responsabilidad consiste en adaptar el protocolo HTTP al contrato público `processRequest()`. No contiene lógica funcional, decisiones de negocio, ni responsabilidades propias del SPO o de los componentes especializados que este coordina. Por esta razón no se le asigna Fase del Plan Maestro ni se añade al inventario de Servicios de Plataforma/Dominios Funcionales/Núcleo — es infraestructura de aplicación, con su propio límite documentado explícitamente.

### 3. Alcance implementado

**`app/api/scenaia/route.ts`** — `POST`, secuencia Autenticación → Traducción → `processRequest()` → Respuesta:

1. Verifica sesión real vía `supabase.auth.getUser()` (mismo patrón ya existente y en uso en `app/perfil/*`) — sin sesión, responde `401` sin invocar al SPO.
2. Valida que el cuerpo de la petición contenga `message: string` — sin él, responde `400`.
3. Invoca `processRequest(user.id, { route: null, module: null, locale: 'es' }, message)` — sin transformar, filtrar ni reinterpretar ninguno de los tres parámetros.
4. Devuelve el `ResponseContext` producido, tal cual, como cuerpo JSON de la respuesta — `200`.
5. Cualquier fallo no capturado dentro de `processRequest()` se captura genéricamente en el borde de la aplicación y responde `500`, sin inspeccionar su causa (higiene estándar de endpoint, no lógica funcional).

### 4. Tres ajustes de redacción de la Dirección, incorporados literalmente en el código

1. **Locale por defecto:** documentado en el propio comentario del código — *"Mientras la aplicación no disponga de una fuente documental para determinar el locale de la petición, la integración utiliza el valor por defecto 'es'. Esta decisión pertenece exclusivamente a la capa de aplicación y podrá sustituirse por una fuente real sin modificar el contrato público `processRequest()`."*
2. **Nombre del campo HTTP:** *"Se adopta provisionalmente el campo `message` como representación textual de `originalRequest`, al no existir todavía una interfaz cliente que defina dicho contrato HTTP."*
3. **Naturaleza de Adaptador de Entrada:** cabecera de comentario del propio archivo, con el texto exacto propuesto por la Dirección (Sección 2 de esta Acta).

### 5. Hallazgos detectados durante la implementación

Ninguno. El diseño ya validado en el Plan Técnico se materializó sin desviaciones.

### 6. Pruebas realizadas

- 252/252 pruebas superadas (64 archivos, 1 nuevo): `app/api/scenaia/__tests__/route.test.ts` — 401 sin sesión (sin invocar al SPO), 400 sin `message` (sin invocar al SPO), invocación correcta de `processRequest` con los tres parámetros exactos, propagación sin transformar del `ResponseContext`, 500 ante excepción no capturada.
- `tsc --noEmit` limpio. `eslint` sin errores ni warnings nuevos.
- Primera vez que se prueba un route handler en este repositorio — sin infraestructura de test previa para `app/`; se siguió el mismo patrón de mocking ya usado en `lib/` (mock de `createClient` y de `processRequest`), sin necesitar infraestructura nueva.

### 7. Revisión obligatoria del Registro de Pendientes Arquitectónicos

1. **¿Se ha cerrado algún pendiente existente?** Sí — **P-017 queda RESUELTO.** ScenaIA tiene, por primera vez, un punto de entrada real que invoca el SPO con una sesión de usuario auténtica.
2. **¿Ha aparecido algún pendiente nuevo?** No. Los dos valores por defecto documentados (locale, nombre del campo `message`) son decisiones de integración ya explícitamente marcadas como sustituibles sin tocar ningún contrato — no constituyen una incidencia arquitectónica ni un vacío pendiente de resolución; son el comportamiento intencional de esta versión.

`docs/auditoria/REGISTRO_PENDIENTES_ARQUITECTONICOS.md` actualizado como parte de este cierre.

### 8. Veredicto

P-017 queda oficialmente **RESUELTO · IMPLEMENTADO · VALIDADO · CERRADO**. ScenaIA, por primera vez desde el inicio del Bloque III, puede procesar una petición real de un usuario autenticado de principio a fin — Request Interpreter → PCE → SKM → Decision Engine → Credit Manager → AI Gateway → Response Composer, con registro de actividad y de auditoría técnica — sin que ningún componente del Núcleo, el SPO, Analítica o Telemetría hayan requerido ninguna modificación.

### 9. Autorización para continuar

Con P-006 y P-017 resueltos, **el único pendiente que sigue bloqueando el cierre del Bloque III es P-011** (R-02, primer contrato implementable de Subsistemas de Aprendizaje, prerrequisito de Fase E). Queda a criterio de la Dirección: abordar Fase E, o realizar un nuevo Corte de Control antes de continuar.
