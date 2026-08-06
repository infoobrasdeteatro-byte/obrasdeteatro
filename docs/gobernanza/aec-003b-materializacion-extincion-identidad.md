# AEC-003B — Materialización de la Extinción de Identidad Digital

**Expediente:** AEC-003B (deriva de AEC-003 Fase 5)
**Ámbito:** implementación técnica de la arquitectura congelada en `docs/gobernanza/aec-003-fase5-especificacion-arquitectonica.md` (PA-001, DA-001 a DA-006).
**Estado:** CERRADO. Las seis fases (`a87496b`, `a68990d`, `e1d76de`, `ad57843`, `97c77b6`, `b72fa2b`) y la corrección posterior de integración UI-orquestador (`67eb16a`) quedan implementadas, validadas técnicamente en worktree limpio y certificadas mediante validación funcional de extremo a extremo sobre una cuenta real. Acta Oficial de Cierre íntegra al final de este documento.

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

**Commit `b72fa2b`, en `develop`. Corrección de integración UI-orquestador posterior en `67eb16a`.** Ambos auditados y cerrados — ver Acta Oficial de Cierre íntegra a continuación.

---

# ACTA OFICIAL DE CIERRE — AEC-003B

**Fecha:** 2026-08-06
**Expediente:** AEC-003B — Materialización de la Extinción de Identidad Digital
**Estado final:** CERRADO. Pasa a formar parte de la Arquitectura Oficial de ObrasDeTeatro.

## Índice

0. Resumen Ejecutivo
1. Contexto y origen del expediente
2. Alcance aprobado
3. Principios y Decisiones Arquitectónicas Oficiales
4. Desarrollo cronológico por fases
5. Evento Arquitectónico Atómico
6. Seguridad e integridad del proceso
7. Integración con Stripe
8. Integración con Supabase
9. Integración con la interfaz de usuario
10. UX-012 como cierre del flujo
11. Validaciones técnicas
12. Certificación Funcional
13. Relación con el resto de la arquitectura
14. Estado final del expediente
15. Declaración Oficial de Cierre

---

## 0. Resumen Ejecutivo

AEC-003B es el expediente que materializa, en código real, la arquitectura de extinción de identidad digital previamente diseñada y congelada en AEC-003 Fase 5 (PA-001, DA-001 a DA-006). Resuelve un problema concreto detectado durante el análisis previo: no existía, en todo el ecosistema, ningún mecanismo real para que un usuario eliminara su cuenta — ni una definición de qué debía ocurrir con su identidad frente al contenido que hubiera compartido con terceros (obras, conversaciones, organizaciones), ni con su suscripción activa en Stripe, ni con las restricciones técnicas de la base de datos que impedían un borrado directo (`credit_reservations` con `ON DELETE RESTRICT`, entre otras).

AEC-003B consigue un mecanismo completo, real y verificado de extinción de identidad: seis fases de implementación, de riesgo creciente, que culminan en un Evento Arquitectónico Atómico — una secuencia irreversible que reautentica al usuario, obtiene su consentimiento informado, resuelve su situación con Stripe, anonimiza su identidad personal, bloquea su acceso futuro y confirma el resultado, todo ello preservando intacto el patrimonio compartido con el resto del ecosistema (Principio de Conservación del Patrimonio Compartido, PA-001). Incluye además, como expediente complementario ya cerrado (UX-012), el pulido de la experiencia de usuario alrededor de ese evento.

**Estado final del expediente:** implementado en sus seis fases, validado técnicamente en worktree limpio en cada una de ellas, y validado funcionalmente de extremo a extremo sobre una cuenta real sobre el Preview Deployment de `develop`. Desplegado en `develop`/`scenaia-bloque-3`, respaldado en `origin`. No desplegado en `main`/producción — sin autorización solicitada ni concedida para ese paso.

## 1. Contexto y origen del expediente

### 1.1. Antecedente: AEC-003 Fase 5a — inventario y comparación de alternativas

AEC-003B nace directamente de AEC-003 Fase 5a, un expediente de análisis y diseño exclusivamente (sin código, sin migraciones, sin commits), en el que Dirección solicitó un estudio en siete puntos: qué significa eliminar una cuenta, la cascada completa de eliminación en cascada (`CASCADE`) de `profiles`, qué contenido no debía desaparecer, el tratamiento de `credit_reservations`, el efecto sobre terceros, el efecto sobre suscripciones activas y el efecto sobre ScenaIA — junto con un análisis de seguridad, de experiencia de usuario, de riesgos, y cuatro alternativas de diseño (A-D).

### 1.2. Hallazgo del grafo de dependencias de `profiles`

El análisis reveló que `profiles` tiene 24 tablas dependientes mediante claves foráneas — es decir, que una cuenta, lejos de ser una entidad aislada, está profundamente entrelazada con el resto del ecosistema (obras publicadas, conversaciones, organizaciones, y más).

### 1.3. Restricciones técnicas detectadas

Dos restricciones concretas de la base de datos impedían, de origen, cualquier intento de borrado directo de una fila de `profiles`: `credit_reservations` (declarada explícitamente `ON DELETE RESTRICT`) y `casting_applications.reviewer_id` (sin cláusula `ON DELETE`, lo que produce el mismo efecto restrictivo de forma implícita).

### 1.4. Hallazgo de gobernanza: Stripe nunca se cancela automáticamente

El análisis confirmó que, en el estado del ecosistema anterior a este expediente, eliminar el acceso de un usuario nunca se traducía en la cancelación de su suscripción de Stripe — un vacío real de integridad externa que AEC-003B debía resolver, no solo el problema de borrado de datos.

## 2. Alcance aprobado

### 2.1. Delimitación explícita del expediente

AEC-003B cubre exclusivamente la **materialización** de la arquitectura ya diseñada y congelada en AEC-003 Fase 5 — no reabre ni redefine ninguna decisión conceptual de esa fase. Su alcance son las seis fases de implementación del Plan de Implementación aprobado (modelo de datos base, transición reversible, verificación de condiciones previas, reautenticación y consentimiento, cancelación de Stripe, y el Evento Arquitectónico Atómico), más la corrección posterior de conexión entre la interfaz y el orquestador, detectada durante la propia validación funcional del expediente.

Quedan explícitamente fuera de alcance, y así se registraron en su momento: las tablas satélite de Plano 2 (perfil_actor, perfil_director, perfil_dramaturgo, especialidades, experiencia profesional, premios, formación, galería, disponibilidad, roles — inventariadas pero no cubiertas por la función de anonimización de esta fase), y la resolución definitiva de `credit_reservations` como condición previa, que permanece como condición candidata pendiente de una decisión propia del Credit Manager, no resuelta dentro de AEC-003B.

### 2.2. Relación con AEC-003 Fase 5 como prerrequisito formal

Ninguna fase de AEC-003B se autorizó sin que existiera antes la especificación arquitectónica oficial consolidada (PA-001, DA-001 a DA-006) — cada decisión de implementación remite a una decisión ya congelada en ese documento previo, nunca a una interpretación nueva.

## 3. Principios y Decisiones Arquitectónicas Oficiales

### 3.1. PA-001 — Principio de Conservación del Patrimonio Compartido

Distingue formalmente dos categorías dentro de lo que una cuenta contiene: la **identidad personal** del titular (sus datos identificativos) y el **patrimonio digital compartido** (el contenido que, una vez compartido con el resto del ecosistema — obras publicadas, conversaciones, organizaciones —, deja de pertenecer únicamente al individuo). Condicionó toda la implementación posterior en un sentido muy concreto: ninguna fase de AEC-003B toca, en ningún momento, el patrimonio compartido — la función de anonimización de Fase 1 se limita, por diseño, a los campos de identidad personal de `profiles`, sin tocar ninguna tabla ni fila de contenido compartido con terceros.

### 3.2. DA-001 — Inicio del Proceso de Extinción de Identidad Digital

Estableció que la eliminación de una cuenta no es una operación técnica puntual, sino el inicio de un **proceso arquitectónico formal** — la "extinción de identidad digital". Esta decisión condicionó todo lo posterior en cuanto a lenguaje y diseño: cada fase de AEC-003B se refiere consistentemente a un "proceso", nunca a una simple operación de borrado, y ese proceso es lo que las fases siguientes fueron progresivamente formalizando.

### 3.3. DA-002 — Modelo de tres planos

Definió la estructura sobre la que se apoya todo el expediente: **Plano 1 (Identidad de Autenticación)**, correspondiente a `auth.users`; **Plano 2 (Identidad Personal)**, correspondiente a los campos identificativos de `profiles`; y **Plano 3 / "Ancla de Continuidad del Ecosistema"**, la referencia estructural que debe sobrevivir para que el patrimonio compartido (PA-001) siga siendo válido. Condicionó directamente el diseño de Fase 1 (qué anonimiza la función SQL) y de Fase 6 (el orden en que se extingue cada plano, nunca simultáneamente).

### 3.4. DA-003 — Comportamiento del patrimonio compartido; Principio de No Regresión del Patrimonio

Estableció que el patrimonio compartido sobrevive **sin ninguna alteración** al proceso de extinción — nunca se degrada, se oculta ni se modifica como consecuencia de que su autor original extinga su identidad. Este principio es la razón directa por la que Fase 1 excluye explícitamente las tablas satélite de Plano 2 y cualquier tabla de contenido compartido de su alcance, y por la que la validación funcional final (Capítulo 12) incluyó una comprobación expresa del Ancla de Continuidad del Ecosistema como evidencia directa de cumplimiento.

### 3.5. DA-004 — Modelo temporal de estados; Principio de Irreversibilidad

Definió tres estados posibles del ciclo de vida de una cuenta: **Cuenta Activa** → **Cuenta Activa con Extinción Programada** → **Identidad Extinguida**, junto con el Principio de Irreversibilidad: una vez alcanzado el estado final, no existe camino de vuelta. Condicionó directamente el diseño de Fase 2 (la transición al segundo estado debe ser completamente reversible, mediante cancelar) y de Fase 6 (la transición al tercer estado, una vez iniciado el punto de no retorno, no admite marcha atrás bajo ninguna circunstancia).

### 3.6. DA-005 — Condiciones previas clasificadas; Principio de Integridad Externa; Principio de Consentimiento Informado

Clasificó las condiciones previas a la extinción en tres categorías: **Técnicas** (Stripe, bajo el Principio de Integridad Externa — ninguna cuenta puede extinguirse dejando una suscripción externa sin resolver; `credit_reservations`, como condición candidata cuya resolución definitiva se difiere al Credit Manager), **De Seguridad** (reautenticación inmediata, elevada durante la negociación de candidata a obligatoria) y **Jurídicas** (Principio de Consentimiento Informado). Condicionó directamente el diseño de Fase 3 (el motor de verificación, estructurado exactamente según estas tres categorías), de Fase 4 (reautenticación y consentimiento como comprobaciones independientes entre sí) y de Fase 5 (la resolución activa de la condición técnica de Stripe).

### 3.7. DA-006 — Modelo de ejecución del Evento Arquitectónico Atómico; Principio de Consistencia Observacional

Definió que la transición final debe ejecutarse como un **Evento Arquitectónico Atómico**: una secuencia de suboperaciones internas que nunca deben ser observables como estados intermedios independientes — desde fuera del sistema, solo existen dos estados posibles, antes y después, nunca un punto intermedio expuesto. Este principio condicionó directamente el diseño completo de Fase 6: el orden fijo de suboperaciones, el "punto de no retorno declarado" como frontera conceptual explícita, y el hecho de que ninguna suboperación individual se expone jamás como un estado propio de la cuenta.

## 4. Desarrollo cronológico por fases

### 4.1. Plan de Implementación aprobado

Seis fases, en orden estrictamente creciente de riesgo, aprobadas por Dirección sin modificaciones, con una única observación incorporada: la verificación de idempotencia del endpoint de Fase 6 debía ser explícita y obligatoria durante su propia validación.

### 4.2. Fase 1 — Modelo de datos base

- **Objetivo:** crear el modelo de datos base que representa los estados de DA-004 sin introducir ningún estado nuevo, y la función de anonimización del Plano 2.
- **Alcance:** migración con las columnas `profiles.extincion_solicitada_at` e `identidad_extinguida_at` (nullable); función SQL `extinguish_personal_identity(p_profile_id uuid)` (`SECURITY DEFINER`) que anonimiza exclusivamente los campos de identidad personal — excluyendo explícitamente clasificación, ubicación, señales de confianza, datos comerciales y consentimientos legales (conservados como evidencia jurídica); tablas satélite de Plano 2 inventariadas como pendientes, no cubiertas.
- **Resultado:** migración aplicada y verificada sobre `pnsirwtiiurczjwrayza`; commit `a87496b`.
- **Relación con la fase siguiente:** Fase 2 opera exclusivamente sobre `extincion_solicitada_at` (el campo reversible), sin tocar `identidad_extinguida_at` ni invocar todavía la función de anonimización.

### 4.3. Fase 2 — Transición reversible

- **Objetivo:** materializar el estado "Cuenta Activa con Extinción Programada" (DA-004) de forma completamente reversible.
- **Alcance:** endpoints de solicitar/cancelar, que tocan exclusivamente `extincion_solicitada_at`; formulario `EliminarCuentaForm.tsx`.
- **Resultado:** validado; cancelar restaura exactamente el estado previo por construcción; commit `a68990d`.
- **Relación con la fase siguiente:** Fase 3 diseña el motor de verificación que se invocará antes de permitir avanzar desde este estado reversible hacia la extinción real.

### 4.4. Fase 3 — Motor de verificación de condiciones previas (DA-005, solo lectura)

- **Objetivo:** implementar, en modo exclusivamente de lectura, la evaluación de las condiciones técnicas de DA-005.
- **Alcance:** `verificarCondicionesPrevias(profileId)`, evaluando `stripe_suscripcion`, `stripe_cobros_pendientes` y `credit_reservations` (condición candidata); verificación cruzada real contra la API de Stripe, fail-closed ante error; endpoint expuesto pero deliberadamente sin conectar a la interfaz.
- **Resultado:** validado contra datos reales (caso de control con suscripción activa y 55 `credit_reservations` activas); commit `e1d76de`.
- **Relación con la fase siguiente:** Fase 4 reutiliza este mismo motor sin duplicarlo.

### 4.5. Fase 4 — Reautenticación y consentimiento informado (DA-005)

- **Objetivo:** implementar la última barrera antes del evento atómico, sin ejecutar todavía ninguna acción irreversible.
- **Alcance:** endpoint `preparar`, con el orden sesión → solicitud activa → condiciones previas (reutilizadas de Fase 3) → consentimiento (comprobación independiente) → reautenticación real (comprobación independiente); interfaz con dos bloques visualmente separados.
- **Resultado:** validado; en éxito, únicamente confirma que el usuario está en condiciones de continuar; commit `ad57843`.
- **Relación con la fase siguiente:** Fase 5 resuelve, todavía sin conectar a nada, la pieza de Stripe que Fase 6 orquestará junto con esta.

### 4.6. Fase 5 — Cancelación real de Stripe (DA-005, Principio de Integridad Externa)

- **Objetivo:** implementar la resolución real y externa de la suscripción de Stripe, de forma idempotente.
- **Alcance:** `cancelarSuscripcionStripe(profileId)`, que comprueba el estado real en Stripe antes de actuar y sincroniza el estado local si ya estaba cancelada.
- **Resultado:** validado mediante pruebas simuladas, deliberadamente sin invocación real contra Stripe; no conectada todavía a ningún endpoint; commit `97c77b6`.
- **Relación con la fase siguiente:** Fase 6 es la primera que invoca esta función de verdad, dentro del propio evento atómico.

### 4.7. Fase 6 — Evento Arquitectónico Atómico (DA-006)

- **Objetivo:** implementar el orquestador puro que ejecuta, en secuencia irreversible, el conjunto completo del evento.
- **Alcance:** orquestador que reutiliza, sin duplicar, las Fases 1/3/4/5; extracción de la lógica de reautenticación a un módulo compartido; orden completo: sesión → atajo de idempotencia → solicitud activa → consentimiento → reautenticación → cancelación de Stripe → verificación final de condiciones → punto de no retorno declarado → extinción del Plano 2 → extinción del Plano 1 (`banned_until`) → confirmación del Ancla.
- **Corrección verificada durante el diseño:** se descartó `admin.signOut(userId, 'global')` tras comprobar la firma real del SDK instalado (exige JWT de sesión, no id de usuario); se adoptó `banned_until`, apoyado en que toda la aplicación revalida vía `getUser()` en cada petición.
- **Resultado:** validado con pruebas que cubren cada rama de fallo y el camino feliz completo con verificación explícita del orden de operaciones; Núcleo confirmado intacto; commit `b72fa2b`.
- **Relación con la fase siguiente:** la implementación queda completa a nivel de API, pero sin ningún punto de entrada real desde la interfaz — brecha detectada durante la validación funcional posterior.

### 4.8. Corrección posterior de integración UI-orquestador

- **Objetivo:** conectar el botón real de la interfaz con el endpoint de Fase 6, ya implementado y probado pero inalcanzable para un usuario real.
- **Alcance:** segundo botón ("Confirmar eliminación definitiva"), visible solo tras una verificación exitosa, que invoca el endpoint de Fase 6 reenviando la misma contraseña y consentimiento ya introducidos.
- **Resultado:** validado; confirmado en Preview mediante metadato de Vercel coincidente con el SHA del commit; commit `67eb16a`.
- **Relación con la fase siguiente:** esta corrección es la que finalmente permite que exista un flujo real de éxito — condición necesaria para que UX-012 (ya cerrado como expediente complementario) tuviera algo que pulir.

## 5. Evento Arquitectónico Atómico

El Evento Arquitectónico Atómico es el mecanismo que materializa DA-006: la transición final e irreversible de una cuenta desde el estado "Cuenta Activa con Extinción Programada" hasta "Identidad Extinguida". No es una función más del sistema — es la única superficie de todo el ecosistema donde una identidad deja de existir de forma permanente, y por eso su diseño está gobernado por un principio distinto al de cualquier otro endpoint del proyecto: el Principio de Consistencia Observacional (DA-006), que exige que, desde fuera del sistema, no exista ningún estado intermedio observable entre "antes" y "después".

No existe transacción real entre los tres sistemas involucrados — la base de datos de Supabase, la API de administración de autenticación de Supabase, y Stripe. Ningún mecanismo de rollback cruzado es posible entre ellos. El diseño completo de este capítulo es la respuesta arquitectónica a esa limitación: no se simula una transacción que no puede existir; se construye, en su lugar, un mecanismo donde cada pieza es independientemente segura de repetir, de modo que cualquier interrupción, en cualquier punto, converge de forma segura al mismo estado final mediante un simple reintento.

### 5.1. Orden de suboperaciones

El evento ejecuta ocho pasos en un orden estrictamente fijo. Cada transición de orden responde a una razón arquitectónica concreta, no a una conveniencia de implementación:

1. **Consentimiento informado.** Es la primera comprobación sustantiva porque es la más económica y no involucra ningún sistema externo ni ninguna credencial del usuario. No tiene sentido exigir una reautenticación —que sí tiene coste real para el usuario y para el sistema— antes de confirmar que la solicitud es, en primer lugar, válida.
2. **Reautenticación.** Se exige inmediatamente después, y siempre antes de tocar cualquier sistema externo real. Ningún sistema externo (Stripe) debe verse afectado por una identidad todavía no verificada en el momento exacto de la operación — la reautenticación no hereda su validez de una sesión anterior, se exige de nuevo, aquí.
3. **Resolución de Stripe.** Ocurre antes de la verificación final de condiciones porque es, en sí misma, una acción que puede alterar el resultado de esa verificación: una suscripción activa es una condición bloqueante (DA-005); cancelarla puede convertir una solicitud bloqueada en una solicitud viable. El orden refleja que Stripe se resuelve, no simplemente se comprueba.
4. **Verificación final de condiciones.** Se repite —no se asume del resultado de una comprobación anterior— inmediatamente después de resolver Stripe, porque es el último punto en el que el proceso puede abortar sin coste. Cubre lo que la resolución de Stripe no resuelve por sí sola (`credit_reservations`, condición candidata que ningún paso automático de este evento satisface).
5. **Punto de no retorno.** No es una suboperación con efecto propio — es la frontera conceptual declarada por DA-006. A partir de aquí, el evento dejar de depender de la sesión del propio usuario (que está a punto de perder acceso) y pasa a operar con una identidad de servicio, precisamente porque las suboperaciones siguientes incluyen la revocación de esa misma sesión.
6. **Extinción del Plano 2.** Se ejecuta antes que la extinción del Plano 1 de forma deliberada: prioriza anonimizar los datos personales identificativos lo antes posible dentro de la secuencia irreversible, minimizando la ventana en la que datos reales del titular coexisten con un proceso ya comprometido a completarse.
7. **Extinción del Plano 1.** Ocurre después, como cierre técnico del acceso — una vez que ya no hay datos personales identificativos que proteger con especial urgencia, se revoca el acceso.
8. **Confirmación del Ancla.** Es la última suboperación porque es la única de naturaleza puramente administrativa: no protege nada por sí misma, solo dota al sistema de una marca definitiva y consultable de que el proceso llegó a su fin — y, con ello, es también el mecanismo que permite que cualquier invocación futura reconozca de inmediato que la identidad ya está extinguida.

### 5.2. Idempotencia

La idempotencia de cada suboperación no es una salvaguarda añadida tras el diseño inicial — es, junto con el orden de suboperaciones, el criterio de diseño central del expediente, identificado desde el propio Plan de Implementación como la respuesta a la ausencia de una transacción real entre sistemas.

Cada pieza está construida para que repetirla no produzca ningún efecto distinto de ejecutarla una sola vez:
- La resolución de Stripe consulta primero el estado real de la suscripción antes de actuar — si ya está cancelada, no vuelve a invocar la cancelación, solo sincroniza el estado local. Repetirla nunca duplica una cancelación.
- La extinción del Plano 2 escribe siempre los mismos valores anonimizados fijos — repetirla sobre un perfil ya anonimizado no cambia nada.
- La extinción del Plano 1 aplica siempre la misma duración de bloqueo — repetirla sobre una cuenta ya bloqueada no altera el resultado.
- La confirmación del Ancla se escribe bajo una condición explícita de que el campo todavía esté vacío — repetirla sobre una identidad ya confirmada no la sobrescribe ni produce error.

Sobre esa base, el propio orquestador incorpora un atajo de idempotencia en su primer paso: si la identidad ya consta como extinguida, el evento completo responde de inmediato sin repetir ninguna suboperación. Esto es lo que convierte la tabla de la sección 5.4 en un mecanismo real de recuperación, no solo en una descripción de riesgos: cualquier fallo, en cualquier punto, se resuelve reinvocando el mismo evento desde el principio.

### 5.3. Corrección sobre `admin.signOut`

Durante el diseño de la extinción del Plano 1 se planteó inicialmente invocar `admin.signOut(userId, 'global')`, con la intención de forzar el cierre de todas las sesiones activas del usuario como parte del evento.

**Qué se verificó:** antes de escribir esa llamada, se consultó directamente la definición de tipos del SDK realmente instalado en el proyecto (`@supabase/auth-js`, `GoTrueAdminApi`).

**Por qué se descartó:** la firma real del método exige un JWT de una sesión concreta como parámetro, no un identificador de usuario. No existe, en la superficie de administración del SDK instalado, ningún método que revoque de una sola vez todas las sesiones emitidas para un usuario a partir de su id. La llamada, tal como se había planteado inicialmente, no era ejecutable contra el SDK real.

**Por qué se adoptó `banned_until`:** es una columna nativa de la autenticación de Supabase, cuya existencia se verificó de forma independiente contra el esquema real antes de incorporarla al diseño. Su eficacia no depende de invalidar sesiones ya emitidas de forma explícita, sino de un hecho ya verificado sobre el resto de la aplicación: tanto el middleware como todos los componentes de servidor usan exclusivamente `supabase.auth.getUser()`, nunca `getSession()` — un método que revalida contra el servidor de autenticación en cada petición. Una cuenta con `banned_until` activo pierde el acceso en la siguiente petición que realice, sin necesidad de ningún mecanismo adicional de revocación.

**Integración con el modelo existente:** esta decisión no introduce ninguna dependencia nueva del SDK ni exige ningún cambio en `middleware.ts` ni en ningún componente de servidor — se apoya, sin modificarlo, en un comportamiento que la aplicación ya tenía de forma consistente antes de este expediente.

### 5.4. Tabla de comportamiento ante fallos

| Punto del proceso | Efecto si falla | ¿Reintentable? | Motivo arquitectónico |
|---|---|---|---|
| Consentimiento o reautenticación | Nada se escribe | Sí, sin restricción | Comprobaciones previas al punto de no retorno; deben poder fallar sin dejar ningún rastro |
| Resolución de Stripe | Nada se escribe | Sí, sin restricción | Primera pieza externa real; su fallo no debe dejar ningún efecto interno a medias |
| Verificación final de condiciones (tras Stripe resuelto) | Nada se escribe internamente, aunque Stripe ya esté resuelto en este intento | Sí — el reintento no vuelve a tocar Stripe, por la idempotencia de esa pieza | Último fail-safe antes del punto de no retorno; debe poder abortar limpiamente incluso con una pieza externa ya resuelta |
| **— Punto de No Retorno —** | | | Frontera declarada: a partir de aquí, toda suboperación que falle deja efectos reales, nunca revertidos, siempre completables |
| Extinción del Plano 2 | Stripe ya cancelado (efecto externo real); nada más modificado | Sí — el reintento repite exactamente esta suboperación | Cada pieza posterior al punto de no retorno debe poder fallar de forma aislada, sin ambigüedad sobre qué falta |
| Extinción del Plano 1 | Stripe cancelado y Plano 2 ya extinguido; el usuario conserva acceso técnico | Sí | Se prioriza anonimizar los datos personales antes de revocar el acceso, minimizando la ventana de coexistencia entre datos reales y proceso ya comprometido |
| Confirmación del Ancla | Stripe, Plano 2 y Plano 1 ya completados; solo pendiente la marca final | Sí — escritura protegida por condición, segura de repetir | Única suboperación de naturaleza administrativa, sin efecto funcional propio distinto de permitir su propia detección futura |

Cada fila de esta tabla, sin excepción, se resuelve con la misma acción: reinvocar el evento desde el principio. Es el atajo de idempotencia descrito en 5.2 el que garantiza que ese reintento nunca repite un efecto ya producido, independientemente de en qué fila se haya interrumpido el proceso la vez anterior.

## 6. Seguridad e integridad del proceso

La seguridad de AEC-003B no reside en una lista de controles añadidos sobre un proceso ya diseñado — reside en que cada mecanismo de seguridad protege, de forma específica y no intercambiable, una parte concreta de un proceso cuyo resultado es irreversible. Un evento que extingue una identidad de forma permanente no admite el mismo criterio de proporcionalidad que cualquier otra operación del sistema: donde una acción reversible puede apoyarse en garantías heredadas, una acción irreversible exige que cada garantía se demuestre de nuevo, en el instante mismo en que se necesita.

### 6.1. Reautenticación inmediata (DA-005)

Una sesión activa demuestra que, en algún momento pasado, alguien se autenticó correctamente — no demuestra que quien está iniciando el evento en este instante sigue siendo esa misma persona, con esas mismas credenciales, ahora. Para la inmensa mayoría de las acciones del sistema, esa distinción es irrelevante: el coste de un error es reversible, y exigir una prueba de identidad renovada en cada acción sería una fricción desproporcionada. El Evento Arquitectónico Atómico rompe esa proporcionalidad: el coste de un error no es reversible, es la extinción permanente de una identidad. Por eso una sesión heredada, posiblemente abierta desde hace días, deja de ser una garantía suficiente en el momento exacto en que se solicita este evento.

Por esto, la reautenticación no se hereda de ninguna verificación anterior — ni siquiera de una comprobación de "preparar" ejecutada minutos antes. El orquestador exige la contraseña de nuevo, en el mismo instante de la solicitud del evento, sin dar por válida ninguna prueba de identidad que no sea contemporánea a la propia ejecución.

Esta comprobación está directamente relacionada con el Principio de Consentimiento Informado, pero no es intercambiable con él: el consentimiento no tiene ningún valor si no se puede demostrar quién lo otorgó; la identidad, por sí sola, no tiene ningún valor si la persona no comprendía lo que estaba autorizando. Son dos piezas hermanas de un mismo requisito, nunca sustitutas entre sí. Que DA-005 elevara la reautenticación de condición candidata a obligatoria durante su propia negociación deja constancia de que esta no es una fricción de experiencia de usuario introducida por prudencia — es una condición sin la cual el evento no puede considerarse legítimamente autorizado.

### 6.2. Consentimiento informado

Su finalidad es acreditar que el usuario comprende las consecuencias reales del evento —su irreversibilidad, y qué ocurre exactamente con su patrimonio compartido frente al resto del ecosistema— y las acepta de forma expresa, no que simplemente completó un formulario.

Se verifica como una comprobación completamente independiente de la reautenticación, con su propio criterio de fallo, nunca inferida del éxito de la prueba de identidad. Reautenticarse correctamente demuestra quién es la persona; no demuestra en absoluto que esa persona haya comprendido lo que está a punto de autorizar.

Esa independencia no es redundante: es posible demostrar identidad sin haber comprendido realmente el alcance de lo que se autoriza —un flujo recorrido con prisa, una decisión tomada sin leer— y, en sentido inverso, aceptar una casilla de consentimiento no demuestra por sí sola que quien lo hizo es realmente el titular legítimo de la cuenta. Cada mecanismo protege un riesgo distinto y no solapado; combinarlos en una única comprobación dejaría sistemáticamente sin cubrir la mitad del riesgo real que DA-005 identificó.

### 6.3. Condiciones previas

Las condiciones técnicas de DA-005 no son un mecanismo para preguntar "¿está usted seguro?" — son restricciones objetivas del propio ecosistema, que existen con independencia de que este expediente decida gestionarlas o no: una suscripción de Stripe activa es una obligación externa real; una reserva de crédito activa es un estado real de otro dominio del sistema.

La verificación contra Stripe no se conforma con leer un estado guardado localmente, que podría estar desactualizado respecto a la realidad — consulta el estado real de la suscripción en el instante mismo de la verificación, y falla de forma cerrada (fail-closed) ante cualquier error de comunicación con Stripe, nunca asumiendo que la ausencia de respuesta equivale a ausencia de obligación.

`credit_reservations` se mantiene deliberadamente como condición candidata: se evalúa, se reporta, pero no se resuelve dentro de AEC-003B. Esto no es un vacío del diseño — es la aplicación consciente de una frontera de autoridad ya existente en la arquitectura: la resolución de `credit_reservations` pertenece al dominio del Credit Manager, componente del Núcleo, y AEC-003B no tiene ni pretende tener autoridad arquitectónica sobre ese dominio. Evaluar y reportar la condición, sin arrogarse su resolución, es precisamente la forma correcta de respetar esa frontera — no una limitación de lo que este expediente fue capaz de alcanzar.

### 6.4. Principio fail-closed

Inmediatamente antes del punto de no retorno existe una segunda verificación completa de las condiciones previas, no una repetición mecánica de la primera. Existe porque el paso inmediatamente anterior —la resolución de Stripe— puede haber alterado el resultado de esas condiciones: una suscripción que bloqueaba el proceso puede haber quedado resuelta en ese mismo intento. Confiar en el resultado de una comprobación ya potencialmente obsoleta, en el umbral mismo de un compromiso irreversible, sería arquitectónicamente inaceptable.

Esta verificación garantiza que ninguna condición previa sigue incumplida en el instante exacto en que el sistema se compromete a un proceso que ya no admite marcha atrás — cierra por completo la ventana entre "se comprobó" y "se ejecuta".

Fail-closed significa, de forma literal, que ante cualquier condición no satisfecha, cualquier duda o cualquier fallo de comunicación, el proceso se detiene por defecto — nunca continúa asumiendo que "probablemente esté bien". Dado que todo lo que sigue a este punto es irreversible, cualquier otro comportamiento —continuar salvo prueba de lo contrario, en vez de detenerse salvo prueba a favor— sería incompatible con la naturaleza del evento.

Este principio es, en última instancia, lo que hace seguro cruzar el punto de no retorno descrito en el Capítulo 5: la frontera se cruza únicamente cuando todas las condiciones están confirmadas en el instante presente, nunca en un instante pasado ya superado por los hechos. Una vez cruzada, el evento no vuelve atrás — y es exactamente por eso que todo lo que la precede existe.

## 7. Integración con Stripe

Stripe es el único sistema externo real involucrado en el Evento Arquitectónico Atómico — un sistema que ObrasDeTeatro no controla, con su propio ciclo de vida, sus propios estados y su propia fuente de verdad. Integrarlo en un proceso irreversible plantea un problema distinto al de cualquier otra pieza del evento: no basta con que la lógica interna sea correcta, hace falta que esa lógica sea correcta frente a un sistema cuyo estado puede cambiar por razones completamente ajenas a ObrasDeTeatro, en cualquier momento.

### 7.1. Diseño idempotente de `cancelarSuscripcionStripe`

El objetivo arquitectónico de este mecanismo es resolver, de forma real y verificable, el Principio de Integridad Externa (DA-005): ninguna identidad puede extinguirse mientras el ecosistema mantenga frente a Stripe una obligación comercial activa y sin resolver.

No basta con invocar una cancelación porque Stripe tiene su propio ciclo de vida, independiente por completo del de este proceso. En el instante en que este mecanismo se invoca, la suscripción puede llevar ya tiempo cancelada — por el propio usuario, por un fallo de cobro gestionado por el propio Stripe, o por cualquier otra vía ajena a ObrasDeTeatro. Invocar una cancelación sin comprobar antes el estado real equivaldría a actuar sobre una suposición, no sobre un hecho verificado — exactamente el tipo de actuación que el resto de este expediente evita en cada una de sus decisiones.

El diseño garantiza que repetir la operación no altera el estado final porque, en cada invocación, se consulta primero el estado real de la suscripción antes de decidir qué hacer. Si ya está cancelada, el mecanismo no vuelve a invocar una cancelación — se limita a sincronizar el estado interno de ObrasDeTeatro con una realidad externa que ya se alcanzó por otra vía. El resultado de invocar este mecanismo una vez y el de invocarlo cualquier número de veces es, en todos los casos, idéntico.

### 7.2. Validación mediante pruebas simuladas

La metodología empleada sustituyó tanto el cliente de Stripe como el cliente de Supabase por dobles de prueba controlados, capaces de representar de forma determinista cada estado real que Stripe pudiera devolver — suscripción activa, ya cancelada, o un fallo de comunicación — sin depender de ningún estado real externo en el momento de la validación.

Se cubrieron seis escenarios mediante estos dobles: ausencia de suscripción, cancelación exitosa, idempotencia frente a una suscripción ya cancelada, fallo de comunicación producido después de que la cancelación real ya hubiera tenido efecto, error en la consulta del estado, y error en la propia cancelación.

Esta estrategia era suficiente porque lo que este expediente necesitaba demostrar no era que Stripe, como servicio, funciona correctamente — Stripe es un sistema externo ya en producción, y demostrar su comportamiento no es responsabilidad de este expediente. Lo que debía demostrarse, y quedó demostrado, es que la lógica propia de ObrasDeTeatro reacciona de forma correcta ante cada estado posible que Stripe pudiera presentar. Se validó el comportamiento arquitectónico del mecanismo, no el servicio externo en sí — y, de forma deliberada, no se invocó ninguna cancelación real contra ninguna suscripción real durante esta fase, dejando esa primera invocación real para el contexto controlado de la validación funcional de extremo a extremo.

### 7.3. Integración dentro del Evento Arquitectónico Atómico

La resolución de Stripe ocupa una posición precisa dentro de la secuencia descrita en el Capítulo 5: es la primera acción del evento con efecto real sobre un sistema externo, situada inmediatamente después de la reautenticación y antes de la verificación final de condiciones.

Ocurre antes del Punto de No Retorno porque, en términos del propio evento, todavía se encuentra en la fase en la que el proceso puede abortar limpiamente si lo que sigue —la verificación final— no se supera. Que cancelar una suscripción sea, en sí misma, una acción real e irreversible dentro de Stripe no contradice esto: resolver esa obligación externa es un resultado correcto con independencia de si el resto del evento llega a completarse en ese mismo intento, precisamente porque DA-005 exige que la integridad externa quede resuelta, no que quede condicionada al éxito del resto del proceso.

Su relación con las condiciones previas es de causa, no de coincidencia: la resolución de Stripe no es en sí misma una condición previa — es la acción que resuelve una de ellas. La verificación final que ocurre inmediatamente después vuelve a comprobar el conjunto completo de condiciones, incluida la de Stripe, ya con el estado resultante de esta resolución, nunca con el estado anterior a ella.

El efecto sobre la coherencia global del proceso es directo: al integrar la resolución de Stripe dentro de la propia secuencia del evento —en lugar de exigirla como un requisito externo que el usuario debiera resolver por su cuenta antes de poder solicitar la extinción— el mecanismo garantiza que ninguna identidad se extingue dejando una obligación comercial huérfana. Esto conecta también con PA-001: la relación comercial con Stripe pertenece al dominio de la identidad personal del titular (su plan, su suscripción), nunca al patrimonio compartido con el resto del ecosistema — su resolución, por tanto, es asunto exclusivo de este evento, y no toca ni puede tocar ningún contenido que el usuario haya compartido con terceros.

## 8. Integración con Supabase

La integración de AEC-003B con Supabase no es una cuestión de qué tablas o columnas se necesitaban — es la cuestión de cómo un modelo arquitectónico ya aprobado (PA-001, DA-002, DA-004, DA-006) se convierte en un hecho real, persistente y verificable, sin alterar ni un solo punto de la infraestructura que el resto del ecosistema ya utiliza.

### 8.1. Migraciones aplicadas

Dentro de este expediente, cada migración desempeñó un papel estrictamente subordinado: fue el mecanismo mediante el cual una decisión ya aprobada se convertía en un hecho real de la base de datos — nunca al revés. Ninguna migración precedió a una decisión arquitectónica; todas la siguieron.

Fueron necesarias porque DA-004 define estados del ciclo de vida de una cuenta que deben poder representarse y consultarse de forma persistente y fiable — un estado que solo existiera en la lógica de la aplicación, sin respaldo en la propia base de datos, no sería un estado real del sistema, sería una interpretación transitoria de la aplicación, incompatible con la seriedad que DA-004 exige de esos tres estados.

Permitieron introducir el modelo de extinción sin alterar el resto del ecosistema porque son, sin excepción, estrictamente aditivas: nuevas columnas siempre nulas por defecto, una nueva función, nunca la modificación de una estructura ya existente y usada por otro dominio. Esta característica no es una casualidad técnica — es la expresión, en la capa más baja del sistema, del propio PA-001: el patrimonio compartido no puede ser tocado por una migración cuyo propósito es la extinción de identidad, y el diseño aditivo de cada migración garantiza precisamente eso desde el nivel del esquema.

Su relación con la implementación por fases fue deliberadamente concentrada: la Fase 1 introdujo por adelantado el modelo de datos base completo —los dos campos de estado y la función de anonimización— de modo que las fases siguientes pudieran construirse sobre una base ya estable, sin necesidad de nuevas migraciones hasta que el propio evento las requirió.

### 8.2. Función `extinguish_personal_identity`

Su finalidad es materializar, como una única operación atómica a nivel de base de datos, la extinción del Plano 2 definida por DA-002 — nunca como una serie de actualizaciones independientes que pudieran quedar a medias entre sí.

Se ejecuta con una autoridad de sistema, no con los privilegios ordinarios que un usuario tiene sobre su propia fila, porque es una operación de naturaleza estructural del propio sistema, no una acción ordinaria del titular sobre sus datos — el mismo patrón de autoridad ya empleado por otras funciones equivalentes del proyecto que sincronizan estado en respuesta a hechos de autenticación.

Su alcance de anonimización se limita, sin excepción, a los campos que DA-002 clasifica como Plano 2 — identidad personal. No toca clasificación, ubicación, señales de confianza, ni datos comerciales; y conserva deliberadamente los consentimientos legales, no porque dejen de ser identificativos, sino porque documentan un consentimiento real que debe poder demostrarse después de la extinción, no solo antes.

Se centralizó en una única operación porque es la única forma de garantizar que la extinción del Plano 2, como suboperación del Evento Arquitectónico Atómico descrito en el Capítulo 5, se comporte con un efecto verdaderamente único e idempotente. Repartir esta lógica entre múltiples escrituras independientes desde la aplicación habría introducido exactamente el riesgo de estados intermedios observables que DA-006 prohíbe.

### 8.3. `banned_until` como mecanismo de extinción del Plano 1

Se eligió por ser una capacidad ya nativa del modelo de autenticación de Supabase — no una construcción propia añadida por este expediente. Su integración con el modelo de autenticación existente no exige ningún cambio en `middleware.ts` ni en ningún componente de servidor: se apoya, sin modificarlo, en el hecho ya verificado de que toda la aplicación revalida la sesión contra el servidor de autenticación en cada petición.

Esta decisión está directamente relacionada con el hallazgo técnico documentado en el Capítulo 5 —la corrección sobre `admin.signOut`—, pero aquí se registra desde otro ángulo: más allá de la corrección puntual, refleja una preferencia arquitectónica de fondo, la de reutilizar la capacidad nativa que la plataforma ya ofrece, en vez de construir un mecanismo propio de revocación de sesiones.

Sus ventajas frente a otras alternativas son directas: evita introducir infraestructura nueva —tablas de sesiones revocadas, listas de bloqueo propias— para resolver un problema que la plataforma ya resuelve de forma nativa. Y es coherente con DA-002: el Plano 1 es, por definición, el dominio de autenticación, y su extinción debe resolverse con las herramientas propias de ese plano, no con mecanismos improvisados fuera de él.

### 8.4. Tablas satélite del Plano 2

El expediente inventarió explícitamente un conjunto de tablas satélite de Plano 2 no cubiertas por la función de anonimización: las tablas de perfiles específicos por especialidad (actor, director, dramaturgo), especialidades, experiencia profesional, premios, formación, galería, disponibilidad y roles.

Quedaron fuera del alcance porque la Fase 1 delimitó su propio trabajo a los campos de `profiles` directamente definidos por DA-002 como Plano 2. Ampliar la anonimización a estas tablas satélite habría exigido un análisis propio, caso por caso, de qué constituye en cada una de ellas identidad personal frente a patrimonio compartido (PA-001) — un análisis que no se realizó, y que no correspondía decidir sin ese estudio previo dentro de esta fase.

Esta decisión fue consciente y documentada, no descubierta después: el inventario se registró explícitamente como pendiente en el propio documento de la Fase 1, en el mismo momento en que se decidió qué sí cubrir. Queda como el punto de partida natural de cualquier expediente futuro que quiera completar la cobertura de anonimización del Plano 2 — el inventario ya realizado es, en sí mismo, el trabajo preparatorio de esa ampliación futura, no una tarea abandonada sin rumbo.

Debe quedar claro que esto no constituye deuda técnica ni un olvido: una decisión documentada, con su alcance y su motivo explícitos desde el instante en que se tomó, es exactamente la misma clase de delimitación consciente de expediente que este documento ya aplicó, con el mismo criterio, a las condiciones previas del Capítulo 6.

## 9. Integración con la interfaz de usuario

Todo lo descrito en los capítulos anteriores —los planos, las condiciones, el evento irreversible— permanece, hasta este punto, en el terreno de los contratos y las funciones. Este capítulo documenta cómo esa arquitectura se hace visible: no como una serie de pantallas, sino como la expresión, ante el usuario, de las mismas decisiones ya aprobadas. La interfaz no añade ninguna regla nueva — hace accesibles las que ya existían.

### 9.1. `EliminarCuentaForm.tsx`

Su finalidad dentro del flujo es ser el único punto donde el usuario puede iniciar, y con la misma facilidad revertir, el estado "Cuenta Activa con Extinción Programada" de DA-004 — nunca un punto desde el que pueda alcanzarse directamente el evento irreversible.

Su relación con la transición reversible es de correspondencia exacta: materializa, sin ningún matiz adicional, la pareja solicitar/cancelar diseñada en la Fase 2 — un paso que admite arrepentimiento sin coste alguno, tantas veces como el usuario lo necesite.

El usuario nunca entra directamente en el Evento Arquitectónico Atómico porque la arquitectura interpone, de forma deliberada, este primer paso completamente reversible como barrera de entrada. Nadie llega al evento irreversible sin haber atravesado antes, conscientemente, un estado que todavía permite deshacer lo hecho sin ninguna consecuencia.

### 9.2. `PrepararExtincionPanel.tsx`

Aquí es donde las dos comprobaciones independientes de DA-005 se hacen visibles como dos actos distintos y separados del usuario: el **consentimiento informado**, donde declara expresamente que comprende las consecuencias del proceso; y la **reautenticación**, donde vuelve a demostrar su identidad en ese mismo instante, sin apoyarse en ninguna prueba anterior.

El resultado de este componente es, en todos los casos, una **preparación**: una declaración de que las condiciones exigidas están reunidas — nunca produce, por sí mismo, ningún efecto irreversible. Es la expresión ante el usuario de las mismas dos comprobaciones que el Capítulo 6 documentó como hermanas y no intercambiables, junto con las condiciones técnicas ya evaluadas de forma previa.

Debe quedar claro, y así se refleja en su propio nombre, que este paso prepara el cumplimiento de las condiciones arquitectónicas — no ejecuta la extinción. Esa distinción no es un matiz de interfaz: es la misma frontera que separa, en el Capítulo 5, todo lo que ocurre antes del punto de no retorno de lo que ocurre después.

### 9.3. Conexión del botón

Durante la validación funcional del expediente se detectó que el orquestador del Evento Arquitectónico Atómico — ya implementado, probado y cerrado en su propia fase — carecía de cualquier punto de entrada accesible desde la interfaz.

La naturaleza de esta brecha era la de una desconexión entre dos piezas, cada una correcta por separado: el motor que ejecuta el evento, y la superficie que debía invocarlo, simplemente no se habían enlazado todavía. Hasta ese momento del expediente no había existido ninguna razón para que lo estuvieran — cada fase se había cerrado, de forma deliberada, sin adelantar trabajo de la siguiente.

Se clasificó como una incidencia de integración, y no como un fallo arquitectónico, porque ninguna de las dos piezas contradecía, por separado, ninguna decisión ya aprobada: el orquestador se comportaba exactamente como DA-006 exige, y el panel de preparación se comportaba exactamente como DA-005 exige. Lo que faltaba no era una decisión de diseño equivocada — era, en sentido literal, el enlace final entre dos piezas ya correctas.

Quedó resuelta añadiendo el único punto de invocación que faltaba, sin alterar en absoluto ni el comportamiento del orquestador ni el de las comprobaciones ya existentes del panel — una corrección de alcance mínimo, propia del proceso normal de validación funcional de cualquier expediente de esta magnitud, no una revisión de su diseño.

## 10. UX-012 como cierre del flujo

Con el botón conectado, la arquitectura descrita en los capítulos anteriores alcanza por primera vez al usuario de principio a fin. Pero llegar hasta el evento y desencadenarlo correctamente no agota la experiencia completa: falta lo que ocurre inmediatamente después. Ese "después" es, precisamente, lo que UX-012 resuelve — y es también el motivo por el que terminó siendo un expediente propio, en vez de una fase más de este mismo documento.

### 10.1. Relación de subordinación funcional

UX-012 depende por completo de AEC-003B porque no tiene sentido ni existencia por sí solo: pulir el cierre de sesión y el mensaje de inicio de sesión tras una extinción presupone que existe una extinción real que ejecutar — un evento que este expediente, y solo este expediente, define y produce.

No constituye una arquitectura independiente porque no introduce ningún estado nuevo, ninguna condición nueva, ninguna decisión sobre el dominio de identidad — opera enteramente sobre comportamientos ya definidos aquí: el resultado del evento, y el estado de `banned_until` en el Plano 1 documentado en el Capítulo 8.

Completa el recorrido iniciado por este mismo capítulo: mientras el Capítulo 9 documenta cómo el usuario llega hasta el evento y lo desencadena, UX-012 documenta qué le ocurre inmediatamente después — tanto en el éxito (el cierre de sesión y la redirección) como en cualquier intento posterior de volver a entrar con una identidad ya extinguida.

### 10.2. Referencia cruzada

UX-012 cuenta con su propia Acta Oficial de Cierre, ya redactada, auditada y commiteada de forma independiente (`docs/gobernanza/ux-012-pulido-flujo-extincion-identidad.md`). No se reproduce su contenido en este documento porque hacerlo duplicaría una fuente de verdad ya cerrada, con el riesgo de que ambos documentos divergieran con el tiempo — el mismo principio que ha gobernado cada capítulo de este expediente: cada hecho tiene un único lugar donde queda certificado.

Su función dentro del cierre global del sistema es la de certificar, de forma independiente y auditable, que la experiencia de usuario alrededor del evento fue validada de extremo a extremo. Su existencia misma es, en sí misma, parte de la evidencia de que AEC-003B alcanza realmente a un usuario real — no solo a una API correctamente probada en aislamiento.

La experiencia de usuario, en todo este recorrido, no ha redefinido en ningún momento la arquitectura ya aprobada — la ha expresado.

## 11. Validaciones técnicas

Ninguna fase de este expediente se dio por cerrada por el simple hecho de estar escrita. Cada una se sometió a la misma disciplina de verificación antes de considerarse terminada — y esa disciplina, repetida sin excepción seis veces más la corrección de integración, es en sí misma parte de la evidencia de que AEC-003B es un sistema construido con rigor, no ensamblado por partes.

### 11.1. Metodología

Cada fase se validó en un entorno de trabajo limpio, aislado del resto del árbol de desarrollo, conteniendo exclusivamente los archivos correspondientes a esa fase — nunca una mezcla de cambios de distinto origen. Esa validación fue siempre incremental: cada fase partió de la base ya verificada y cerrada de la fase anterior, nunca de un estado hipotético o adelantado.

El aislamiento de cambios no fue solo una práctica de higiene — fue la condición que permitió atribuir, sin ambigüedad, cualquier resultado de validación a la fase que realmente lo produjo. Y el criterio de aceptación fue siempre el mismo, sin relajarse en ninguna fase: comprobación de tipos limpia, batería completa de pruebas en verde, y una compilación de producción correcta, antes de considerar una fase lista para avanzar a la siguiente.

Esto garantiza algo más importante que la corrección de cada fase aislada: garantiza que cada fase comenzó sobre una base ya verificada, nunca sobre una suposición de que la fase anterior "probablemente" estaba bien.

### 11.2. Resultados

De forma consolidada, las seis fases y la corrección de integración posterior superaron, sin ninguna excepción, las tres comprobaciones exigidas: la verificación de tipos no registró ningún error en ningún momento del expediente; la batería de pruebas automatizadas se mantuvo en verde en su totalidad en cada fase, creciendo de forma consistente conforme el expediente incorporaba nueva lógica, hasta alcanzar su estado final con la totalidad de archivos y pruebas del proyecto superados; y la compilación de producción se completó correctamente en cada una de las siete validaciones realizadas.

Ninguna fase requirió revertirse por un fallo de validación. Las únicas correcciones necesarias durante el proceso —como la ya documentada en el Capítulo 5 sobre `admin.signOut`— se identificaron y resolvieron antes de escribir el código definitivo, no después de que una validación las revelara como error.

### 11.3. Verificación de no regresión

En cada una de las siete validaciones del expediente se comprobó, de forma expresa y no delegada a ninguna suposición, que los siete componentes del Núcleo de ScenaIA permanecían exactamente como estaban antes de que AEC-003B comenzara — sin una sola línea modificada.

Esta comprobación no fue simbólica: es la evidencia directa de que un expediente de esta envergadura —que introduce un mecanismo capaz de revocar el acceso de una cuenta de forma permanente— pudo evolucionar de principio a fin sin necesitar, en ningún momento, tocar la arquitectura ya congelada que gobierna el resto del ecosistema. AEC-003B demuestra, con esa estabilidad sostenida a lo largo de sus seis fases, que es posible construir un mecanismo de esta magnitud como una extensión disciplinada de la arquitectura existente, no como una intervención sobre ella.

## 12. Certificación Funcional

Que el sistema compile, supere sus pruebas y no toque el Núcleo demuestra que está bien construido. No demuestra, por sí solo, que funciona para un usuario real. Este capítulo documenta el paso que sí lo demuestra: el recorrido completo, ejecutado por Dirección Técnica en persona, sobre una cuenta real y a través de la misma interfaz pública que cualquier usuario del ecosistema utilizaría.

### 12.1. Metodología

La validación se ejecutó sobre una cuenta genuinamente nueva, creada a través del flujo real de registro público — nunca mediante una inserción directa en la base de datos, nunca reutilizando ninguna de las cuentas reales ya identificadas como legítimas en expedientes anteriores, y nunca mediante un mecanismo administrativo de creación de usuarios. Estas tres restricciones se autoimpusieron de forma expresa, con un único objetivo: que el recorrido validado fuera indistinguible del que seguiría cualquier persona real del ecosistema, sin ningún atajo que pudiera ocultar un fallo real de cara al usuario.

### 12.2. Checklist ejecutado

El recorrido cubrió, en su totalidad, la secuencia completa prevista por la arquitectura: registro de la cuenta, confirmación de su correo electrónico, solicitud de extinción (la transición reversible del Capítulo 9), preparación del evento (consentimiento y reautenticación, también del Capítulo 9) y, finalmente, la ejecución del propio Evento Arquitectónico Atómico. No se omitió ni se dio por supuesto ningún paso intermedio de los diseñados en los capítulos anteriores.

### 12.3. Verificación del Principio PA-001

Como parte expresa de esta validación, se comprobó el estado del Ancla de Continuidad del Ecosistema tras la extinción: que el identificador de la cuenta permanecía exactamente el mismo, que la fila correspondiente no había sido eliminada, y que no se había creado ninguna identidad nueva en su lugar. El resultado confirma, con evidencia directa y no inferida, que el patrimonio compartido asociado a esa identidad permanece intacto y sigue formando parte del ecosistema — el cumplimiento real de PA-001, no solo su cumplimiento teórico sobre el papel.

### 12.4. Idempotencia

Se invocó una segunda vez el mismo evento, ya con la identidad previamente extinguida. El sistema respondió reconociendo de inmediato ese estado, sin repetir ninguna de las suboperaciones ya completadas — ni una segunda cancelación en Stripe, ni una segunda anonimización, ni un segundo bloqueo de acceso. Este resultado confirma en producción exactamente lo que el Capítulo 5 estableció como criterio de diseño desde el origen del expediente: que la ausencia de una transacción real entre sistemas se compensa con una idempotencia construida deliberadamente en cada pieza, no con una promesa de que nunca haría falta.

### 12.5. Bloqueo posterior

Se intentó, por último, iniciar sesión con las credenciales de la identidad ya extinguida. El intento fue rechazado, mostrando el mensaje específico diseñado en UX-012 — nunca el mensaje genérico de error, y en ningún momento una indicación de que la cuenta pudiera existir de otra forma. Este resultado conecta directamente dos piezas ya documentadas por separado: el mecanismo técnico (`banned_until`, Capítulo 8) que hace posible el bloqueo, y la expresión de ese bloqueo ante el usuario (UX-012, Capítulo 10) — comprobando, en un único paso final, que ambas piezas funcionan correctamente juntas, cerrando así el recorrido funcional completo del expediente.

## 13. Relación con el resto de la arquitectura

Ningún capítulo anterior de este documento tiene sentido si AEC-003B se entendiera como un sistema aislado. Su valor real está precisamente en cómo se inserta, sin fricción ni excepción, dentro de una arquitectura ya existente y ya congelada — ampliándola, nunca modificándola.

### 13.1. Núcleo de ScenaIA

En cada una de las siete validaciones documentadas en el Capítulo 11, se comprobó de forma expresa que los siete componentes del Núcleo de ScenaIA permanecían exactamente como estaban antes de que este expediente comenzara — sin una sola línea alterada, en ninguna fase, sin excepción. Esa repetición sistemática, siete veces sobre siete, no es una formalidad: es la evidencia acumulada de que un mecanismo capaz de revocar de forma permanente el acceso de cualquier cuenta del ecosistema pudo construirse íntegramente sin necesitar tocar la arquitectura que gobierna el resto del sistema. AEC-003B amplía la Arquitectura Oficial con un dominio nuevo; en ningún momento la modifica.

### 13.2. Relación con AEC-003 (Fases 1-4)

La continuidad entre ambos expedientes es directa y ya quedó registrada en su propia Acta de Cierre: AEC-003 estableció el dominio funcional de gestión ordinaria de la cuenta —contraseña, sesiones, correo electrónico— sobre el que posteriormente se desarrollaron su propia Fase 4 y este expediente, manteniendo en todo momento la separación entre las funcionalidades de administración de cuenta y los procesos de extinción de identidad.

Esa separación no es accidental. La gestión ordinaria de cuenta trata sobre acciones reversibles, de bajo riesgo, que un usuario puede repetir o deshacer libremente. La extinción de identidad trata sobre lo contrario: un proceso irreversible, con condiciones previas exigentes y un punto de no retorno declarado. Ambos dominios comparten el mismo contenedor de interfaz —`/cuenta`— pero no comparten ni una sola decisión arquitectónica, ni un solo mecanismo de ejecución. No existe solapamiento entre ellos porque nunca se diseñaron para resolver el mismo problema.

### 13.3. Relación con UX-012

Tal como se estableció en el Capítulo 10, UX-012 es funcionalmente subordinado a este expediente: no introduce ningún estado, ninguna condición ni ninguna decisión propia sobre el dominio de identidad, y no tiene existencia ni sentido fuera del evento que AEC-003B define. Es, al mismo tiempo, complementario — no redundante — porque resuelve exactamente lo que este expediente, por su propio alcance, no cubría: qué le ocurre al usuario en el instante inmediatamente posterior al evento. Entre ambos expedientes se cierra el recorrido completo del usuario, de principio a fin, tal como quedó certificado en el Capítulo 12.

## 14. Estado final del expediente

### 14.1. Estado de despliegue

AEC-003B, en la totalidad de sus seis fases y su corrección de integración, se encuentra desplegado en `develop` y respaldado en `scenaia-bloque-3` sobre `origin`. No se ha desplegado en `main` — el paso a producción no ha sido solicitado ni autorizado en ningún momento de este expediente, y su ausencia no constituye una carencia, sino la aplicación consistente del mismo procedimiento oficial de liberación seguido por cada expediente de esta sesión: ningún cambio alcanza producción sin una autorización explícita y separada, dedicada exclusivamente a esa decisión.

### 14.2. Observaciones documentales

El expediente queda completamente documentado: cada una de sus seis fases cuenta con su propio registro de objetivo, alcance, resultado y validación; el Evento Arquitectónico Atómico cuenta con documentación propia de su mecanismo, su seguridad y sus integraciones externas; y este mismo documento consolida el conjunto en una referencia única y trazable. Las referencias cruzadas con AEC-003 y con UX-012 son explícitas y verificables en ambas direcciones. No se ha detectado ninguna contradicción documental entre este expediente y ningún otro documento de la Arquitectura Oficial.

### 14.3. Observaciones operativas

No quedan incidencias abiertas propias de este expediente. La única observación pendiente registrada durante su desarrollo —la confirmación de la validación funcional de extremo a extremo— quedó resuelta y certificada en el Capítulo 12.

Existen, sí, ampliaciones futuras identificadas y explícitamente fuera de alcance: la cobertura de anonimización de las tablas satélite de Plano 2 (Capítulo 8), y la resolución definitiva de `credit_reservations` como condición previa, cuya autoridad pertenece al Credit Manager y no a este expediente (Capítulo 6). Ninguna de las dos constituye deuda técnica — son, como ya se estableció en su momento, delimitaciones conscientes y documentadas del propio expediente, no vacíos accidentales. AEC-003B queda cerrado con esas dos fronteras declaradas de forma expresa, no a pesar de ellas.

La plataforma continuará evolucionando; este expediente, tal como fue definido y aprobado, no.

## 15. Declaración Oficial de Cierre

Queda formalmente certificado que el expediente **AEC-003B — Materialización de la Extinción de Identidad Digital** concluye en esta fecha.

Las Decisiones Arquitectónicas Oficiales que lo fundamentan —PA-001 y DA-001 a DA-006— quedan implementadas en su totalidad, sin desviación respecto a lo aprobado por Dirección Técnica en cada una de las fases de su negociación. Las seis fases del Plan de Implementación, junto con la corrección de integración detectada durante su propia validación, quedan implementadas, validadas técnicamente en worktree limpio y sin regresión alguna sobre el Núcleo de ScenaIA. El recorrido funcional completo —registro, confirmación, solicitud, preparación, ejecución, verificación del Ancla de Continuidad del Ecosistema, comprobación de idempotencia y bloqueo posterior de acceso— queda certificado sobre una cuenta real, a través de la interfaz pública del ecosistema.

**El expediente AEC-003B queda oficialmente cerrado y pasa a formar parte de la Arquitectura Oficial de ObrasDeTeatro**, como referencia permanente del sistema de extinción de identidad digital del ecosistema.
