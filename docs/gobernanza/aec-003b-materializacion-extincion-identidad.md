# AEC-003B — Materialización de la Extinción de Identidad Digital

**Expediente:** AEC-003B (deriva de AEC-003 Fase 5)
**Ámbito:** implementación técnica de la arquitectura congelada en `docs/gobernanza/aec-003-fase5-especificacion-arquitectonica.md` (PA-001, DA-001 a DA-006).
**Estado:** Fases 1 a 5 CERRADAS (`a87496b`, `a68990d`, `e1d76de`, `ad57843`, en `develop`; Fase 5 pendiente de commit en este mismo ciclo). Fase 6 (Evento Arquitectónico Atómico) pendiente de autorización de inicio — incluirá la primera validación funcional de extremo a extremo, con Stripe incluido, en una única ejecución controlada.

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

**Cierre Fase 5:** aprobada por Auditoría de Dirección Técnica sin condiciones de implementación adicionales.
