# Home — "El Pulso del Ecosistema"

**Expediente:** Rediseño de la Home pública — bloque "El pulso del ecosistema teatral hispano"
**Ámbito:** `app/page.tsx`, `app/globals.css`, `components/homepage/` (marketing público, sin sesión).
**Explícitamente fuera de ámbito:** Núcleo de ScenaIA, autenticación, ScenaIA real, Repository Layer.
**Estado:** CERRADO FUNCIONALMENTE.

---

## Acta Oficial de Cierre — Home: "El Pulso del Ecosistema"

**Fecha:** 2026-08-06
**Expediente:** Rediseño de la Home pública — bloque "El pulso del ecosistema teatral hispano"
**Estado final:** CERRADO FUNCIONALMENTE

### 1. Contexto

Antes de este expediente, la home pública (`app/page.tsx`) constaba de tres secciones: el hero ("El ecosistema digital del teatro en español"), la sección narrativa de tres recuadros (Directorio profesional / Convocatorias en tiempo real / ScenaIA), y una sección de precios ("Encuentra tu plan") situada justo antes del footer, con los cuatro planes replicados de la página `/precios`.

El objetivo del rediseño fue añadir un nuevo bloque visual — "El pulso del ecosistema teatral hispano" — a partir de un archivo de referencia de diseño aportado por Dirección, y retirar de la home la sección de precios, por resultar redundante con la página `/precios` ya existente, donde esa información ya vive de forma completa.

### 2. Objetivos arquitectónicos

- Separar con claridad la zona pública de marketing (hero, narrativa) de un nuevo bloque de vista previa visual del ecosistema, sin mezclar ambos registros de contenido.
- Reforzar la propuesta de valor de la home mostrando, de forma tangible aunque todavía estática, la actividad real que el ecosistema puede llegar a mostrar (obras destacadas, convocatorias, comunidad, ScenaIA).
- Mejorar la narrativa de entrada, sustituyendo un bloque de precios —información transaccional— por un bloque que comunica la naturaleza y el alcance del propio ecosistema.
- Preparar la evolución futura de la home dejando una estructura de componentes ya separada y nombrada (`components/homepage/`), lista para conectarse a datos reales de Supabase en un expediente posterior, sin necesidad de rehacer el trabajo visual ya aprobado.

### 3. Alcance implementado

- **Hero:** sin ninguna modificación. Verificado mediante diff línea a línea del commit — ni una sola línea del hero aparece alterada.
- **Sección narrativa (3 recuadros):** sin ninguna modificación, por el mismo motivo.
- **Eliminación de precios:** retirada la sección completa "Encuentra tu plan" de `app/page.tsx` (incluida la importación de `PLANES`, ya sin uso en este archivo).
- **Nuevo bloque:** `EcosistemaPulso` y sus ocho componentes asociados (`components/homepage/`) — sidebar decorativo (sin navegación real), estadísticas del ecosistema, obras destacadas, convocatorias, mapa de la comunidad hispana, y una tarjeta de ScenaIA deliberadamente decorativa, sin simular ninguna respuesta real: cualquier interacción invita a registro o inicio de sesión, en vez de fingir una conversación con el ScenaIA real (protegido por sesión y créditos del Núcleo).
- **Cambios visuales:** tipografía e iconos alineados con lo ya usado en el resto del proyecto (Newsreader/IBM Plex Sans, SVGs inline) en lugar de los del archivo de referencia (DM Serif Display/DM Sans, Tabler Icons), por decisión expresa de Dirección para mantener coherencia con el hero y la narrativa ya existentes.
- **Cambios estructurales:** todo el CSS nuevo vive bajo un espacio de nombres propio (`.eco-*`), deliberadamente desacoplado de las clases reales del dashboard autenticado (`.stat-card`, `.sidebar`) y de la interfaz real de ScenaIA (`.scenaia-*`), para no generar ninguna dependencia visual cruzada con el resto de la aplicación.
- **Datos:** exclusivamente estáticos. No se ha creado ninguna conexión real a Supabase ni a ningún otro origen de datos — así se documentó y aprobó desde el diseño inicial del bloque.

No se ha añadido ninguna funcionalidad más allá de lo aquí descrito.

### 4. Validaciones realizadas

- **Build y tipos:** las validaciones técnicas se realizaron sobre un entorno de trabajo limpio correspondiente al expediente, manteniendo separado el Incidente de Trazabilidad (Conjunto B), cuya resolución seguía un expediente independiente — `tsc --noEmit` sin errores, `vitest run` en verde, `npm run build` correcto, 40/40 rutas.
- **Auditoría de integridad**, solicitada expresamente por Dirección antes de la revisión visual: confirmado el alcance exacto de archivos modificados, aislamiento total del CSS nuevo (verificado por grep, sin colisión con ninguna clase real), hero/narrativa/footer/navegación intactos (confirmado por diff), y ausencia de cambios en rutas sensibles (`/dashboard`, `/precios`, `/auth/*`, componentes reales de Sidebar/TopNav).
- **Auditoría visual y aprobación expresa de Dirección Técnica:** confirmada explícitamente — "He revisado el preview en local y apruebo el diseño visual del bloque 'El pulso del ecosistema teatral hispano'. Queda tal como lo quería."

### 5. Relación con la arquitectura

Este expediente es completamente independiente del resto de la Arquitectura Oficial:
- No afecta al Núcleo de ScenaIA — ningún archivo de `lib/` correspondiente a sus siete componentes fue tocado.
- No afecta a la autenticación — ningún archivo de `app/auth/` ni de `middleware.ts` fue tocado.
- No afecta al ScenaIA real — la tarjeta incluida en el bloque es puramente decorativa y no invoca en ningún caso `/api/scenaia-verified` ni ningún otro endpoint real; cualquier interacción redirige a registro/login.
- No afecta a Repository Layer — no se realiza ninguna consulta a Supabase desde ningún componente de este bloque.

### 6. Estado final

- **`scenaia-bloque-3`:** contiene el commit de este expediente (`199319a`), respaldado en `origin/scenaia-bloque-3`.
- **`develop`:** **no contiene este commit** — a diferencia del resto de expedientes cerrados en esta sesión, Home nunca se fast-forward a `develop`. Es una diferencia real respecto al patrón habitual, que registro aquí como hecho, no como omisión resuelta. Esta diferencia responde únicamente a la estrategia de ramas vigente durante el desarrollo del expediente y no altera su estado funcional ni documental.
- **`main`/producción:** no desplegado, sin autorización solicitada ni concedida.

### 7. Observaciones

- **Documental:** este expediente no contaba, hasta ahora, con ningún documento propio en `docs/gobernanza/` — su diseño y aprobación se gestionaron íntegramente dentro de la conversación, sin registro escrito previo a esta Acta.
- **Operativa:** la validación visual oficial del expediente se realizó sobre el entorno local de desarrollo aprobado por Dirección Técnica. No fue necesario generar un Preview Deployment específico para considerar completada la revisión visual. El commit permanece únicamente en `scenaia-bloque-3`, no en `develop`. Si se desea que este bloque esté disponible en el mismo Preview compartido que el resto de expedientes recientes, haría falta un fast-forward explícito de `develop`, todavía no solicitado ni autorizado.

### Declaración Oficial de Cierre

**El expediente Home — "El Pulso del Ecosistema" queda CERRADO FUNCIONALMENTE en `scenaia-bloque-3`**, con el bloque visual implementado exactamente según lo aprobado, validado técnicamente y auditado visualmente con aprobación expresa de Dirección Técnica. Las observaciones registradas (ausencia de Preview Deployment específico, ausencia en `develop`) no se consideran bloqueantes para este cierre, salvo que Dirección determine lo contrario. Con este cierre, el bloque "El Pulso del Ecosistema" pasa a formar parte de la Arquitectura Oficial de la interfaz pública de ObrasDeTeatro.
