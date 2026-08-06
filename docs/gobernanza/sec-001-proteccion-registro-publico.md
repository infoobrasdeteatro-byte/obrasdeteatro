# SEC-001 — Arquitectura de Protección del Registro Público

**Expediente:** SEC-001
**Ámbito:** infraestructura de autenticación y registro (`app/auth/registro`, `app/api/auth/*`, `handle_new_user()`, RLS de `public.profiles`).
**Explícitamente fuera de ámbito:** Request Interpreter, Professional Context Engine, ScenaIA Knowledge Model, Decision Engine, Credit Manager, AI Gateway, Response Composer (Bloque I — Núcleo de Procesamiento, congelado 2026-07-12).
**Estado:** Fase 0, Fase 1 y Fase 2 certificadas. Fase 3 implementada y validada localmente — pendiente de commit/push/Preview y de la auditoría de Dirección. Fase 4 no iniciada.

---

## Antecedente

Auditoría de integridad de registro de profesionales (modo lectura exclusiva) sobre el proyecto Supabase `pnsirwtiiurczjwrayza`. Confirmó, con evidencia directa (cruce `public.profiles` ↔ `auth.users`, triggers, políticas RLS, código de `app/auth/registro/page.tsx`), que el registro público carece de cualquier control de fricción o verificación efectiva, y que la columna `verificado` no participa en ninguna política de visibilidad. Clasificación de esa auditoría: **Incidencia de seguridad**. Dirección determinó que es la tercera vez que se detecta el mismo patrón y elevó el problema de incidencia puntual a corrección arquitectónica — expediente SEC-001.

## Principios de arquitectura incorporados por Dirección

**Observación Nº1 — Única puerta de entrada al registro.** A partir de SEC-001, todo registro público deberá pasar exclusivamente por `/api/auth/registro`. No podrán coexistir dos caminos hacia `supabase.auth.signUp()`. Este principio queda reflejado en el diseño de la Fase 3: el formulario deja de llamar a Supabase directamente y pasa a depender del endpoint propio.

**Observación Nº2 — Servicio único de correo de bienvenida.** `lib/email/welcome-email.ts` será el único punto desde el que pueda enviarse un correo de bienvenida, ahora y en evoluciones futuras. No se conserva ningún endpoint público independiente capaz de dispararlo (Fase 4 elimina `app/api/auth/welcome-email/route.ts`, no lo deja en desuso).

---

## FASE 0 — Baseline de seguridad (fotografía oficial, no modificable)

Ejecutada en modo exclusivamente lectura, antes de tocar cualquier trigger, política RLS o archivo de código. Esta fotografía es la referencia oficial contra la que se comparará la Auditoría de Certificación al cierre del sprint. No se actualiza retroactivamente.

**Momento de captura:** 2026-08-03 (antes de cualquier cambio de SEC-001).

| Métrica | Valor |
|---|---|
| Perfiles totales (`public.profiles`) | **30** |
| Perfiles visibles hoy (`perfil_publico=true AND activo=true`, condición RLS actual) | **27** |
| Perfiles ocultos hoy | **3** |
| Perfiles con `verificado=true` | **0** |
| Perfiles con `verificado=false` | **30** |
| Perfiles cuyo `auth.users.email_confirmed_at` está establecido | **14** |
| Perfiles cuyo `auth.users.email_confirmed_at` es NULL | **16** |

**Los 3 perfiles ocultos hoy** son perfiles legítimos preexistentes con `perfil_publico=false` por decisión propia del titular (`julia`/`juliabaussonmartin@mail.com`, `social media`/`corporativosocialmedia@gmail.com`, `algo barato`/`info.algobarato@gmail.com`) — los tres con email confirmado. No relacionados con el incidente. Se documentan aquí para que la Auditoría de Certificación no los confunda con un efecto de Fase 1.

**Los 16 registros sospechosos** (huella: `tipo_perfil='publico'`, `pais='España'` [valor por defecto], `ciudad IS NULL`, `verificado=false`, **`email_confirmed_at IS NULL`**, **`last_sign_in_at IS NULL`** — nunca confirmados, nunca usados):

| # | Nombre | Email | Creado |
|---|---|---|---|
| 1 | vJGhGZVvRjroMutCwQo | wo.w.ew.abeha.05@gmail.com | 2026-07-20 21:33 |
| 2 | CqNAGhtExJhJAPaos | anvylee@yahoo.com | 2026-07-21 09:18 |
| 3 | KheDSnFzCSlYESvMUUOAUtOz | luca.marchesini78@libero.it | 2026-07-21 20:31 |
| 4 | vwOvCobRFbxpnfLncUvcxBz | rgilbert@knology.net | 2026-07-21 22:50 |
| 5 | AlbgTvnftxXUVVrwJOqmAsL | bjjones.casta3@outlook.com | 2026-07-22 01:09 |
| 6 | SwplIMqpPfaRQsluu | mike.m.a.nse.r.ra@gmail.com | 2026-07-22 06:08 |
| 7 | QiYGRAffLWEyfUpRyCX | jas.e.n.ju.n@gmail.com | 2026-07-22 09:25 |
| 8 | MbSQDVrnORnSfaMTYqF | syw.e.i.00.0.s.ho.p1@gmail.com | 2026-07-22 14:02 |
| 9 | PfXzGYQgxJtouNVWcuFmMo | auxl.i.a.238.cvm.a@gmail.com | 2026-07-22 19:44 |
| 10 | YscNuFDGMfebodAATkImkr | t.sch.a.n.n.atay.lo.r@gmail.com | 2026-07-22 21:15 |
| 11 | vHBzkzVQsrizJHGc | s.e.a.b.o.ardf.l.o.rence@gmail.com | 2026-07-23 17:59 |
| 12 | eAUZzHSdEbPwWIEZSFNzOQHL | franktocco@sbcglobal.net | 2026-07-24 02:25 |
| 13 | HEDnUwTwIjvXoSoV | w.otu.yagex.ife.2.1@gmail.com | 2026-07-24 07:36 |
| 14 | hIlaYvfNlWkbiTPwRkykRsyv | taylorn.l.in.e.s@gmail.com | 2026-07-24 13:01 |
| 15 | Danna Michelle | michellelozada586@gmail.com | 2026-07-29 19:01 |
| 16 | Julieth | camilajdelaguila@gmail.com | 2026-08-02 00:26 |

**Los 14 usuarios legítimos identificados** (email confirmado y sesión iniciada al menos una vez):

| # | Nombre | Email | Creado |
|---|---|---|---|
| 1 | renee | baussontenerife@gmail.com | 2026-06-15 22:20 |
| 2 | obrasteatro | info.obrasdeteatro@gmail.com | 2026-06-15 23:31 |
| 3 | team | teamshowproducciones@gmail.com | 2026-06-16 11:58 |
| 4 | julia | juliabaussonmartin@mail.com | 2026-06-22 07:34 |
| 5 | social media | corporativosocialmedia@gmail.com | 2026-06-22 11:35 |
| 6 | algo barato | info.algobarato@gmail.com | 2026-06-22 17:48 |
| 7 | daniel | danieluribe27@gmail.com | 2026-06-23 10:00 |
| 8 | Héctor Izar | hector.izarrr@gmail.com | 2026-06-24 17:43 |
| 9 | Agostina Camilo De Luca | seriviciostrasmutazione@gmail.com | 2026-06-26 14:50 |
| 10 | julia martin | jbaussonmartin@gmail.com | 2026-07-08 18:20 |
| 11 | Julio vicente luparello | juliolupa3@gmail.com | 2026-07-08 21:17 |
| 12 | Claudio Gabriel | graphos1ar@hotmail.com | 2026-07-10 18:13 |
| 13 | Alexander | alexandreelopez74@gmail.com | 2026-08-02 01:26 |
| 14 | Sofy | sofiamottier@gmail.com | 2026-08-03 00:56 |

Verificación de consistencia: 16 sospechosos + 14 legítimos = 30 (total exacto de la tabla). `email_confirmado_false` (16) y `email_confirmado_true` (14) coinciden exactamente con esta clasificación — no hay ningún perfil sin clasificar.

**Efecto esperado de Fase 1 sobre este baseline, declarado por adelantado para poder verificarlo en la Auditoría de Certificación:** los 27 visibles hoy deberían pasar a 14 visibles (los legítimos) tan pronto se aplique la migración; los 16 sospechosos y los 3 ya-ocultos deberían sumar los 16 no-visibles restantes. Ningún perfil de los 14 legítimos debe perder visibilidad.

---

## Plan de ejecución (aprobado, con las dos observaciones de arquitectura incorporadas)

### Fase 1 — Corrección del modelo de publicación
- Nueva función `public.handle_user_email_confirmed()` (`SECURITY DEFINER`, `search_path` fijado): al confirmarse el email, actualiza `public.profiles.verificado = true`.
- Nuevo trigger `on_auth_user_email_confirmed AFTER UPDATE ON auth.users FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)`.
- Política RLS `"Perfiles públicos visibles"` de `public.profiles`: `(perfil_publico = true) AND (activo = true)` → `(perfil_publico = true) AND (activo = true) AND (verificado = true)`.
- Política `"Perfil propio"` sin cambios — el titular sigue viendo/editando su propio perfil sin confirmar.
- Archivo: nueva migración en `supabase/migrations/`. Aplicación vía `apply_migration` sujeta a autorización expresa e independiente, según lo pactado.

### Fase 2 — Honeypot
- Campo oculto accesible (fuera de viewport + `aria-hidden`) en `app/auth/registro/page.tsx`; si llega relleno, no se llama a `signUp()` y se muestra el mismo mensaje de éxito.
- Capa complementaria frente a bots que renderizan el formulario; no sustituye a la Fase 1 ni a la Fase 3.

### Fase 3 — Cloudflare Turnstile + única puerta de entrada
- Nuevo `app/api/auth/registro/route.ts`: verifica honeypot, verifica el token de Turnstile contra `siteverify` (server-side), y solo entonces llama a `supabase.auth.signUp()` desde el servidor.
- `app/auth/registro/page.tsx` deja de llamar a Supabase directamente; pasa a hacer `POST` a `/api/auth/registro`. A partir de aquí, único camino posible hacia `signUp()` (Observación Nº1).
- Variables de entorno nuevas: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` — pendientes de que Dirección las genere en el panel de Cloudflare y las facilite.
- Fallo de verificación: fail-closed (mismo principio ya usado por Credit Manager en el Núcleo).

### Fase 4 — Servicio único de correo de bienvenida
- `lib/email/welcome-email.ts`: función única de construcción y envío del correo (Observación Nº2), invocada en proceso desde `app/api/auth/registro/route.ts` tras un `signUp()` exitoso.
- Eliminación de `app/api/auth/welcome-email/route.ts` — no queda ningún endpoint público capaz de dispararlo de forma independiente.

### Auditoría de Certificación (nueva, al cierre)
Repetición exacta de la metodología de la auditoría inicial, comparando contra este baseline. Deberá demostrar, con evidencia y no de forma manual:
1. El vector de entrada ha quedado cerrado (no es posible reproducir el patrón de los 16 registros).
2. Los 14 usuarios legítimos conservan visibilidad pública.
3. Los perfiles pendientes de confirmación se crean correctamente y funcionan para su titular, aunque no sean públicos.
4. El Directorio Público, tras el cierre, refleja únicamente perfiles verificados.
5. No se autoriza merge a producción hasta que esta auditoría quede satisfecha.

---

## Fase 1 — migración preparada (no aplicada)

Archivo: `supabase/migrations/20260803120000_sec001_gate_public_profile_on_email_confirmation.sql`. Contiene la función/trigger de confirmación, el backfill de los 14 perfiles legítimos ya confirmados, y el cambio de política RLS. **No aplicada todavía** — pendiente de autorización expresa para ejecutar `apply_migration` contra `pnsirwtiiurczjwrayza`.

Rollback preparado por adelantado, para no improvisarlo si hiciera falta (no se guarda en `supabase/migrations/` para que no se aplique automáticamente en la secuencia — queda aquí como referencia a ejecutar manualmente si es necesario):

```sql
drop policy if exists "Perfiles públicos visibles" on public.profiles;

create policy "Perfiles públicos visibles"
  on public.profiles
  for select
  to public
  using (perfil_publico = true and activo = true);

drop trigger if exists on_auth_user_email_confirmed on auth.users;
drop function if exists public.handle_user_email_confirmed();

-- Nota: el rollback no revierte el backfill de `verificado = true` sobre los
-- perfiles legítimos ya confirmados -- revertirlo no es necesario ni deseable,
-- ya que ese estado es correcto independientemente de la política RLS activa.
```

---

## Principio de arquitectura — Confianza del Directorio (certificado junto con Fase 1)

A partir de SEC-001, la pertenencia al Directorio Público deja de depender únicamente de la existencia del perfil y pasa a depender de la confianza que el sistema tiene sobre ese perfil. En la implementación actual, esa confianza se representa mediante la confirmación del correo electrónico (`verificado`, gobernado por la política RLS `"Perfiles públicos visibles"`). Es un principio, no un mecanismo cerrado: futuras señales de confianza (si se decidieran) se añadirían a la misma condición, sin cambiar el principio.

## Fase 1 — resultado de la aplicación (2026-08-03)

Migración `sec001_gate_public_profile_on_email_confirmation` aplicada sobre `pnsirwtiiurczjwrayza`. Verificado tras la aplicación:

- Trigger `on_auth_user_email_confirmed` existe sobre `auth.users`, condición `WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)`.
- Política `"Perfiles públicos visibles"` con `qual = (perfil_publico = true) AND (activo = true) AND (verificado = true)`.
- Backfill: `verificado=true` en 14 filas, `verificado=false` en 16 — coincide exactamente con la clasificación del baseline (14 legítimos / 16 sospechosos), sin excepciones en ningún sentido.

**Comparativa contra baseline:**

| Métrica | Baseline (antes) | Después de Fase 1 |
|---|---|---|
| Perfiles totales | 30 | 30 |
| `verificado=true` | 0 | 14 |
| `verificado=false` | 30 | 16 |
| Visibles públicamente | 27 | **11** |

El descenso de 27 a 11 visibles no es 27→14: de los 14 legítimos, 3 (`julia`, `social media`, `algo barato`) ya tenían `perfil_publico=false` por decisión propia desde antes de este sprint (documentado en el baseline como "ocultos hoy", sin relación con la confirmación de email) — siguen sin ser públicos, ahora por su propia preferencia, no por falta de verificación. 14 − 3 = 11, cifra verificada directamente.

**Confirmación expresa:**
- Los 14 perfiles legítimos identificados en el baseline tienen `verificado=true`. Ninguno perdió la visibilidad que le correspondía: los 11 que eran públicos y tenían email confirmado siguen siendo públicos; los 3 que ya eran privados por elección propia siguen privados, sin cambio de comportamiento respecto a su preferencia.
- Los 16 registros sospechosos identificados en el baseline tienen `verificado=false` y ya no son alcanzables por la política pública — dejan de aparecer en el Directorio Público.
- No se ha modificado ni eliminado ninguna fila. Los 16 registros siguen existiendo en la base de datos (auditables), simplemente no son públicos.

---

## Fase 2 — resultado (2026-08-04)

**Archivos modificados:**
- `app/auth/registro/page.tsx` — campo honeypot (`website`), oculto de forma accesible (`aria-hidden`, `tabIndex={-1}`, fuera de flujo de tabulación), con su propio estado; si llega relleno, el envío se corta antes de llamar a `signUp()` y se muestra el mismo mensaje de éxito que vería un usuario real, sin dar pista de la detección.
- `app/globals.css` — clase `.hp-field` (posicionamiento fuera de viewport, no `display:none`, para no penalizar lectores de pantalla).

**Validación:**
- Worktree limpio desde `main` (`cad49e2`), únicamente estos dos archivos copiados.
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde (sin pruebas nuevas específicas de honeypot — es lógica de UI simple, cubierta por validación funcional directa, no por suite automatizada).
- `npm run build`: build correcto, 29/29 páginas generadas, `/auth/registro` compila sin errores nuevos (los warnings de ESLint del build son preexistentes en `main`, ajenos a este cambio).
- Validación funcional: servidor de desarrollo activo (puerto 3002, mismo árbol de trabajo real) — se verificó en el HTML servido que el campo `website` se renderiza con `aria-hidden="true"`, `tabindex="-1"` y `autoComplete="off"`, y que `/auth/registro` responde `200 OK`.

**Riesgos detectados:** ninguno nuevo respecto a los ya previstos en el plan. Se confirma la limitación ya señalada de antemano: el honeypot solo detiene bots que renderizan el formulario (headless browser); no detiene scripts que llaman directamente a la API de Supabase, que es el patrón observado en los 16 registros del incidente — ese vector permanece cerrado por la Fase 1 y quedará reforzado por la Fase 3.

**Comparación respecto al plan aprobado:** implementación idéntica a la diseñada, sin cambios de alcance. Sin migraciones, sin cambios de configuración de Supabase, sin variables de entorno nuevas.

---

## Fase 3 — resultado (2026-08-04)

**Archivos:**
- **Nuevo** `app/api/auth/registro/route.ts` — única puerta de entrada al registro (Observación Nº1). Valida honeypot en servidor, verifica el token de Turnstile contra `siteverify` (fail-closed: sin secreto configurado o sin verificación válida, se bloquea), y solo entonces llama a `supabase.auth.signUp()` desde el servidor.
- `app/auth/registro/page.tsx` — deja de llamar a Supabase directamente; hace `POST` a `/api/auth/registro`. Añade el widget de Turnstile (script oficial de Cloudflare vía `next/script`, renderizado explícito, sin librerías npm nuevas). El honeypot de la Fase 2 se conserva como atajo del lado del cliente; el servidor lo revalida de forma independiente.
- `app/globals.css` — sin cambios adicionales sobre los de la Fase 2.

**TypeScript:** `npx tsc --noEmit` — sin errores.
**Build:** `npm run build` — correcto, 30/30 rutas (incluye `/api/auth/registro` como función dinámica). Sin errores nuevos.
**Pruebas:** `npx vitest run` — 84/84 archivos, 407/407 en verde.
**Núcleo:** `git status` sobre los 7 directorios del Bloque I confirma cero cambios.

**Validación funcional** (servidor local, sin claves reales de Cloudflare todavía):
- Token de Turnstile inválido → `{"ok":false,"code":"turnstile_failed"}`, sin crear cuenta. Verificado también contra Supabase: 0 filas nuevas en `auth.users`.
- Honeypot relleno → `{"ok":true}` (mismo éxito aparente que un registro real), sin crear cuenta. Verificado igualmente: 0 filas nuevas.
- Comportamiento fail-closed confirmado en ambos sentidos: sin `TURNSTILE_SECRET_KEY` configurada, el registro se bloquea en vez de permitirse.

**Pendiente antes de la auditoría en Preview:** las variables `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` deben estar activas específicamente para el entorno **Preview** de Vercel, no solo Production, para que el registro legítimo funcione en el Preview Deployment de esta fase.

---

## Riesgos, validación y rollback

Sin cambios respecto al plan ya presentado a Dirección: cada fase se valida en worktree limpio desde `main` (`vitest`, `tsc --noEmit`, `build`), se prueba en Preview Deployment antes de pedir autorización de merge, y cada fase mantiene su propia estrategia de reversión (migración inversa preparada de antemano para Fase 1; `git revert` para el resto). El detalle completo de riesgos por fase se mantiene igual que en el documento de plan ya aprobado por Dirección.

---

## Acta Oficial de Cierre — SEC-001

**Fecha:** 2026-08-06
**Expediente:** SEC-001 — Protección del Registro Público
**Estado final:** CERRADO FUNCIONALMENTE

### Objetivo original del expediente

Corregir, a nivel arquitectónico, la ausencia total de fricción o verificación en el registro público, tras detectarse por tercera vez el mismo patrón de incidencia: una auditoría de integridad (modo lectura) confirmó que el registro carecía de cualquier control efectivo y que la columna `verificado` no participaba en ninguna política de visibilidad real. Dirección elevó el problema de incidencia puntual a corrección arquitectónica.

### Alcance finalmente implementado

Tres fases, todas ejecutadas (la Fase 4 originalmente prevista —servicio único de correo de bienvenida— se completó más tarde, dentro del expediente AEC-001, no en este):

1. **Fase 1 — Corrección del modelo de publicación:** la visibilidad pública de un perfil pasa a depender de la confirmación real del email (`verificado=true`), mediante trigger `on_auth_user_email_confirmed` + nueva condición en la política RLS `"Perfiles públicos visibles"`.
2. **Fase 2 — Honeypot:** campo oculto accesible en el formulario de registro; si llega relleno, el registro se corta sin crear cuenta, mostrando el mismo mensaje de éxito que vería un usuario real.
3. **Fase 3 — Turnstile + única puerta de entrada:** nuevo `app/api/auth/registro/route.ts` como único camino posible hacia `signUp()`; verifica honeypot y token de Turnstile (fail-closed) en servidor antes de crear la cuenta.

### Decisiones arquitectónicas relevantes

- **Observación Nº1 — Única puerta de entrada al registro**, incorporada como principio permanente: no pueden coexistir dos caminos hacia `supabase.auth.signUp()`.
- **Principio de Confianza del Directorio**: la pertenencia al Directorio Público deja de depender solo de la existencia del perfil y pasa a depender de una señal de confianza verificada (hoy, confirmación de email) — principio abierto a futuras señales adicionales, no un mecanismo cerrado.
- Orden de comprobaciones fail-closed en el endpoint de registro, con Turnstile antepuesto a cualquier lógica que pudiera usarse como oráculo de enumeración.

### Validaciones realizadas

- Auditoría de baseline (modo exclusivamente lectura, 2026-08-03) contra `pnsirwtiiurczjwrayza`, antes de tocar nada: 30 perfiles totales, 27 públicos, 16 registros identificados como sospechosos (patrón coincidente: sin confirmar, sin sesión nunca iniciada), 14 legítimos.
- Tras Fase 1: verificado con datos reales que los 14 legítimos conservan (u obtienen) `verificado=true` sin excepción, y los 16 sospechosos quedan con `verificado=false` y fuera de la política pública — comparativa numérica exacta contra el baseline (27 → 11 públicos, diferencia explicada y verificada, no estimada).
- Fase 2 y Fase 3, cada una en worktree limpio desde `main`: `tsc --noEmit` sin errores, `vitest run` en verde (84/84 archivos, 407/407 pruebas), `build` correcto. Núcleo de ScenaIA verificado sin cambios en las tres fases.
- Validación funcional directa del endpoint: honeypot relleno y token de Turnstile inválido, ambos casos verificados también contra Supabase real (0 filas nuevas en `auth.users`).

### Evidencia de finalización

- Migración `20260803120000_sec001_gate_public_profile_on_email_confirmation.sql` aplicada sobre `pnsirwtiiurczjwrayza` y verificada (trigger, política RLS y backfill confirmados contra datos reales).
- Commit único `7d98e02` en `scenaia-bloque-3`, con exactamente los 5 archivos del expediente.

### Relación con el resto de la arquitectura

- Cero cambios en el Núcleo de ScenaIA (Bloque I), verificado en cada fase.
- Es el cimiento sobre el que se construyó AEC-001 (que reutiliza y no debilita el orden de protección honeypot→Turnstile ya certificado aquí) y, por tanto, indirectamente, de toda la familia AEC-003/AEC-003B.

### Estado final del expediente

Implementado y validado en las tres fases. Desplegado en `develop` y en `scenaia-bloque-3` (respaldado en `origin`). **No desplegado en `main`/producción** — sin autorización solicitada ni concedida para ese paso, misma disciplina que el resto de expedientes de esta sesión.

### Observaciones documentales

- La "Auditoría de Certificación" de 5 puntos prevista en el plan original de SEC-001 (incluyendo la comprobación explícita de que el Directorio Público, tras el cierre, refleja únicamente perfiles verificados) no aparece registrada como un paso formal independiente ya ejecutado. Su contenido queda cubierto de hecho por las comparativas de baseline de Fase 1 y las validaciones de Fase 2/3. Dirección considera esta evidencia objetiva suficiente y no reabre el expediente por este motivo.

### Observaciones operativas

- Las variables `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` para el entorno **Preview** de Vercel quedaron señaladas como pendientes en este mismo documento (2026-08-04); no hay evidencia en el expediente de que se hayan confirmado activas desde entonces.

### Declaración

**El expediente SEC-001 — Protección del Registro Público queda CERRADO FUNCIONALMENTE en `develop`/`scenaia-bloque-3`**, con sus tres fases implementadas, validadas y verificadas contra datos reales. Ninguna de las observaciones registradas se considera bloqueante para este cierre. Aprobada por Dirección Técnica el 2026-08-06.
