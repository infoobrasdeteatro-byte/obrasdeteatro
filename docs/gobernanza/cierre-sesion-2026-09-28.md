# CIERRE DE SESIÓN — 28-09-2026

**Proyecto:** ObrasDeTeatro® / ScenaIA
**Fecha del cierre:** 2026-09-28
**Estado de `main` al cierre:** `f7ee76c` (igual que `origin/main`)
**Alcance:** registro de lo ejecutado en el tramo de trabajo que termina hoy (PR #22 a #33) y de lo que queda pendiente. Documento de constancia: no autoriza nada ni sustituye a ninguna acta.

Las horas son las de los commits en `main` (hora de Europa/Londres, UTC+1). Los PR #22 a #24 y el acta AEC-003C son de días anteriores de este mismo tramo; se incluyen para que el registro esté completo.

---

## 1. PR fusionados

| PR | Commit en `main` | Fecha y hora | Qué | Estado final |
|---|---|---|---|---|
| #23 | `afc1683` | 2026-09-22 23:50 | ScenaIA: el autor tras un segundo «de» vuelve a examinarse | En producción |
| #22 | `693f419` | 2026-09-23 00:10 | ScenaIA: el listado puro se responde sin IA, con fichas completas (SCENAIA-004, Parte 1) | En producción |
| #24 | `3c423a0` | 2026-09-27 15:40 | Stripe: portal de cliente para gestionar la suscripción | En producción, **apagado** (`STRIPE_PORTAL_ENABLED`) |
| #25 | `f7a24aa` | 2026-09-28 09:57 | Cuenta: «Verificar» deja de bloquear por una suscripción activa (AEC-003C) | En producción |
| #26 | `36f0c13` | 2026-09-28 11:22 | Repository Layer: orden estable, desplazamiento y recuento en `listPublishedWorks` (SCENAIA-004, Parte 2) | En producción |
| #27 | `8009980` | 2026-09-28 11:59 | Repository Layer: página con género hasta 1.000 candidatos y tipos de página exportados (SCENAIA-004A) | En producción |
| #28 | `572ec63` | 2026-09-28 13:34 | ScenaIA: transporte de la página y del total del listado puro (SCENAIA-004B, PR 1 de 5) | En producción, detrás de `SCENAIA_PAGINACION_ENABLED` |
| #29 | `b49ce6c` | 2026-09-28 13:54 | ScenaIA: una continuación del listado nunca pide IA; el texto usa el total (004B, PR 2) | Ídem |
| #30 | `a7e464e` | 2026-09-28 14:15 | ScenaIA: continuación en la ruta y `listingPage` en la respuesta (004B, PR 3) | Ídem |
| #31 | `453e2ae` | 2026-09-28 18:25 | ScenaIA: pie del listado y botón «Ver más» (004B, PR 4) | Ídem |
| #32 | `6f40f8a` | 2026-09-28 20:45 | Base de datos: `works.genre_normalizado`, índice de trigramas e índice parcial `(title, id)` (SCENAIA-006, PR 1) | En producción: migraciones `20260928193651` y `20260928193714` aplicadas |
| #33 | `f7ee76c` | 2026-09-28 21:58 | Repository Layer: género por SQL en la página de obras (SCENAIA-006, PR 2) | En producción, **apagado** (`SCENAIA_GENERO_SQL_ENABLED`) |

El PR 5 de la Adenda SCENAIA-004B (encendido de la paginación) no es un PR de código: su validación se hizo en local contra la base de producción con cuenta dedicada (borrada, con recuentos y huellas idénticos antes y después).

## 2. Actas y adendas firmadas

Todas con cláusula de revocabilidad. Cada una en dos commits directos en `main`: borrador pendiente de firma y firma.

| Documento | Borrador | Firma | Decisión | Condiciones (resumen del §9) |
|---|---|---|---|---|
| SCENAIA-004 — listado puro sin IA (`acta-autorizacion-scenaia-004-listado-puro.md`) | `8b7de17` (22-09, 16:34) | `73d826a` (22-09, 16:42) | Autorizada con condiciones | Listado puro sin IA solo para la definición cerrada del §4.1, con la paginación y la reapertura acotada de Repository Layer del §4.4. |
| AEC-003C — preparar con suscripción activa (`acta-autorizacion-aec-003c-preparar-suscripcion-activa.md`) | `a7db4b1` (27-09, 18:08) | `aea7075` (27-09, 18:08) | Autorizada con condiciones | Cambio en `preparar/route.ts` según el §4; el aviso de consentimiento del §4.3 es obligatorio antes de fusionar; validación completa en modo test (§7.5), incluido «Confirmar», antes de desplegar. |
| SCENAIA-004A — género y tipos (`adenda-scenaia-004a-genero-y-tipos.md`) | `4030689` (28-09, 11:38) | `3a5c934` (28-09, 11:38) | Autorizada con condiciones | Página con género hasta 1.000 candidatos y recuento no determinado al alcanzarlo; la solución definitiva, en expediente propio. |
| SCENAIA-004B — paginación visible (`adenda-scenaia-004b-paginacion-visible.md`) | `019a829` (28-09, 12:41) | `da681b1` (28-09, 12:41) | Autorizada con condiciones | Parte 3 detrás de `SCENAIA_PAGINACION_ENABLED`, que debe validarse y encenderse antes de la carga masiva; ningún cambio en la base de datos. |
| SCENAIA-006 — género sin acentos en la base (`acta-autorizacion-scenaia-006-genero-sin-acentos.md`) | `7d668ff` (28-09, 19:58) | `3e799c6` (28-09, 19:58) | Autorizada con condiciones | Opción (b): columna generada, índice de trigramas e índice `(title, id)` en dos migraciones; filtro por SQL detrás de `SCENAIA_GENERO_SQL_ENABLED`, apagado por defecto; el modo sin página exige autorización propia; la época como género es el siguiente expediente; el interruptor debe encenderse antes de las 1.000 obras y solo con `SCENAIA_PAGINACION_ENABLED` ya encendido. |

**Sin firmar:** SCENAIA-005 — streaming (`acta-autorizacion-scenaia-005-streaming.md`), con fecha y firma en blanco.

## 3. Interruptores al cierre

| Interruptor | Estado | Nota |
|---|---|---|
| `SCENAIA_PAGINACION_ENABLED` | **Encendido** | Según Dirección. No se ha podido comprobar desde aquí: el conector de Vercel no ve el proyecto. |
| `SCENAIA_GENERO_SQL_ENABLED` | **Apagado** | Antes de encenderlo, el acta SCENAIA-006 (§7.4) exige repetir la prueba del PR 5 de la 004B con los dos interruptores encendidos. Debe encenderse antes de que el catálogo supere las 1.000 obras. |
| `STRIPE_PORTAL_ENABLED` | **Apagado** | Portal de cliente de Stripe (#24). |
| `SCENAIA_STREAMING` | **Apagado** | Canal NDJSON (#21). Su acta, SCENAIA-005, sigue sin firmar. |

## 4. Incidente: certificado del dominio raíz — RESUELTO

- **Detectado** el 28-09 al verificar el PR #32: `https://obrasdeteatro.com`, sin www, servía un certificado caducado el 3-09-2026. `www` estaba bien.
- **Causa:** el DNS del dominio raíz tenía un segundo registro A, `99.83.190.102` (AWS Global Accelerator, asociado a Webflow). Es un resto de una configuración anterior que respondía «Challenge not found» a la validación de Let's Encrypt.
- **Resolución:** el registro sobrante se retiró del DNS del registrador. Comprobado al cierre:
  - el DNS solo devuelve `216.198.79.1` (Vercel);
  - el certificado es nuevo, emitido el 28-09-2026 a las 20:01 UTC y válido hasta el 27-12-2026;
  - `https://obrasdeteatro.com` responde con la redirección de siempre a `www`.

## 5. Pendientes para retomar

1. **La época como género**: siguiente expediente tras SCENAIA-006. Hoy «teatro clásico» devuelve 1 de las 10 obras del Siglo de Oro, porque la época está en `secondary_genres`. Además hay tres vocabularios de género distintos: el formulario, la taxonomía de la Biblioteca y los lotes del Archivo Maestro.
2. **SCENAIA-005 (streaming)**: acta sin firmar.
3. **Mejora del intérprete**: «comedias» a secas, o «dame la lista de comedias», no se reconoce como listado puro de Obras y va a la IA con coste. Solo «dame la lista de obras de comedia» es listado puro.
4. **Botón «Nueva conversación» en ScenaIA.**
5. **El parámetro `next` en el login con sesión activa.**
6. **Borrar `%TEMP%\prueba_portal\credenciales` en el equipo del titular.** Sigue existiendo al cierre (67 bytes, del 19-09-2026). No se ha abierto ni borrado.

Pendientes ya registrados de antes y que siguen vigentes:
- encender `SCENAIA_GENERO_SQL_ENABLED` antes de las 1.000 obras, con la prueba previa del §3;
- la carga masiva de obras exige publicación diferida (`is_published = false`) hasta que la paginación y SCENAIA-006 estén encendidas;
- comprobar con sesión que el JavaScript servido de `/scenaia` incluye el pie del listado.
