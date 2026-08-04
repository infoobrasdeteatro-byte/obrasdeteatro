# AEC-003 — Gestión del Ciclo de Vida de la Cuenta

**Expediente:** AEC-003 (Arquitectura del Ecosistema de Cuentas)
**Ámbito:** área de cuenta (`app/cuenta`), seguridad, sesiones, cambio de correo, eliminación de cuenta.
**Explícitamente fuera de ámbito:** Núcleo de ScenaIA (SC-001 a SC-004), Credit Manager, SEC-001, AEC-001 — sin cambios.
**Precede a este expediente:** AEC-000 (inventario general), AEC-001 (registro y confirmación, CERRADO), AEC-003 — Inventario del Ciclo de Vida de la Cuenta (análisis, sin archivo propio).
**Estado:** Fase 1 CERRADA (commit `50e6cc5`, en `develop`). Fase 2 implementada y validada localmente — pendiente de autorización de commit.

---

## Decisión Arquitectónica Oficial (2026-08-04, Dirección Técnica)

Cinco decisiones (DA-001 a DA-005), resumidas aquí; texto íntegro en el mensaje de autorización original:

| DA | Contenido |
|---|---|
| DA-001 | Eliminación de cuenta — requiere diseño explícito previo (comportamiento, confirmaciones, tratamiento de datos, interacción con el ecosistema); `credit_reservations` queda fuera de alcance y debe respetarse como restricción existente |
| DA-002 | Cambio de correo electrónico — validación, confirmación, sincronización única `auth.users` → `profiles`, sin doble fuente de verdad |
| DA-003 | Cambio de contraseña — misma política que AEC-001, sin coexistencia de dos políticas distintas |
| DA-004 | Gestión de sesiones — cierre local, cierre global, priorizando capacidades nativas de Supabase Auth |
| DA-005 | Privacidad de la cuenta — área específica de gestión de cuenta; excluye explícitamente perfil profesional, verificación, reputación, estados de confianza y suscripciones |

**Restricciones:** sin modificar SC-001 a SC-004, SEC-001, AEC-001, ni el comportamiento del Credit Manager; sin redefinir ningún estado de confianza; sin alterar la arquitectura de autenticación ya certificada.

## Plan de ejecución aprobado (orden final, con la modificación de Dirección)

Dirección aprobó el plan con una modificación: **Fases 3 y 4 intercambiadas** respecto a la propuesta original, para resolver primero el dominio aislado (sesiones) antes que el de mayor impacto sobre autenticación (correo).

1. **Fase 1** — Área de cuenta (contenedor, satisface DA-005 como andamiaje).
2. **Fase 2** — DA-003, cambio de contraseña autenticado + unificación de política.
3. **Fase 3** — DA-004, gestión de sesiones *(orden intercambiado)*.
4. **Fase 4** — DA-002, cambio de correo electrónico *(orden intercambiado)*.
5. **Fase 5** — DA-001, eliminación de cuenta: 5a (diseño, entregable propio) → 5b (implementación, solo tras aprobación de 5a).

---

## Fase 1 — Área de cuenta (implementada)

**Archivos nuevos:**
- `app/cuenta/page.tsx` — landing con tarjetas hacia las 4 subsecciones.
- `app/cuenta/seguridad/page.tsx`, `app/cuenta/sesiones/page.tsx`, `app/cuenta/correo/page.tsx`, `app/cuenta/eliminar/page.tsx` — cada una, andamiaje con mensaje "próximamente" referenciando su fase; sin funcionalidad propia todavía, tal como definía el plan aprobado.

**Archivos modificados:**
- `middleware.ts` — `/cuenta` añadida a `isProtectedRoute` (misma protección que `/dashboard`, `/perfil`, `/mis-obras`).
- `components/design-system/Sidebar.tsx` — nuevo enlace "Gestión de cuenta" en la sección "Mi cuenta".

**Validación:**
- Worktree limpio desde `main` (`cad49e2`) — Fase 1 no depende de SEC-001 ni de AEC-001, ambos en `develop`.
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: primer intento falló por comillas sin escapar en `app/cuenta/sesiones/page.tsx` (`react/no-unescaped-entities`) — corregido con `&ldquo;`/`&rdquo;`. Segundo intento: correcto, 34 rutas generadas, incluidas las 5 nuevas bajo `/cuenta`.
- Validación funcional: las 5 rutas nuevas devuelven `307` hacia `/auth/login` cuando no hay sesión — protección del middleware confirmada en vivo contra el servidor de desarrollo.
- Núcleo (SC-001 a SC-004): `git status` sin salida — cero cambios.

**Sin migraciones, sin cambios de Supabase, sin variables de entorno nuevas.**

**Cierre:** commit `50e6cc5` en `scenaia-bloque-3`, fast-forward a `develop` desde `2e555eb`, push a `origin/develop` confirmado. Aprobada por Dirección sin necesidad de auditoría adicional, al no incorporar lógica funcional ni modificaciones persistentes.

---

## Fase 2 — Cambio de contraseña autenticado + unificación de política (DA-003)

**Decisión de diseño:** DA-003 exige una única política de contraseñas en todo el dominio de autenticación. Se extrae `lib/auth/password-policy.ts` (`PASSWORD_POLICY`, `PASSWORD_HINT`) como fuente única, consumida ahora por: `app/api/auth/registro/route.ts`, `app/auth/registro/page.tsx` (AEC-001, sin cambio de comportamiento — es refactor puro, mismo regex, mismo mensaje), `app/cuenta/seguridad/SeguridadForm.tsx` (nuevo) y `app/auth/update-password/page.tsx` (antes exigía solo `minLength={6}`, ahora la misma política completa).

**Consideración de seguridad señalada, no incorporada al alcance:** el cambio de contraseña autenticado (`updateUser({password})`) no exige reintroducir la contraseña actual — cualquier sesión válida puede cambiarla. El plan aprobado no pedía esa reautenticación adicional y no se ha añadido, para no ampliar el alcance sin autorización; queda anotado por si Dirección quiere abrirlo como mejora futura.

**Archivos modificados:**
- `app/api/auth/registro/route.ts`, `app/auth/registro/page.tsx` — importan la política desde `lib/auth/password-policy.ts` en vez de definirla localmente.
- `app/auth/update-password/page.tsx` — `minLength` 6→8, validación completa de política, pista de contraseña visible.
- `app/cuenta/seguridad/page.tsx` — renderiza `SeguridadForm` en vez del aviso "próximamente".

**Archivos nuevos:**
- `lib/auth/password-policy.ts` — fuente única de la política (DA-003).
- `app/cuenta/seguridad/SeguridadForm.tsx` — formulario de cambio de contraseña autenticado (`updateUser({password})`, misma política, mismos mensajes de error vía `translateAuthError`).

**Validación:**
- Worktree limpio desde `develop` (`50e6cc5`, ya con SEC-001 + AEC-001 + AEC-003 Fase 1) — coherente con que Fase 2 depende de ambos expedientes ya cerrados.
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 34/34 rutas; `/cuenta/seguridad` pasa de 1.45 kB (stub) a 2.68 kB, confirmando que el formulario real quedó incluido.
- Funcional: `/cuenta/seguridad` sin sesión → `307` a `/auth/login` (protección intacta); `/auth/registro` sigue sirviendo la misma pista de contraseña tras el refactor del import compartido, verificado en vivo. No se pudo verificar por curl la pista en `/auth/update-password` porque esa página solo renderiza el formulario tras confirmar sesión válida en cliente (JS) — el código es idéntico en estructura al ya verificado en `SeguridadForm`, no señala ningún riesgo adicional.
- Núcleo (SC-001–SC-004): sin cambios.
- Sin migraciones, sin cambios de Supabase, sin variables de entorno nuevas.
