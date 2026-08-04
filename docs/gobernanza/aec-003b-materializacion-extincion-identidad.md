# AEC-003B — Materialización de la Extinción de Identidad Digital

**Expediente:** AEC-003B (deriva de AEC-003 Fase 5)
**Ámbito:** implementación técnica de la arquitectura congelada en `docs/gobernanza/aec-003-fase5-especificacion-arquitectonica.md` (PA-001, DA-001 a DA-006).
**Estado:** Fases 1 y 2 CERRADAS (`a87496b`, en `develop`; Fase 2 pendiente de commit en este mismo ciclo). Fase 3 (verificación de condiciones previas, solo lectura) pendiente de autorización de inicio.

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

**Cierre Fase 2:** aprobada por Auditoría de Dirección Técnica sin condiciones de implementación adicionales.
