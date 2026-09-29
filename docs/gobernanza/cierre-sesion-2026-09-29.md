# CIERRE DE SESIÓN — 29-09-2026

**Proyecto:** ObrasDeTeatro® / ScenaIA
**Fecha del cierre:** 2026-09-29
**Estado de `main` al cierre:** `5a6d195` (igual que `origin/main`), más el commit de este documento
**Alcance:** registro de lo ejecutado hoy (PR #34 a #41, actas y adendas firmadas, encendido de los interruptores del listado de obras) y de lo que queda pendiente. Documento de constancia: no autoriza nada ni sustituye a ninguna acta.

Las horas son las de los commits en `main` (hora de Europa/Londres, UTC+1). Las horas de despliegue que se citan aparte están en UTC.

---

## 1. PR fusionados

Todos fusionados por squash con el SHA fijado y comprobados en producción tras el despliegue: sin sesión, `/scenaia` → 307 al login y `POST /api/scenaia-verified` → 401.

| PR | Commit en `main` | Hora | Qué | Estado final |
|---|---|---|---|---|
| #34 | `ae50411` | 12:08 | Base de datos: columna `works.epocas` con lista cerrada, índice GIN y relleno de las 10 obras del Siglo de Oro (SCENAIA-007, PR 1) | En producción: migración `20260929105531` aplicada; equivalencia verificada |
| #35 | `ad1c1d3` | 12:49 | Repository Layer: criterio de época en SQL (SCENAIA-007, PR 2) | En producción, detrás de `SCENAIA_EPOCA_ENABLED` (**encendido**) |
| #36 | `b4841c0` | 14:34 | La época en el intérprete, el Intent Resolver y la validación del estado (SCENAIA-007, PR 3) | Ídem |
| #37 | `ee6d40a` | 17:14 | Request Interpreter: petición de solo criterio de género como listado puro (SCENAIA-004C) | En producción; **aceptación funcional superada en producción real** |
| #38 | `59da6eb` | 18:01 | ScenaIA: pie «Ninguna obra coincide con esta búsqueda» en la primera página sin resultados | En producción (sin acta, cambio menor) |
| #39 | `c31ab7e` | 18:39 | Middleware: el parámetro `next` se conserva en los dos sentidos | En producción (sin acta, cambio menor) |
| #40 | `059c81c` | 19:33 | ScenaIA: botón «Nueva conversación» | En producción (sin acta, cambio menor) |
| #41 | `520e5a2` | 21:48 | `/scenaia` sin sesión conserva el `next` al redirigir al login | En producción (sin acta, cambio menor); actualiza con autorización de Dirección un invariante de la UX-003 |

Despliegues en Production (UTC): #36 a las 13:35, #37 a las 16:16, #38 a las 17:02, #39 a las 17:40, #40 a las 18:34 y #41 a las 20:49.

Comprobaciones específicas:
- **#39:** sin sesión, `/cuenta` → `/auth/login?next=%2Fcuenta` y `/mis-postulaciones?estado=pendiente` → `next=%2Fmis-postulaciones%3Festado%3Dpendiente`.
- **#41:** sin sesión, `/scenaia` → 307 a `/auth/login?next=%2Fscenaia`.
- **#38, #40 y #41 con sesión:** no se han visto en producción (no se crearon cuentas); los cubren sus pruebas.

## 2. Actas y adendas firmadas

Todas con cláusula de revocabilidad. Cada una en dos commits directos en `main`: borrador pendiente de firma y firma.

| Documento | Borrador | Firma | Decisión | Condiciones (resumen del §9) |
|---|---|---|---|---|
| SCENAIA-007 — la época como dimensión propia (`acta-autorizacion-scenaia-007-epoca.md`) | `c45f342` (11:11) | `28fdac1` (11:12) | Autorizada con condiciones | Época como dimensión propia según el §4, con las decisiones del §4.7. El PR de formularios (selector de época) no queda autorizado. `SCENAIA_EPOCA_ENABLED` se enciende en el orden de la Adenda 006A. |
| SCENAIA-006A — orden de encendido de los interruptores (`adenda-scenaia-006a-orden-interruptores.md`) | `7ff1ff5` (11:12) | `9d03a9a` (11:12) | Autorizada con condiciones | Precisa el §7.4 de SCENAIA-006 («teatro clásico» → 1 solo vale con la época apagada) y fija el orden de encendido: paginación → género → época. |
| SCENAIA-007A — dónde se lee el interruptor de época (`adenda-scenaia-007a-lectura-interruptor.md`) | `764c1a2` (14:13) | `19759ee` (14:13) | Autorizada con condiciones | Corrige el §4.2 de SCENAIA-007: el interruptor se lee solo en el Orquestador y en la ruta, y viaja como dato. Amplía el alcance del PR 3 a los ficheros de tránsito. |
| SCENAIA-004C — petición de solo criterio de género (`adenda-scenaia-004c-solo-criterio-genero.md`) | `6c984e1` (16:21) | `0290b70` (16:21) | Autorizada con condiciones | Forma «petición de solo criterio de género» con dominio Obras implícito y sin modificar `DOMAIN_KEYWORDS`. Épocas y demás casos ambiguos, para un expediente futuro. **Implementada (#37).** |
| SCENAIA-004D — época a secas como listado puro (`adenda-scenaia-004d-epoca-solo-criterio.md`) | `bf3a6b4` (22:27) | `5a6d195` (22:28) | Autorizada con condiciones | Lista `SOLO_EPOCA_TERMINOS`, artículos en singular y el Request Interpreter como cuarto destino del interruptor (revisa la 007A). Términos fuera de la lista (realismo/naturalismo, renacimiento, griego/a, áureo, vanguardista, postguerra), ampliables con una revisión menor. «Teatro» + época, expediente independiente. **Sin implementar.** |

**Sin firmar:** SCENAIA-005 — streaming (`acta-autorizacion-scenaia-005-streaming.md`). Dirección la deja **aplazada sin fecha, no denegada** (§5).

## 3. Interruptores al cierre

| Interruptor | Estado en Production | Nota |
|---|---|---|
| `SCENAIA_PAGINACION_ENABLED` | **Encendido** | Validado en local contra la base de producción el 28-09 (PR 5 de la 004B). Confirmado por comportamiento: los listados muestran «Mostrando 1-10 de 10». |
| `SCENAIA_GENERO_SQL_ENABLED` | **Encendido** | Validación previa superada el 29-09: build local de `b4841c0` contra la base de producción con paginación y género, cuenta dedicada borrada, 48 recuentos y huellas idénticos, 0 reservas. Encendido según Dirección: no se puede distinguir por comportamiento, porque con 11 obras el filtro en memoria y el SQL dan lo mismo. |
| `SCENAIA_EPOCA_ENABLED` | **Encendido** | Validación previa superada el 29-09 con los tres interruptores encendidos (cuenta dedicada borrada, 0 reservas). Confirmado por comportamiento a las 16:42 UTC: «teatro clásico» dentro de una petición de obras → las 10 del Siglo de Oro. |
| `SCENAIA_STREAMING` | **Apagado** | Canal NDJSON (#21). SCENAIA-005, aplazada sin fecha. |
| `STRIPE_PORTAL_ENABLED` | **Apagado** | Portal de cliente de Stripe (#24). |

El conector de Vercel no ve el proyecto (el equipo lista 0 proyectos y la consulta de variables responde «Project not found»), así que ningún estado se ha podido leer directamente del panel.

## 4. Hallazgo: la métrica del primer fragmento (streaming)

- `scenaia.ai.first_token_ms` mide desde el **inicio de la llamada de respuesta** al proveedor, no desde el inicio del turno. Su valor coincide exactamente con `ai_gateway.first_token_latency_ms` de la fase `response`.
- Compararla con `scenaia.request.duration_ms` (medianas de 1.356 ms frente a 4.256 ms) exagera el beneficio. La estimación corregida de la primera palabra es de unos 3.400 ms: **ahorro de unos 0,85 s en turnos normales**, no de unos 2,9 s. En el turno largo `RESPONSE_PARTIAL` (8,7 s), el ahorro sí sería de unos 5,3 s.
- La muestra sigue en **3 turnos con IA**, todos del 22-09 y de la cuenta interna. No creció porque todas las pruebas de esta semana fueron deliberadamente sin IA.
- Para decidir SCENAIA-005 hacen falta una métrica nueva, desde el inicio real del turno hasta el primer fragmento, y tráfico real de IA.

## 5. Incidente cerrado: certificado del dominio raíz

Resuelto el 28-09 (ver `cierre-sesion-2026-09-28.md`, §4). Se retiró el registro A sobrante `99.83.190.102` y el certificado se renovó hasta el 27-12-2026. Sigue correcto: `https://obrasdeteatro.com` responde con la redirección de siempre a `www`, comprobado hoy al verificar el #41.

## 6. Pendientes para mañana, por prioridad

1. **Implementar SCENAIA-004D** (época a secas como listado puro). Ya autorizada, con el diseño completo en la propia adenda (§4.5 y §7).
2. **Expediente «teatro» + época → Organizaciones.** Es una ambigüedad de producto: necesita que Dirección decida la regla de desempate. Toca `DOMAIN_KEYWORDS`, que la 004C blinda.
3. **Carga masiva desde BNE/BVMC.** Requiere decisiones previas de Dirección: la fuente, metadatos o texto completo, y el criterio legal de dominio público por país.
4. **Taxonomía de géneros:** hay tres vocabularios que no coinciden (el formulario, la taxonomía de la Biblioteca y los lotes del Archivo Maestro). Se resuelve junto con la carga masiva o antes.
5. **SCENAIA-005 (streaming):** aplazada sin fecha. Retomar cuando haya tráfico real de IA tras la carga masiva.
6. **Borrar `%TEMP%\prueba_portal\credenciales`** en el equipo del titular. Sigue existiendo al cierre (67 bytes, del 19-09-2026). No se ha abierto ni borrado.

Pendientes ya registrados de antes y que siguen vigentes:
- la carga masiva de obras exige los interruptores del listado encendidos (ya lo están) o, si no, publicación diferida (`is_published = false`);
- comprobar con sesión que el JavaScript servido de `/scenaia` incluye el pie del listado y el botón «Nueva conversación».
