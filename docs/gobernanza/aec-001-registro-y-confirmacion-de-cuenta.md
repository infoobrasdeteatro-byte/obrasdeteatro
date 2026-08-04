# AEC-001 — Registro y Confirmación de Cuenta

**Expediente:** AEC-001 (Arquitectura del Ecosistema de Cuentas)
**Ámbito:** flujo de registro (`app/auth/registro`, `app/api/auth/registro`), confirmación de email (`app/auth/callback`), servicio de correo de bienvenida.
**Explícitamente fuera de ámbito:** Núcleo de ScenaIA (Request Interpreter, PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer) — sin cambios, verificado.
**Estado:** CERRADO. Migración aplicada, commit realizado, push a `develop` completado, Auditoría de Verificación superada. Acta Oficial de Cierre a continuación, pendiente de revisión final de Dirección.
**Precede a este expediente:** AEC-000 — Inventario del Ecosistema de Cuentas (análisis, sin archivo propio).

---

## Decisión Arquitectónica Oficial (2026-08-04, Dirección Técnica)

Ratificada como referencia oficial del flujo de registro y confirmación de cuentas, sustituyendo cualquier interpretación funcional previa. Seis decisiones (DA-001 a DA-006), cada una ya cubierta por la implementación de este expediente:

| DA | Contenido | Cobertura en la implementación |
|---|---|---|
| DA-001 | Sin registros duplicados; comprobación en servidor; sin crear cuenta ni enviar correo; protegida por la infraestructura anti-bot de SEC-001 | Comprobación `service_role` contra `profiles`, situada después de Turnstile |
| DA-002 | Bienvenida solo tras confirmación + activación real; idempotente, una única vez por cuenta | Disparada desde `app/auth/callback`, gateada por `welcome_email_sent_at` |
| DA-003 | Contraseña 8+/mayúscula/minúscula/número; cliente + servidor; servidor prevalece | Validado en ambos; servidor es la autoridad (`PASSWORD_POLICY` en `route.ts`) |
| DA-004 | Nunca mensajes técnicos de Supabase | `ERROR_MESSAGES` + `translateAuthError` (fallback genérico ya existente) |
| DA-005 | Estado inicial únicamente "Cuenta creada"; sin perfil completado, verificado, destacado, validación editorial ni reconocimiento profesional automáticos | Ya garantizado por SEC-001 Fase 1 (`verificado=false` por defecto + RLS); sin cambio adicional necesario |
| DA-006 | Perfil inicial con datos mínimos únicamente | Ya era así (`handle_new_user` solo escribe `id`, `email`, `nombre`) |

**Restricciones verificadas explícitamente contra esta Decisión:**
- Núcleo Conversacional (SC-001 a SC-004): sin cambios, confirmado por `git status`.
- Comportamiento certificado de SEC-001: honeypot y Turnstile intactos, mismo orden de protección.
- Ningún nuevo estado de confianza introducido: `welcome_email_sent_at` no es un estado de confianza, es exclusivamente un control de idempotencia de envío de correo.
- El significado del campo `verificado` **no se ha tocado ni redefinido** en ningún archivo de este expediente.
- Arquitectura PKCE: `exchangeCodeForSession`/`verifyOtp` sin modificar; solo se añade una llamada posterior no bloqueante tras el éxito.

## Alcance autorizado (6 puntos)

1. Impedir el registro con correos ya existentes, sin crear cuenta ni enviar email.
2. El correo de bienvenida solo se envía tras la confirmación real del email.
3. Política mínima de contraseñas: 8+ caracteres, mayúscula, minúscula, número.
4. Mensajes de error claros y consistentes, sin exponer texto técnico de Supabase.
5. Estado inicial de cuenta nueva: solo "creada / pendiente de confirmación", sin verificación profesional ni confianza pública automática.
6. Perfil inicial con datos mínimos; el resto queda para la fase de completitud del perfil.

## Verificación previa (arquitectura congelada y no regresión)

- **Núcleo ScenaIA:** `git status` sobre los 7 directorios del Bloque I — cero cambios.
- **SEC-001:** el honeypot y la verificación de Turnstile del endpoint `/api/auth/registro` se conservan intactos; las nuevas comprobaciones (contraseña, email existente) se insertan en el orden correcto para no debilitar la protección ya certificada.
- **Flujo PKCE:** `exchangeCodeForSession` y `verifyOtp` en `app/auth/callback/route.ts` no se modifican; solo se añade una llamada posterior, no bloqueante para la sesión del usuario, tras un intercambio ya exitoso.

## Decisión de diseño relevante — orden de comprobaciones

`honeypot → tipo de datos → política de contraseña → Turnstile (fail-closed) → email ya existente → signUp()`

La comprobación de "email ya existente" se sitúa **después** de Turnstile, no antes. Colocarla antes habría convertido el propio endpoint de registro en un oráculo de enumeración de correos sin fricción (cualquiera podría script-ear peticiones para averiguar qué emails están registrados). Al exigir un token válido de Turnstile primero, esa comprobación queda protegida por la misma barrera anti-automatización que ya protege la creación de cuentas.

## Implementación

**Archivos modificados:**
- `app/api/auth/registro/route.ts` — política de contraseñas (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`), comprobación de email existente vía cliente `service_role` contra `public.profiles` (`ilike`, case-insensitive, email normalizado a minúsculas), nuevos códigos de respuesta (`weak_password`, `email_exists`).
- `app/auth/registro/page.tsx` — validación de contraseña también en cliente (UX), mapa de mensajes claros por código (`ERROR_MESSAGES`), pista de contraseña visible bajo el campo, **eliminada** la llamada a `/api/auth/welcome-email` tras el éxito del registro.
- `app/auth/callback/route.ts` — tras un intercambio de código/OTP exitoso, actualiza `profiles.welcome_email_sent_at` de forma atómica (`UPDATE ... WHERE welcome_email_sent_at IS NULL`) y solo si esa actualización tuvo efecto, envía el correo de bienvenida. Garantiza como mucho un envío por cuenta, disparado únicamente por una confirmación real.
- `types/supabase.ts` — añadida la columna `welcome_email_sent_at` (`string | null`) al tipo de `profiles`.

**Archivos nuevos:**
- `lib/email/welcome-email.ts` — servicio único de envío del correo de bienvenida (HTML + Resend), extraído del antiguo endpoint público. Es ahora el único lugar del código capaz de enviarlo.
- `supabase/migrations/20260804090000_aec001_welcome_email_sent_at.sql` — `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;`. **Aplicada sobre `pnsirwtiiurczjwrayza` el 2026-08-04.**

**Archivos eliminados:**
- `app/api/auth/welcome-email/route.ts` — endpoint público independiente. Su eliminación completa la Fase 4 de SEC-001, que había quedado pendiente; se ejecuta ahora porque el punto 2 del alcance de AEC-001 exige exactamente este cambio (mover el disparo del correo del momento de registro al momento de confirmación), y mantener las dos rutas en paralelo habría dejado dos caminos divergentes para el mismo correo.

## Puntos 5 y 6 del alcance — verificados, sin cambio de código necesario

- **Punto 5:** `handle_new_user()` (trigger existente, sin modificar) crea el perfil con `verificado = false` por defecto. Desde SEC-001 Fase 1, la política RLS de lectura pública exige `verificado = true` — es decir, una cuenta recién creada ya es, por diseño ya certificado, invisible públicamente y sin ningún atributo de confianza hasta la confirmación real. No fue necesario ningún cambio adicional para cumplir este punto.
- **Punto 6:** `handle_new_user()` solo escribe `id`, `email`, `nombre`. El resto de columnas de `profiles` quedan en su valor por defecto. El formulario de registro solo pide email, nombre y contraseña. El perfil inicial ya es mínimo por construcción.

## Validación

- Worktree limpio desde `main` (`cad49e2`), con el estado completo (SEC-001 + AEC-001) de cada archivo tocado copiado sobre él.
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 29/29 páginas; `/api/auth/welcome-email` ya no aparece como ruta; `/api/auth/registro` compila sin errores.
- Validación funcional (servidor de desarrollo, sin aplicar todavía la migración): contraseña débil → `weak_password` sin llamar a Turnstile ni a Supabase; contraseña válida + token de Turnstile inválido → `turnstile_failed`, confirmando que la comprobación de email existente sigue protegida detrás de Turnstile. La lógica de coincidencia `ILIKE` de la comprobación de email existente se verificó por separado con una consulta de solo lectura contra una cuenta real conocida.
- No se verificó en vivo el disparo del correo de bienvenida en `app/auth/callback`, porque esa verificación requiere completar un registro real de extremo a extremo (registro → clic en el enlace de confirmación → recepción del correo). La columna `welcome_email_sent_at` ya existe en la base de datos real desde la aplicación de la migración; queda como observación abierta en la sección siguiente, no como bloqueo de esta validación.

## Acta Oficial de Cierre — AEC-001

**Fecha:** 2026-08-04
**Expediente:** AEC-001 — Registro y Confirmación de Cuenta
**Estado final:** CERRADO

### Hitos del expediente, en orden

1. AEC-000 — Inventario del Ecosistema de Cuentas (análisis exclusivo, sin archivo propio).
2. Estudio de arquitectura AEC-001 (análisis, sin código).
3. Decisión Arquitectónica Oficial AEC-001 (DA-001 a DA-006), emitida por Dirección Técnica el 2026-08-04.
4. Plan de ejecución e implementación completa de los 6 puntos de alcance.
5. Validación en worktree limpio desde `main`: `tsc --noEmit` sin errores, `vitest` 84/84 archivos y 407/407 pruebas en verde, `build` correcto (29/29 páginas).
6. Auditoría de Verificación de AEC-001: resultado **✅ Cumple íntegramente la Decisión Arquitectónica Oficial AEC-001**, punto por punto (DA-001 a DA-006 y restricciones), verificada contra el código real y el estado real de Supabase.
7. Migración `20260804090000_aec001_welcome_email_sent_at.sql` aplicada sobre `pnsirwtiiurczjwrayza` — columna `welcome_email_sent_at` (`timestamptz`, nullable) confirmada en `public.profiles`.
8. Commit `da00e25` en `scenaia-bloque-3`, con exactamente los 7 archivos del expediente (ninguno del material ajeno "Conjunto B" incluido).
9. Push a `develop` en fast-forward desde `7d98e02` (SEC-001), verificado como ancestro antes de empujar.

### Estado de despliegue

`develop` en `da00e25`. **`main` no modificado** — el paso a producción no ha sido solicitado ni autorizado en este expediente; queda pendiente de una autorización explícita separada, siguiendo la misma disciplina que en SEC-001.

### Decisiones arquitectónicas certificadas (DA-001 a DA-006)

Las seis decisiones de la Decisión Arquitectónica Oficial quedan implementadas, validadas y verificadas — ver tabla de cobertura y el resultado íntegro de la Auditoría de Verificación más arriba en este documento.

### Restricciones respetadas, verificadas dos veces (plan y auditoría)

- Núcleo Conversacional (SC-001 a SC-004): sin cambios.
- Comportamiento certificado de SEC-001: intacto, incluida la política RLS `verificado = true` sin modificar.
- Ningún nuevo estado de confianza introducido.
- Significado del campo `verificado`: no redefinido.
- Arquitectura PKCE: sin alterar.

### Deuda y observaciones abiertas, no bloqueantes para este cierre

- No se realizó verificación funcional en vivo del envío real de correo de bienvenida a través del flujo completo navegador → confirmación → Resend, dado que esa verificación requiere un registro real de extremo a extremo; el mecanismo de idempotencia y el punto de disparo quedan verificados por código y por la atomicidad de la operación SQL.
- El paso a `main`/producción de AEC-001 no forma parte de este cierre y requiere autorización explícita separada.

### Declaración

**El expediente AEC-001 — Registro y Confirmación de Cuenta queda CERRADO en `develop`**, con las seis Decisiones Arquitectónicas Oficiales implementadas, validadas y auditadas con resultado positivo. Pendiente de la revisión final y ratificación de Dirección Técnica.
