# UX-012 — Pulido del Flujo de Extinción de Identidad

**Expediente:** UX-012, complementario de AEC-003B — no constituye un dominio funcional propio ni un expediente independiente de la arquitectura de cuenta.
**Ámbito:** capa de presentación exclusivamente, sobre el Evento Arquitectónico Atómico ya implementado y auditado en AEC-003B.
**Explícitamente fuera de ámbito:** el orquestador (`/api/cuenta/eliminar/ejecutar`), el Núcleo de ScenaIA, cualquier API o migración.
**Estado:** CERRADO FUNCIONALMENTE.

---

## Acta Oficial de Cierre — UX-012

**Fecha:** 2026-08-06
**Expediente:** UX-012 — Pulido del flujo de extinción de identidad
**Estado final:** CERRADO FUNCIONALMENTE

**Nota de alcance y naturaleza del expediente:** UX-012 **no es un expediente independiente de la arquitectura de cuenta** — es un expediente complementario de **AEC-003B**, limitado exclusivamente a la capa de presentación del Evento Arquitectónico Atómico ya implementado y auditado en ese expediente. No introduce ningún dominio funcional propio; existe únicamente porque, durante la validación funcional de AEC-003B, se detectó que el orquestador (`/api/cuenta/eliminar/ejecutar`) no tenía punto de entrada visible desde la interfaz, ni existía un mensaje específico al intentar iniciar sesión con una identidad ya extinguida.

### Objetivo del expediente

Pulir la experiencia de usuario alrededor del Evento Arquitectónico Atómico de AEC-003B, sin modificar en absoluto el orquestador, el Núcleo, las APIs ni las migraciones — dos frentes concretos:
- **UX-001:** cierre de sesión y redirección tras una extinción correcta.
- **UX-002:** mensaje específico al intentar iniciar sesión con una identidad ya extinguida, en vez del mensaje genérico de error.

### Alcance implementado

Exactamente el aprobado, sin ampliación:
- **UX-001:** `PrepararExtincionPanel.tsx` mantiene visible el mensaje de éxito ya existente ("Tu identidad ha sido extinguida...") durante 3 segundos, ejecuta `supabase.auth.signOut()` (cliente de navegador) y redirige a `/auth/login` — reutilizando el flujo de autenticación existente, sin ninguna ruta ni pantalla nueva.
- **UX-002:** `lib/auth-errors.ts` distingue el código tipado `user_banned` de GoTrue (verificado contra el SDK real instalado, no asumido) para mostrar "No ha sido posible iniciar sesión con esta cuenta." — texto aprobado expresamente por Dirección por no revelar si la cuenta existe, fue eliminada o suspendida. `app/auth/login/page.tsx` pasa `error.code` a `translateAuthError`.

### Decisiones arquitectónicas

- **Reutilización deliberada de patrones ya existentes**, sin inventar mecanismos nuevos: el `signOut()` sigue el mismo patrón ya usado en `SesionesPanel.tsx`; el destino de redirección (`/auth/login`) es el mismo ya usado por el logout existente — decisión explícita de no crear una pantalla de confirmación dedicada.
- **Verificación previa a la implementación, no asunción:** antes de escribir código, se comprobó directamente en `node_modules/@supabase/auth-js` (`error-codes.ts`, `fetch.ts`/`handleError`) que `user_banned` es un código oficial y tipado, propagado desde cualquier intento de autenticación —incluido `signInWithPassword`— y no exclusivo de endpoints de administración. Misma disciplina de verificación ya aplicada en AEC-003B para `admin.signOut`.
- **Extensión retrocompatible de `translateAuthError`**: se añade `code` como segundo parámetro opcional, comprobado antes que el mapeo por texto — ningún llamador existente se ve afectado.

### Validaciones realizadas

- Worktree limpio desde `scenaia-bloque-3` (`67eb16a`), con exclusivamente los tres archivos del expediente.
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 86/86 archivos, 422/422 pruebas en verde, sin regresión.
- `npm run build`: correcto, 40/40 rutas.
- Núcleo de ScenaIA: sin cambios, verificado.

### Evidencia de finalización

- Commit `2be9bdf` en `scenaia-bloque-3`, fast-forward a `develop`, push a `origin/develop` confirmado.
- Preview Deployment (`dpl_8FHMb55bkXonojRYb76QDcygX8cg`) verificado en estado `READY`, con el SHA del commit coincidente confirmado directamente en el metadato de Vercel.

### Relación con el resto de la arquitectura

UX-012 no crea superficie arquitectónica propia: opera enteramente dentro del componente y el flujo ya aprobados por AEC-003B (`PrepararExtincionPanel.tsx`, `/auth/login`). Su cierre está funcionalmente subordinado al de AEC-003B — es, en la práctica, la última pieza de experiencia de usuario que ese expediente necesitaba antes de poder considerarse íntegramente terminado de cara al usuario real.

### Estado final del expediente

Implementado y validado. Desplegado en `develop`/`scenaia-bloque-3` (respaldado en `origin`). No desplegado en `main`/producción.

### Observaciones documentales

- Hasta este Acta, UX-012 no contaba con documento propio en `docs/gobernanza/` — su diseño se aprobó y ejecutó íntegramente dentro de la conversación, sin un expediente de gobernanza escrito antes de este cierre. Se deja constancia de ello, no como incidencia sino como hecho a registrar.

### Observaciones operativas

**Validación funcional de extremo a extremo — completada.** Confirmado por Dirección Técnica durante la revisión del Preview correspondiente a UX-012:
- Confirmación de la extinción: el Evento Arquitectónico Atómico se ejecutó correctamente sobre la cuenta de pruebas.
- Cierre automático de sesión: verificado tras los 3 segundos de mensaje de éxito, sin intervención manual.
- Redirección a `/auth/login`: verificada como destino final del cierre automático.
- Comportamiento correcto al reintentar iniciar sesión con la identidad ya extinguida: el mensaje mostrado fue "No ha sido posible iniciar sesión con esta cuenta.", confirmando el funcionamiento de UX-002 en conjunto con UX-001.

Sin observaciones operativas pendientes.

### Declaración de cierre

**El expediente UX-012 queda CERRADO FUNCIONALMENTE en `develop`/`scenaia-bloque-3`**, como expediente complementario de AEC-003B, sin alcance ni dominio propio distinto del ya aprobado en ese expediente. La validación funcional de extremo a extremo queda incorporada como evidencia del expediente, sin observaciones pendientes.
