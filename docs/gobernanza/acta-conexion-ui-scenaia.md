# ACTA — Conexión de la interfaz existente con el flujo verificado

**Fecha:** 2026-07-19

---

### Diagnóstico

Verificado contra el código real (`app/perfil/centro/page.tsx`, "Módulo VI · ScenaIA"): la tarjeta era un `<div>` estático, sin `onClick`, `href` ni manejador de evento — **Opción 1 de las planteadas: componente únicamente visual, sin comportamiento asociado**, heredado de PP2-E.3A (Centro Profesional MVP), meses anterior a todo Bloque III. No es una incidencia de conexión rota (Opción 2) ni un fallo de ejecución de evento (Opción 3) — nunca hubo comportamiento que conectar hasta ahora.

### Conexión mínima realizada

- **`app/perfil/centro/page.tsx`** — la tarjeta pasa de `<div>` a `<Link href="/scenaia">`, mismo estilo visual, con una llamada a la acción añadida ("Probar ScenaIA →"). Único cambio funcional en este archivo.
- **`app/scenaia/page.tsx`** (nuevo) — Server Component, mismo patrón de autenticación ya usado en el resto de la aplicación (`supabase.auth.getUser()` + `redirect` si no hay sesión), mismo shell visual (`NavAutenticado` + `Sidebar`).
- **`app/scenaia/ScenaiaClient.tsx`** (nuevo) — Client Component mínimo: un formulario (textarea + botón), `fetch('/api/scenaia-verified', ...)` ya implementado y cerrado, muestra `responseType`/`responseContent` de la respuesta.

**Nada de esto modifica el Orquestador, el Núcleo ni ningún contrato ya cerrado** — es exclusivamente capa de interfaz, consumiendo la ruta HTTP que ya existía y estaba probada.

### Validación

`tsc --noEmit` limpio, build real de Next.js exitoso (`/scenaia` aparece como nueva ruta dinámica), 240/240 pruebas sin regresiones — verificado con el mismo método ya usado para el commit anterior (Conjunto B/C apartado temporalmente vía `git stash --keep-index`, restaurado íntegro después).

### Estado

Cambios listos para comitear sobre `scenaia-bloque-3` y publicar en el mismo Preview ya operativo.
