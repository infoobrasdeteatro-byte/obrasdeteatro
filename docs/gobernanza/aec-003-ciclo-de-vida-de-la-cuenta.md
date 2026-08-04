# AEC-003 — Gestión del Ciclo de Vida de la Cuenta

**Expediente:** AEC-003 (Arquitectura del Ecosistema de Cuentas)
**Ámbito:** área de cuenta (`app/cuenta`), seguridad, sesiones, cambio de correo, eliminación de cuenta.
**Explícitamente fuera de ámbito:** Núcleo de ScenaIA (SC-001 a SC-004), Credit Manager, SEC-001, AEC-001 — sin cambios.
**Precede a este expediente:** AEC-000 (inventario general), AEC-001 (registro y confirmación, CERRADO), AEC-003 — Inventario del Ciclo de Vida de la Cuenta (análisis, sin archivo propio).
**Estado:** Fases 1 a 4 CERRADAS (`50e6cc5`, `2dccabe`, `4be5dc2`, `64f1c7e`, en `develop`). Fase 5 (DA-001, eliminación de cuenta) pendiente — requiere primero el diseño 5a, no iniciado.

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

**Cierre Fase 2:** commit `2dccabe` en `scenaia-bloque-3`, fast-forward a `develop` desde `50e6cc5`, push a `origin/develop` confirmado. Aprobada por Dirección; observación sobre reautenticación con contraseña actual registrada expresamente como mejora futura fuera de alcance, no como incidencia.

---

## Fase 3 — Gestión de sesiones (DA-004)

**Decisión de diseño:** se prioriza la capacidad nativa de Supabase Auth `signOut({ scope: 'others' })` — cierra cualquier otra sesión activa del usuario sin afectar a la sesión actual — en vez de `scope: 'global'`. Se eligió `others` porque es la interpretación más útil de "cierre de todas las sesiones" desde la perspectiva de seguridad del usuario (quien lo usa normalmente sospecha de otra sesión, no quiere cerrar la suya propia) y evita duplicar la función que ya cubre "Cerrar sesión" (`scope: local`, ya existente en el menú).

**Estudio de "sesiones activas" (listado):** revisado tal como pedía el plan, priorizando lo nativo antes de construir algo propio. No se encontró en la API pública de `supabase-js` un método sencillo para listar las sesiones activas de un usuario sin construir infraestructura propia (una ruta server-side adicional contra la Admin API, con manejo de `service_role`, y un mapeo de metadatos de sesión). No implementado en esta fase — no es una omisión, es la aplicación literal del criterio "se prioriza lo nativo" del plan aprobado; queda como posible ampliación futura si Dirección quiere autorizar esa infraestructura adicional.

**Archivos nuevos:**
- `app/cuenta/sesiones/SesionesPanel.tsx` — botón "Cerrar todas las demás sesiones" (`signOut({scope:'others'})`), con mensaje de resultado vía `translateAuthError`.

**Archivos modificados:**
- `app/cuenta/sesiones/page.tsx` — renderiza `SesionesPanel` en vez del aviso "próximamente".

**Validación:**
- Worktree limpio desde `develop` (`2dccabe`).
- `npx tsc --noEmit`: sin errores (confirma que `scope: 'others'` es una opción válida en la versión instalada de `@supabase/supabase-js`).
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 34/34 rutas; `/cuenta/sesiones` pasa de 1.45 kB (stub) a 2.63 kB, confirmando que el panel real quedó incluido.
- Funcional: `/cuenta/sesiones` sin sesión → `307` a `/auth/login`, verificado en vivo.
- Núcleo (SC-001–SC-004): sin cambios. Sin migraciones, sin cambios de Supabase, sin variables de entorno nuevas.

**Cierre Fase 3:** commit `4be5dc2` en `scenaia-bloque-3`, fast-forward a `develop` desde `2dccabe`, push a `origin/develop` confirmado. Aprobada por Dirección; evolución hacia listado/revocación individual de sesiones registrada expresamente como posible decisión arquitectónica independiente futura.

---

## Fase 4 — Cambio de correo electrónico (DA-002)

**Decisión de diseño — callback dedicado:** en vez de extender `app/auth/callback/route.ts` (el ya certificado por SEC-001/AEC-001 para registro y usado también, sin cambios, en el flujo de recuperación), se crea `app/auth/callback/email-change/route.ts`, específico para esta confirmación. Motivo: el callback compartido redirige a `/auth/update-password`, correcto para registro pero sin sentido tras confirmar un cambio de correo; y modificar su lógica para distinguir casos habría significado tocar un flujo ya certificado. Un callback propio, siguiendo el mismo patrón ya usado para la recuperación de contraseña (`app/auth/callback/recovery`), evita ese riesgo por completo.

**Sincronización `auth.users.email` → `profiles.email`:** vía un nuevo trigger, `on_auth_user_email_changed`, análogo en estructura a `handle_user_email_confirmed` (SEC-001) pero disparado por `OLD.email IS DISTINCT FROM NEW.email` en vez de por `email_confirmed_at`. Se dispara ante cualquier cambio real de `auth.users.email`, sin depender de que se origine en este formulario concreto — `profiles.email` nunca se escribe desde el cliente ni desde este callback, cumpliendo el requisito de DA-002 de que no exista una segunda fuente de verdad.

**Hecho no verificable desde el repositorio:** si Supabase exige confirmación de un solo lado (correo nuevo) o de los dos (correo actual y nuevo) para un cambio de email depende de la configuración de "Secure email change" del proyecto, ajustable solo desde el panel de Supabase — no visible ni verificable desde el código. El mensaje mostrado al usuario ("puede que necesites confirmar tanto desde tu correo actual como desde el nuevo") queda redactado para ser correcto en ambos casos, sin afirmar cuál aplica.

**Archivos nuevos:**
- `app/auth/callback/email-change/route.ts` — callback dedicado; redirige a `/cuenta/correo?confirmado=true` o `?expirado=true`.
- `app/cuenta/correo/CorreoForm.tsx` — formulario de cambio de correo (`updateUser({email})`), con mensajes vía `translateAuthError` y lectura de los parámetros de confirmación/expiración.
- `supabase/migrations/20260804140000_aec003_sync_email_on_change.sql` — trigger de sincronización. **No aplicada todavía.**

**Archivos modificados:**
- `app/cuenta/correo/page.tsx` — renderiza `CorreoForm` (envuelto en `Suspense`, requerido por `useSearchParams`) en vez del aviso "próximamente".

**Validación:**
- Worktree limpio desde `develop` (`4be5dc2`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 35/35 rutas; nuevas: `/auth/callback/email-change`, `/cuenta/correo` (1.44 kB → 2.81 kB, formulario real incluido).
- Funcional: `/cuenta/correo` sin sesión → `307` a `/auth/login`; `/auth/callback/email-change` sin `code` → `307` a `/cuenta/correo?expirado=true`. Ambos verificados en vivo.
- No se verificó en vivo el ciclo completo de confirmación (requiere la migración aplicada y un cambio de correo real de extremo a extremo).
- Núcleo (SC-001–SC-004): sin cambios. Ningún archivo de SEC-001/AEC-001 modificado (decisión de diseño del callback dedicado, ver arriba).

**Migración aplicada:** `20260804140000_aec003_sync_email_on_change.sql`, aplicada sobre `pnsirwtiiurczjwrayza` el 2026-08-04, verificada por `pg_get_triggerdef`.

**Commit provisional `64f1c7e`:** comiteado y empujado a `develop` exclusivamente para generar el Preview Deployment necesario para la validación manual — autorizado expresamente con ese único fin, sin constituir aceptación definitiva en ese momento.

**Investigación técnica intermedia (solo lectura, sin cambios de código):** la primera validación manual de Dirección mostró que `auth.users.email` no cambiaba tras confirmar. Investigación con evidencia real (consultas de solo lectura + logs de runtime del Preview) identificó dos causas simultáneas: (1) el proyecto exige confirmación doble (correo actual y correo nuevo) — `email_change_confirm_status=1` tras solo una confirmación lo demuestra directamente; (2) cero peticiones a `/auth/callback/email-change` en los logs del Preview durante toda la ventana de la prueba, consistente con que la URL de Preview (dinámica, por despliegue) probablemente no está en la lista de Redirect URLs permitidos de Supabase, haciendo que el enlace de confirmación no la usara. El trigger y la sincronización no se dispararon porque `auth.users.email` nunca llegó a cambiar en esa primera prueba — no por ningún fallo del código.

**Validación final, con las dos confirmaciones completas (correo actual y correo nuevo):**
- ✅ Cambio de correo efectivo.
- ✅ Login con el correo antiguo dejó de funcionar.
- ✅ Login con el correo nuevo pasó a funcionar.
- ✅ Identidad, nombre y perfil profesional sin alteración — únicamente cambió el correo.
- ✅ DA-002, el trigger y la sincronización `auth.users` → `profiles` confirmados correctos con evidencia real de extremo a extremo.

**Conclusión de Dirección, registrada tal cual:** la incidencia observada en la primera validación no fue un fallo de implementación, sino una validación manual incompleta (faltaba la segunda confirmación exigida por la configuración del proyecto). La investigación técnica se considera correctamente ejecutada y sus conclusiones, coherentes con la evidencia disponible en ese momento.

**Mejora de UX registrada para el futuro, fuera de alcance de este cierre:** el mensaje actual ("Puede que necesites confirmar tanto desde tu correo actual como desde el nuevo") pasa fácilmente desapercibido. Dirección propone, como expediente independiente futuro, hacer mucho más explícito el estado de las dos confirmaciones pendientes. No implementado — no autorizado en este cierre.

**Observación técnica no bloqueante, relacionada:** el hallazgo de la investigación intermedia sobre `/auth/callback/email-change` sin peticiones registradas en el Preview sigue sin resolver — es plausible que el flujo en Producción sí use el callback (dominio fijo, más probable que esté en la lista de Redirect URLs permitidos), pero no se ha confirmado. Queda anotado junto a la mejora de UX anterior, por si se quiere abordar en el mismo expediente futuro.

**Cierre Fase 4:** validada funcionalmente por Dirección Técnica, con las dos confirmaciones completas, sobre el Preview Deployment de `develop`. Sin necesidad de nuevo commit — el código ya está en `develop` desde el commit provisional `64f1c7e`, ahora confirmado como definitivo.
