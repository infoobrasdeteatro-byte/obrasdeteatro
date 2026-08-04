# AEC-003 — Gestión del Ciclo de Vida de la Cuenta

**Expediente:** AEC-003 (Arquitectura del Ecosistema de Cuentas)
**Ámbito:** área de cuenta (`app/cuenta`), seguridad, sesiones, cambio de correo, eliminación de cuenta.
**Explícitamente fuera de ámbito:** Núcleo de ScenaIA (SC-001 a SC-004), Credit Manager, SEC-001, AEC-001 — sin cambios.
**Precede a este expediente:** AEC-000 (inventario general), AEC-001 (registro y confirmación, CERRADO), AEC-003 — Inventario del Ciclo de Vida de la Cuenta (análisis, sin archivo propio).
**Estado:** Decisión Arquitectónica Oficial aprobada (2026-08-04). Fase 1 implementada y validada localmente — pendiente de autorización de commit.

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
