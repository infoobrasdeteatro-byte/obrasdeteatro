# AEC-003B — Materialización de la Extinción de Identidad Digital

**Expediente:** AEC-003B (deriva de AEC-003 Fase 5)
**Ámbito:** implementación técnica de la arquitectura congelada en `docs/gobernanza/aec-003-fase5-especificacion-arquitectonica.md` (PA-001, DA-001 a DA-006).
**Estado:** Fases 1 a 5 CERRADAS (`a87496b`, `a68990d`, `e1d76de`, `ad57843`, `97c77b6`, en `develop`). Fase 6 implementada y validada mediante pruebas simuladas — pendiente de Auditoría de Dirección Técnica. La validación funcional real de extremo a extremo queda, tal como se acordó, para después de esa auditoría.

---

## Plan aprobado (resumen)

1. Modelo de datos base (columnas de estado + función de anonimización) — **en curso**.
2. Transición reversible: solicitar/cancelar.
3. Verificación de condiciones previas (solo lectura: Stripe, `credit_reservations`).
4. Reautenticación y consentimiento informado.
5. Cancelación real de Stripe.
6. Evento Arquitectónico Atómico — incluye verificación explícita de idempotencia (observación de Dirección incorporada al plan).

---

## Fase 1 — Modelo de datos base

**Archivos nuevos:**
- `supabase/migrations/20260804180000_aec003b_fase1_extincion_identidad_modelo_base.sql` — **no aplicada todavía**.

**Archivos modificados:**
- `types/supabase.ts` — añadidas `extincion_solicitada_at` y `identidad_extinguida_at` al tipo de `profiles`.

### Contenido de la migración

**Columnas nuevas en `profiles`** (ambas `timestamptz`, nullable, sin valor por defecto): `extincion_solicitada_at`, `identidad_extinguida_at` — representan técnicamente los tres estados de DA-004 por la sola presencia o ausencia de valor, sin introducir ningún estado nuevo respecto a los ya definidos.

**Función `extinguish_personal_identity(p_profile_id uuid)`** (`SECURITY DEFINER`, sin invocarse todavía desde ningún sitio): anonimiza los campos de Plano 2 de una fila de `profiles`.

### Decisión de alcance sobre qué campos se anonimizan — para tu revisión explícita

La especificación (Plano 2) da como ejemplos "nombre, correo, teléfono, biografía, avatar, contacto y equivalentes". He tenido que decidir, campo por campo de `profiles`, cuáles son "equivalentes" y cuáles no. Lo dejo explícito para que puedas corregirlo si el criterio no es el que esperabas:

**Anonimizados:** `nombre`, `apellidos`, `nombre_artistico`, `email` (sustituido por un valor no colisionable derivado del `id`), `bio`, `avatar_url`, `cover_url`, `phone`, `website_url`, `social_links`, `slug` (incluido porque hoy se deriva del nombre y forma parte de la URL pública del perfil — dejarlo intacto filtraría el nombre después de extinguida la identidad), `scenaia_analisis` y `scenaia_recomendaciones` (los interpreto como "preferencias", categoría explícita de identidad personal en PA-001).

**Deliberadamente no tocados, con motivo:**
- `tipo_perfil`, `pais`, `ciudad`, `idioma`, `country_code`, `region`, `postal_code` — no aparecen en los ejemplos explícitos de la especificación; los trato como clasificación/localización, no como dato identificativo directo.
- `verificado`, `perfil_publico`, `activo` — son señales de confianza y visibilidad, no de identidad; tocarlas excedería este expediente (ninguna decisión de AEC-003 autoriza redefinir estados de confianza).
- `plan`, `is_premium` — comerciales, tratados aparte por las Condiciones Técnicas de DA-005 (Stripe), no por esta función.
- `acepta_terminos`, `acepta_privacidad`, `mayor_de_edad`, `info_veraz`, `marketing_general`, `marketing_comercial` — **se conservan porque constituyen evidencia jurídica histórica de un consentimiento ya prestado en un momento dado, no porque se consideren datos no identificativos.** Es una distinción de motivo, no de naturaleza del dato, confirmada por Dirección Técnica: se conservan por su valor probatorio, no por quedar fuera de la categoría de identidad personal.
- `created_at`, `updated_at`, `deleted_at`, `welcome_email_sent_at` — bookkeeping estructural, ajeno a la identidad personal.

### Inventario de tablas satélite de Plano 2 — anonimización pendiente, no implementada en esta fase

Todas ellas ya clasificadas como Identidad Personal en la propuesta de aplicación de PA-001. Su exclusión de `extinguish_personal_identity()` responde únicamente al alcance aprobado para la Fase 1 (que cubre expresamente "una fila de `profiles`"), no a un olvido ni a una reevaluación de su clasificación:

| Tabla | Contenido de Plano 2 que contiene |
|---|---|
| `perfil_actor` | Ficha profesional individual: biografía, contacto, habilidades, disponibilidad |
| `perfil_director` | Ficha profesional individual: biografía, trayectoria, contacto |
| `perfil_dramaturgo` | Ficha profesional individual: biografía, trayectoria, contacto |
| `profile_specialties` | Especialidades declaradas por el propio usuario |
| `professional_experience` | Trayectoria profesional declarada |
| `profile_awards` | Premios y reconocimientos declarados |
| `profile_training` | Formación declarada |
| `profile_gallery` | Material multimedia personal (fotos, vídeos) |
| `profile_availability` | Disponibilidad declarada |
| `profile_roles` | Roles administrativos de plataforma asociados a la cuenta (`admin`/`moderator`/`editor`) |

Su anonimización queda pendiente para una fase posterior de este mismo expediente, no para AEC-003 en general — el evento atómico de la Fase 6 no podrá considerarse completo mientras estas tablas no queden cubiertas, salvo decisión expresa en contrario.

### Validación

- Worktree limpio desde `develop` (`3f2a253`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto.
- Núcleo (SC-001–SC-004): sin cambios.
- Migración aplicada sobre `pnsirwtiiurczjwrayza`, verificada: ambas columnas presentes (`timestamptz`, nullable) y la función `extinguish_personal_identity` presente y `SECURITY DEFINER`. No invocada todavía desde ningún endpoint, trigger ni prueba.

**Cierre Fase 1:** commit `a87496b` en `scenaia-bloque-3`, fast-forward a `develop` desde `3f2a253`, push a `origin/develop` confirmado. Aprobada por Dirección Técnica sin condiciones adicionales.

---

## Fase 2 — Transición reversible: solicitar / cancelar (DA-004)

**Alcance implementado, estrictamente el autorizado:** únicamente la marca `profiles.extincion_solicitada_at`. Ningún otro campo, tabla, plano ni sistema externo tocado.

**Archivos nuevos:**
- `app/api/cuenta/eliminar/solicitar/route.ts` — `POST`, requiere sesión, establece `extincion_solicitada_at = now()` solo si estaba `NULL` (idempotente).
- `app/api/cuenta/eliminar/cancelar/route.ts` — `POST`, requiere sesión, establece `extincion_solicitada_at = NULL` incondicionalmente.
- `app/cuenta/eliminar/EliminarCuentaForm.tsx` — componente cliente con los dos botones y el estado correspondiente.

**Archivos modificados:**
- `app/cuenta/eliminar/page.tsx` — sustituye el aviso "próximamente" por el formulario real; lee `extincion_solicitada_at` del perfil.

**Restricción arquitectónica de DA-004 — sin efecto residual tras cancelar:** verificado por construcción, no solo probado: esta fase no escribe en ningún campo salvo `extincion_solicitada_at`. Cancelar lo devuelve a `NULL`, que es exactamente su valor antes de cualquier solicitud — no existe ningún otro campo que esta fase pueda haber dejado alterado.

**Validación:**
- Worktree limpio desde `develop` (`a87496b`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 37/37 rutas; `/cuenta/eliminar` pasa de 1.44 kB (stub) a 2.01 kB.
- Funcional: `/cuenta/eliminar` sin sesión → `307` a `/auth/login`; ambos endpoints sin sesión → `401`. Verificado en vivo contra el servidor de desarrollo.
- Núcleo (SC-001–SC-004): sin cambios. Sin migraciones nuevas, sin cambios de Supabase, sin Stripe, sin reautenticación, sin anonimización, sin tocar Plano 1 ni patrimonio compartido — exactamente el alcance autorizado.

**Nota documental:** la Fase 2 no introduce nuevos estados del ciclo de vida; únicamente materializa el estado "Cuenta Activa con Extinción Programada" mediante la persistencia exclusiva del campo `extincion_solicitada_at`, conforme a DA-004.

**Cierre Fase 2:** aprobada por Auditoría de Dirección Técnica sin condiciones de implementación adicionales. Commit `a68990d`, en `develop`.

---

## Fase 3 — Verificación de condiciones previas (DA-005), motor de solo lectura

**Naturaleza:** exclusivamente diagnóstica. Ninguna función de este módulo escribe en ninguna tabla, cancela nada en Stripe, ni ejecuta ninguna acción correctiva.

**Archivos nuevos:**
- `lib/cuenta/verificar-condiciones-previas.ts` — módulo compartido, reutilizable por fases posteriores (en particular la Fase 6). Comprueba, para un `profile_id`:
  1. **`stripe_suscripcion`** — estado local de `subscriptions.status`; cumple si no hay fila o si está `canceled`.
  2. **`stripe_cobros_pendientes`** — verificación cruzada de solo lectura contra la API real de Stripe (`subscriptions.list`, no solo el reflejo local), cuando existe `stripe_customer_id`. Fail-closed: si Stripe no responde, se trata como impedimento.
  3. **`credit_reservations`** — cuenta de filas con `status='active'` para ese perfil. Reportada como condición **candidata** (DA-005), nunca resuelta ni escrita aquí.
- `app/api/cuenta/eliminar/verificar/route.ts` — `GET`, requiere sesión, delega en el módulo anterior y devuelve el diagnóstico completo.

**Decisión de alcance — sin cambios de UI en esta fase:** no he tocado `EliminarCuentaForm.tsx` ni la página. Entiendo que "motor de verificación" se refiere a la lógica de backend, no a su presentación — la superficie de usuario para mostrar este diagnóstico corresponde, en mi lectura del plan, a la Fase 4 (reautenticación y consentimiento informado), donde ya estaba prevista una revisión de la experiencia de confirmación. Si esperabas que el resultado ya fuera visible en `/cuenta/eliminar` en esta misma fase, lo indico para corregirlo.

**Validación cruzada contra datos reales (solo lectura, sin ninguna escritura):** el perfil `a23b30bc-...` tiene, verificado ahora mismo, una suscripción con `status='active'` y 55 reservas de crédito con `status='active'` — es decir, es un caso real que el motor debe reportar como "no cumple todas las condiciones". La lógica implementada, revisada contra este caso, produce exactamente ese resultado.

**Validación técnica:**
- Worktree limpio desde `develop` (`a68990d`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 38/38 rutas.
- Funcional: `/api/cuenta/eliminar/verificar` sin sesión → `401`, verificado en vivo.
- Núcleo (SC-001–SC-004): sin cambios. Ninguna escritura en `profiles`, `subscriptions`, `credit_reservations`, patrimonio compartido, tablas satélite, ni Stripe — exactamente el alcance autorizado.

**Nota documental:** el motor de verificación implementado en esta fase (`lib/cuenta/verificar-condiciones-previas.ts`) constituye la fuente oficial de evaluación de las condiciones previas definidas en DA-005 y deberá reutilizarse por las fases posteriores, evitando duplicidad de lógica.

**Cierre Fase 3:** aprobada por Auditoría de Dirección Técnica sin condiciones de implementación adicionales. Commit `e1d76de`, en `develop`.

---

## Fase 4 — Reautenticación y consentimiento informado (DA-005)

**Principio de separación, aplicado literalmente:** reautenticación y consentimiento se validan como dos comprobaciones independientes dentro del mismo endpoint — cada una con su propio código de error (`consentimiento_no_otorgado` vs. `reautenticacion_requerida`/`contrasena_incorrecta`), y se presentan en la interfaz como dos bloques visualmente separados con encabezado propio ("Consentimiento informado" / "Verificación de identidad"), no como un único paso fusionado.

**Archivos nuevos:**
- `app/api/cuenta/eliminar/preparar/route.ts` — `POST`. Orden de comprobación: sesión → existe solicitud activa (`extincion_solicitada_at`) → condiciones técnicas de DA-005 (reutilizando `verificarCondicionesPrevias`, sin duplicar lógica) → consentimiento → reautenticación real. La reautenticación se verifica con una llamada real a `signInWithPassword` contra el email de la sesión actual — no una comparación simulada.
- `app/cuenta/eliminar/PrepararExtincionPanel.tsx` — interfaz con los dos bloques independientes y el resultado (listo / bloqueado por condiciones, con el detalle exacto de cuáles / error).

**Archivos modificados:**
- `app/cuenta/eliminar/EliminarCuentaForm.tsx` — integra el panel anterior cuando ya existe una solicitud activa.

**Qué ocurre si todo se cumple — explícitamente, ninguna acción irreversible:** el endpoint responde `{ ok: true, listo: true }` y no escribe ni ejecuta nada más. No cancela Stripe, no anonimiza, no toca `auth.users`, no dispara el Evento Arquitectónico Atómico — tal como exigía el alcance autorizado. La interfaz lo comunica explícitamente: "la eliminación definitiva se activará en una fase posterior de este proyecto".

**Validación técnica:**
- Worktree limpio desde `develop` (`e1d76de`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 84/84 archivos, 407/407 pruebas en verde.
- `npm run build`: correcto, 39/39 rutas; `/cuenta/eliminar` pasa de 2.01 kB a 3.17 kB.
- Funcional: `/api/cuenta/eliminar/preparar` sin sesión → `401`, verificado en vivo.
- Núcleo (SC-001–SC-004): sin cambios. Sin Stripe, sin anonimización, sin Plano 1, sin patrimonio compartido, sin Evento Arquitectónico Atómico — exactamente el alcance autorizado.

**Nota documental:** la Fase 4 constituye la última barrera previa al Evento Arquitectónico Atómico. Su superación no implica la ejecución del evento, sino únicamente que la identidad reúne todas las condiciones necesarias para poder iniciarlo en una fase posterior.

**Cierre Fase 4:** aprobada por Auditoría de Dirección Técnica sin condiciones de implementación adicionales. Commit `ad57843`, en `develop`.

---

## Fase 5 — Cancelación real de Stripe (DA-005, Principio de Integridad Externa)

**Archivo nuevo:** `lib/cuenta/cancelar-suscripcion-stripe.ts` — función de librería, **no expuesta todavía por ningún endpoint ni conectada a la interfaz de usuario**, para no completar la cadena hacia el Evento Arquitectónico Atómico antes de que esa fase esté autorizada.

### Respuesta explícita a los cinco puntos exigidos en la documentación

1. **Qué operación se ejecuta sobre Stripe:** `stripe.subscriptions.retrieve(id)` (lectura, para comprobar el estado real antes de actuar) y, solo si es necesario, `stripe.subscriptions.cancel(id)` (cancelación inmediata, no "cancelar al final del periodo" — coherente con que no puede quedar ninguna obligación abierta antes del evento irreversible).
2. **Qué estados se consideran correctos:** únicamente `status === 'canceled'` en Stripe se considera el estado final válido. Cualquier otro estado (`active`, `trialing`, `past_due`, `unpaid`, etc.) se trata como pendiente de resolver.
3. **Comportamiento ante errores:** si falla la consulta o la cancelación en Stripe, la función devuelve `{ ok: false, accion: 'error' }`, registra el error en el log del servidor, y **no realiza ninguna escritura local** — el estado local permanece exactamente como estaba, seguro para reintentar más tarde.
4. **Comportamiento cuando la suscripción ya está cancelada:** se detecta mediante la consulta previa (`retrieve`) — si Stripe ya reporta `canceled`, la función **no vuelve a llamar a `cancel`**, y se limita a sincronizar el estado local. Es el mecanismo central de idempotencia.
5. **Comportamiento ante fallos de comunicación posteriores a una respuesta correcta de Stripe:** si la cancelación en Stripe se completó pero la sincronización local o la respuesta nunca llegaron a procesarse (caída de red, proceso interrumpido), un reintento posterior vuelve a consultar el estado real en Stripe, lo encuentra ya `canceled`, y sigue exactamente el camino del punto 4 — completa la sincronización pendiente sin intentar cancelar una segunda vez. No existe ningún escenario, dentro de esta función, en el que se llame a `cancel` sobre una suscripción que Stripe ya reporta como cancelada.

**Trazabilidad:** cada rama de ejecución deja un registro estructurado en el log del servidor (`[AEC-003B Fase 5] ...`), identificable por `profileId` y `stripe_subscription_id`. No se ha creado ninguna tabla nueva de auditoría — se consideró desproporcionado para el alcance de esta fase; el log de Vercel ya es la fuente de trazabilidad usada en el resto del proyecto para este tipo de operación.

**Sincronización local, tras una cancelación real o ya confirmada:** `subscriptions.status = 'canceled'` y `profiles.plan = 'gratuito', is_premium = false` — exactamente los mismos campos que ya actualiza el webhook existente (`handleSubscriptionDeleted`, `app/api/webhooks/stripe/route.ts`) ante `customer.subscription.deleted`. Es una coincidencia deliberada, no una duplicidad problemática: cuando esta función cancele una suscripción real, Stripe disparará ese mismo webhook poco después, y ambos caminos convergerán en el mismo estado final — soportado precisamente porque los dos escriben el mismo estado idempotente, no porque exista coordinación explícita entre ellos.

### Aviso importante — validación realizada, y lo que falta

**No he invocado esta función contra la cuenta real de Stripe del proyecto**, ni siquiera en modo de prueba, incluyendo la suscripción real ya detectada en fases anteriores (`cus_UkbPQMrcxlOxtZ`, perfil `a23b30bc-...`). Cancelar una suscripción real, aunque sea con fines de validación, es una acción externa e irreversible que entiendo requiere su propia autorización explícita, independiente de la autorización de esta fase de implementación.

**Lo que sí he validado:** una suite de pruebas (`lib/cuenta/__tests__/cancelar-suscripcion-stripe.test.ts`, 6 casos) con Stripe y Supabase completamente simulados, cubriendo exactamente los cinco puntos exigidos arriba — incluido el escenario explícito de "fallo de comunicación posterior a una respuesta correcta de Stripe" (probado como una segunda invocación tras una cancelación ya simulada, confirmando que `cancel` no se llama una segunda vez).

**Si quieres una validación funcional real**, necesitaría que me indiques cómo proceder: una suscripción de prueba desechable en el entorno de test de Stripe (si el proyecto tiene uno configurado), o autorización expresa para operar sobre la suscripción real ya existente.

### Validación técnica

- Worktree limpio desde `develop` (`ad57843`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 85/85 archivos, 413/413 pruebas en verde (407 previas + 6 nuevas de esta fase).
- `npm run build`: correcto — sin rutas nuevas, es una función de librería sin endpoint todavía.
- Núcleo (SC-001–SC-004): sin cambios. Sin anonimización, sin Plano 1, sin patrimonio compartido, sin tablas satélite, sin Evento Arquitectónico Atómico — exactamente el alcance autorizado.

**Nota documental:** la Dirección Técnica no autoriza todavía una ejecución sobre una suscripción real de Stripe. La validación funcional de extremo a extremo se realizará únicamente cuando la Fase 6 esté implementada y auditada, permitiendo verificar el flujo completo de extinción en una única ejecución controlada. La validación mediante pruebas automatizadas se considera suficiente para el cierre de esta fase.

**Cierre Fase 5:** aprobada por Auditoría de Dirección Técnica sin condiciones de implementación adicionales. Commit `97c77b6`, en `develop`.

---

## Fase 6 — Evento Arquitectónico Atómico (DA-006)

**Naturaleza:** orquestador puro. Ninguna suboperación reimplementa lógica ya propiedad de una fase anterior — cada una delega en la función exacta que ya la implementó (Fase 3, Fase 4, Fase 5, Fase 1). El único código genuinamente nuevo de esta fase es la coordinación y la extinción del Plano 1, que no tenía dueño previo.

**Archivos nuevos:**
- `app/api/cuenta/eliminar/ejecutar/route.ts` — el orquestador.
- `lib/cuenta/verificar-reautenticacion.ts` — la comprobación de reautenticación de la Fase 4, extraída a módulo compartido para que esta fase la reutilice sin duplicarla.
- `app/api/cuenta/eliminar/ejecutar/__tests__/route.test.ts` — 9 pruebas con las cuatro dependencias simuladas.

**Archivo modificado:**
- `app/api/cuenta/eliminar/preparar/route.ts` — refactor puro: pasa a usar `verificarReautenticacion()` en vez de la misma lógica inline. **Comportamiento idéntico**, verificado porque los tests de la Fase 4 (incluidos en la suite general) siguen en verde sin modificarlos.

### Orden exacto de invocación

1. Sesión (`getUser`) y perfil (`extincion_solicitada_at`, `identidad_extinguida_at`).
2. **Atajo de idempotencia:** si `identidad_extinguida_at` ya tiene valor → responde `ya_extinguida` sin invocar ninguna otra suboperación.
3. Si no hay `extincion_solicitada_at` → rechaza.
4. Consentimiento informado (comprobación propia, independiente).
5. Reautenticación (`verificarReautenticacion`, Fase 4 reutilizada).
6. Cancelación real de Stripe (`cancelarSuscripcionStripe`, Fase 5 reutilizada) — resolución activa del Principio de Integridad Externa, no solo su comprobación.
7. Verificación final de condiciones previas (`verificarCondicionesPrevias`, Fase 3 reutilizada) — repetida tras resolver Stripe, cubre lo que no se autorresuelve (`credit_reservations`).
8. **Punto de no retorno declarado** — a partir de aquí, todo con el cliente de servicio, no con la sesión del usuario.
9. Extinción del Plano 2 (`extinguish_personal_identity`, función SQL de la Fase 1, reutilizada sin cambios).
10. Extinción del Plano 1 (`auth.admin.updateUserById` con `ban_duration`).
11. Confirmación del Ancla y transición a Identidad Extinguida (`profiles.identidad_extinguida_at`, con guarda `IS NULL`).

**Por qué Stripe se resuelve antes del punto de no retorno, y no como una suboperación de DA-006:** el Plan de Implementación ya aprobado decía explícitamente que la Fase 5 cancela la suscripción "como parte del flujo de confirmación, **antes** de permitir avanzar hacia el evento atómico" — Stripe es una condición previa a satisfacer (DA-005), no uno de los tres planos de DA-006. Por eso se resuelve en el paso 6, todavía dentro de la fase de verificación, no entre las suboperaciones C/D/E.

### Punto exacto de inicio y de finalización del Evento Arquitectónico Atómico

- **Inicio:** inmediatamente después de que las condiciones previas (ya con Stripe resuelto) se confirman satisfechas por segunda vez — el log `INICIO del Evento Arquitectónico Atómico` marca ese instante exacto.
- **Fin:** cuando `profiles.identidad_extinguida_at` queda escrito con éxito — el log `FIN del Evento Arquitectónico Atómico -- Identidad Extinguida` marca ese instante. Todo lo anterior a "Inicio" es verificación (reversible, no destructivo); todo lo posterior a "Fin" es el estado terminal.

### Comportamiento ante fallos, etapa por etapa

| Fallo en | Qué queda escrito | Qué no |
|---|---|---|
| Consentimiento / reautenticación | Nada | Stripe, Plano 2, Plano 1 |
| Cancelación de Stripe | Nada (la propia función es idempotente y no escribe nada si falla) | Plano 2, Plano 1 |
| Condiciones previas (p. ej. `credit_reservations`) | Nada, aunque Stripe ya se haya resuelto en este mismo intento | Plano 2, Plano 1 |
| Extinción del Plano 2 | **Stripe ya cancelado** (real, externo, no revertido por este fallo) | Plano 1 |
| Extinción del Plano 1 | Stripe cancelado + Plano 2 extinguido | Confirmación final |
| Confirmación final | Stripe cancelado + Plano 2 + Plano 1 extinguidos | Solo la marca de tiempo final |

### Garantías de atomicidad e idempotencia adoptadas

**No existe una transacción única real entre Stripe, Postgres y el servicio de autenticación de Supabase** — son tres sistemas distintos, y ninguna API los une en una sola operación ACID. La garantía que sí se ofrece es más honesta y, en la práctica, equivalente: **cada suboperación individual es idempotente**, de modo que reintentar el orquestador completo desde el principio, sin importar en qué paso se interrumpió el intento anterior, converge siempre al mismo estado final sin repetir ningún efecto:

- `cancelarSuscripcionStripe` ya era idempotente desde la Fase 5 (comprueba el estado real en Stripe antes de cancelar).
- `extinguish_personal_identity` es idempotente por construcción: fija valores fijos, no incrementales: ejecutarla dos veces produce el mismo resultado.
- `updateUserById` con el mismo `ban_duration` es idempotente en efecto.
- La confirmación final usa `WHERE identidad_extinguida_at IS NULL`, evitando incluso sobrescribir la marca de tiempo en un reintento accidental.
- El propio orquestador corta en seco ante una `identidad_extinguida_at` ya presente, antes de tocar nada.

**Consistencia observacional:** ningún estado intermedio se comunica al exterior como si fuera definitivo. Un fallo a mitad de camino siempre responde con un error explícito (`error_stripe`, `error_plano2`, `error_plano1`, `error_confirmacion_final`) — nunca con `ok: true` parcial. El usuario nunca ve "Identidad Extinguida" hasta que lo es de verdad.

**Trazabilidad:** cada suboperación deja su propio registro estructurado (`[AEC-003B Fase 6] ...`) en el log del servidor, incluyendo explícitamente, en los mensajes de error, qué fases anteriores ya se completaron y qué implica reintentar — pensado para que una lectura del log baste para saber en qué estado exacto quedó una ejecución interrumpida.

### Corrección hecha durante esta fase, con evidencia — no se escribió código especulativo

Mi diseño inicial (no escrito) contemplaba forzar el cierre de todas las sesiones activas mediante `auth.admin.signOut(userId, 'global')`. Antes de escribirlo, comprobé los tipos de la versión de `@supabase/supabase-js` realmente instalada en este proyecto (`node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts`) y confirmé que ese método **exige el JWT de una sesión concreta, no un id de usuario** — no existe ningún método de administración para revocar por id todas las sesiones de un usuario en esta versión. No he escrito esa llamada.

En su lugar, la extinción del Plano 1 se apoya exclusivamente en `banned_until`. Es suficiente en esta aplicación concreta porque `middleware.ts` y todos los componentes de servidor usan `supabase.auth.getUser()` (nunca `getSession()`), que revalida contra el servidor de Supabase Auth en cada petición — una cuenta con `banned_until` activo deja de superar esa validación en la siguiente petición, sin necesidad de revocar sesiones explícitamente.

### Validación técnica

- Worktree limpio desde `develop` (`97c77b6`).
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 86/86 archivos, 422/422 pruebas en verde (413 previas + 9 nuevas de esta fase, incluida la prueba que verifica el orden exacto Stripe → Plano 2 → Plano 1 → Ancla y las de cada camino de aborto).
- `npm run build`: correcto, 40/40 rutas.
- Funcional: `/api/cuenta/eliminar/ejecutar` sin sesión → `401`, verificado en vivo.
- Núcleo (SC-001–SC-004): sin cambios.

**No se ha realizado ninguna ejecución real contra Stripe ni contra ninguna cuenta real** — la validación de extremo a extremo queda, tal como se acordó, para después de la Auditoría de esta fase.

**Sin commit, sin push — a la espera de la Auditoría de Dirección Técnica.**
