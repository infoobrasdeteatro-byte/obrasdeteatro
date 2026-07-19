# ACTA DE CIERRE OFICIAL DE COMPONENTE (AMPLIACIÓN ADITIVA)
## Procesos Asíncronos (Servicio de Plataforma) — v3

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** C — Asíncrono
**Componente:** Procesos Asíncronos — **v3, ampliación aditiva sobre v2**
**Estado anterior:** v2 (alcance completo: `recordActivity`, `listPendingActivity`, `markActivityProcessed`) cerrado 2026-07-17
**Estado resultante:** IMPLEMENTADO · VALIDADO · CERRADO (v2 + `listActivityHistory`)

---

### 1. Objeto del Acta

Certifica la incorporación de `listActivityHistory()` como segunda capacidad pública de lectura de Procesos Asíncronos, surgida durante el diseño del Plan Técnico de Mi Trayectoria®: la semántica de cola (`listPendingActivity`, solo actividad no procesada) es insuficiente para construir una trayectoria histórica, porque `markActivityProcessed` retira cada elemento de la cola tras procesarlo. Se requiere una segunda operación de lectura, no destructiva, con semántica de historial.

Precisión de la Dirección, incorporada a este cierre: `listActivityHistory()` no se entiende como una ampliación realizada "para" Mi Trayectoria®, sino como una segunda capacidad pública del propio Servicio de Plataforma. Mi Trayectoria® es simplemente su primer consumidor.

### 2. Alcance añadido sobre la v2

- **Repository Layer** (`lib/repository-layer/activity-log.ts`, mismo archivo, ampliado): `listActivityHistory(profileId, limit = 50)` — toda la actividad del perfil, procesada o no, en orden cronológico ascendente (`occurred_at ASC`). Reutiliza la política RLS de `SELECT` ya existente ("Ver actividad propia"), que nunca restringió por `processed_at` — **sin migración nueva**. Se extrae `toActivityLogEntry()` como función compartida entre `listPendingActivity` y `listActivityHistory` para evitar duplicación.
- **Renombrado de tipo**: `PendingActivityRecord` → `ActivityLogEntry` en Repository Layer, y `PendingActivity` → `ActivityLogEntry` en Procesos Asíncronos — el tipo pasa a documentarse como compartido por ambas operaciones de lectura, no exclusivo de la semántica de cola.
- **Módulo `lib/procesos-asincronos/`**: `listActivityHistory()`, wrapper delgado sobre Repository Layer, mismo patrón de propagación de errores que `listPendingActivity()` (puede lanzar; fuera de la ruta crítica del Núcleo). Se extrae `narrow-entry.ts` (`narrowActivityLogEntry`) como helper compartido entre ambos wrappers de lectura, para no duplicar el estrechamiento de `responseType: string → ResponseType` ya justificado en la v2.

### 3. Hallazgos detectados durante la implementación

Ninguno nuevo. El estrechamiento de tipos y el manejo de `profile_id` nulo ya quedaron resueltos y documentados en la v2 (§3.1–3.2); `listActivityHistory()` reutiliza exactamente esa misma solución vía las funciones ya extraídas.

No se asigna numeración RA-xxx.

### 4. Pruebas realizadas

- 184 pruebas superadas en 49 archivos (todas las preexistentes sin regresiones + `activity-log.test.ts` ampliado con el caso de `listActivityHistory`, verificando explícitamente que `.is('processed_at', null)` **no** se invoca — distinción operativa entre semántica de cola y de historial — y `list-activity-history.test.ts`, nuevo, en Procesos Asíncronos).
- `contract-invariants.test.ts` de ambos módulos revisado y ampliado: Repository Layer sigue exponiendo exactamente una inserción y una actualización (la nueva lectura no añade mutaciones); Procesos Asíncronos incorpora `list-activity-history.ts` y `narrow-entry.ts` a su barrido de invariantes (sin acceso directo a Supabase, sin dependencia funcional del Núcleo).
- `tsc --noEmit` limpio. `eslint` sin errores (solo warnings preexistentes en `test-utils.ts`, parámetros de mocks intencionalmente sin usar).

### 5. Incidencias y validaciones abiertas asociadas

Ninguna.

### 6. Veredicto

Procesos Asíncronos queda oficialmente declarado **IMPLEMENTADO · VALIDADO · CERRADO**, con dos capacidades públicas de lectura independientes (`listPendingActivity` — cola; `listActivityHistory` — historial), además de `recordActivity` y `markActivityProcessed`.

### 7. Autorización para continuar

Mi Trayectoria® puede construir su interpretación de la evolución profesional consumiendo `listActivityHistory()`, sin riesgo de pérdida de datos por el ciclo de procesamiento de la cola. Queda autorizada la implementación de `lib/mi-trayectoria/` conforme al Plan Técnico y a la especificación Fase 1 ya congelada, incorporando la nota de alcance real: la representación construida es una interpretación basada en la evidencia actualmente disponible en ScenaIA, no la totalidad de la trayectoria profesional del usuario.
