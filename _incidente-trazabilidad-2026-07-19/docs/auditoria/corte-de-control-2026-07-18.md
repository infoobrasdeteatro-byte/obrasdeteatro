# CORTE DE CONTROL — ObrasDeTeatro® / ScenaIA (Bloque III)

**Fecha:** 2026-07-18
**Alcance:** Auditoría completa, contrastada contra documentación (memoria de gobernanza + Actas archivadas) y contra el código real del repositorio (`lib/`, `supabase/migrations/`, `docs/`, `app/`).
**Método:** cada afirmación de este documento se verificó contra al menos una de estas fuentes: listado real de directorios/archivos, `grep` sobre el código, o el contenido literal de una Acta ya archivada. Donde la única fuente es memoria conversacional (no archivada como documento), se señala explícitamente.

---

## 1. Bloques

| Bloque | Estado | Acta Global | Decisión abierta |
|---|---|---|---|
| **I — Núcleo de Procesamiento** | **CERRADO / CONGELADO** (arquitectura); implementado íntegramente dentro de Bloque III, Fase B | Acta Oficial de Cierre del Núcleo (2026-07-12) — **solo en memoria conversacional, nunca archivada como archivo en el repo** | Ninguna. Response Dispatcher (originalmente parte de Bloque I) resuelto vía R-01, absorbido por AI Gateway |
| **II — Subsistemas de ScenaIA** | **CERRADO / CONGELADO** (arquitectura, 2026-07-13); implementación **parcial** dentro de Bloque III (ver §2) | Acta de Cierre Oficial de la Fase 4 (2026-07-13), con addendum de Provider Gateway — **solo en memoria conversacional, nunca archivada** | R-02 (primer contrato de Subsistemas de Aprendizaje, pendiente); especificación detallada de Outbound/Inbound Provider Gateway (frontera ya congelada por DT-002, detalle no) |
| **III — Implementación** | **EN DESARROLLO** | No procede (el bloque no ha cerrado) — Actas Globales por fase: `acta-global-cierre-fase-b.md`, `acta-global-cierre-fase-c.md` | Ninguna DT nueva pendiente (DT-004 nunca se abrió — ver §4). R-01 resuelto, R-02 pendiente |

No existen bloques posteriores declarados.

---

## 2. Fases del Bloque III

### Fase A — Infraestructura Fundamental
- **Estado:** CERRADA.
- **Previstos:** Repository Layer, Knowledge Assets, Accounting Engine.
- **Implementados:** los 3.
- **Pendientes:** ninguno.
- **Actas:** `acta-cierre-knowledge-assets.md`, `acta-cierre-accounting-engine.md`. **El Acta de Cierre de Repository Layer nunca se archivó como archivo** (verificado: no existe en `docs/actas-bloque-3/`) — deuda de gobernanza ya señalada desde 2026-07-14, todavía sin resolver.
- **Bloqueo:** ninguno.

### Fase B — Núcleo
- **Estado:** CERRADA (Acta Global).
- **Previstos:** 7 componentes (Request Interpreter, PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer — orden corregido tras R-01).
- **Implementados:** los 7.
- **Pendientes:** ninguno.
- **Actas:** 7 Actas individuales + `acta-global-cierre-fase-b.md`.
- **Bloqueo:** ninguno.

### Fase C — Asíncrono
- **Estado:** CERRADA (Acta Global).
- **Previstos:** Procesos Asíncronos, Mi Trayectoria®.
- **Implementados:** ambos, alcance completo (Procesos Asíncronos v3, Mi Trayectoria® v1).
- **Pendientes:** ninguno para los consumidores actualmente conocidos.
- **Actas:** `acta-verificacion-fase-c.md`, `acta-cierre-procesos-asincronos-v1/v2/v3.md`, `especificacion-mi-trayectoria-fase1.md`, `acta-cierre-mi-trayectoria.md`, `investigacion-ejecucion-en-segundo-plano.md`, `acta-global-cierre-fase-c.md`.
- **Bloqueo:** ninguno.

### Fase D — Instrumentación
- **Estado:** EN CURSO.
- **Previstos:** Telemetría → Observabilidad → Analítica.
- **Implementados:** Telemetría (v1, cerrada).
- **Pendientes:** Observabilidad, Analítica — ninguno de los dos tiene Plan Técnico ni código.
- **Actas:** `acta-verificacion-fase-d.md`, `acta-cierre-telemetria.md`. Sin Acta Global (la fase no ha cerrado).
- **Bloqueo:** ninguno formal. **Pregunta señalada y no resuelta:** el modelo de sesión `auth.uid() = profile_id` no permite lectura agregada entre usuarios — Observabilidad, por su propia misión congelada ("monitorización de la actividad ya producida por el Núcleo"), es candidata real a necesitarlo. No impide abrir su Plan Técnico, pero probablemente la obligue a resolverlo durante él.

### Fase E — Optimización
- **Estado:** NO INICIADA.
- **Previstos:** Sistemas de Caché → Subsistemas de Aprendizaje.
- **Implementados:** ninguno.
- **Pendientes:** ambos.
- **Actas:** ninguna.
- **Bloqueo:** R-02 (primer contrato implementable de Subsistemas de Aprendizaje, no autorizado todavía) — condición ya prevista en el propio Plan Maestro, no un hallazgo nuevo de este corte.

---

## 3. Componentes arquitectónicos — inventario completo

| Componente | Estado | Dependencias | Prueba faltante | Implementación faltante | Deuda técnica aceptada |
|---|---|---|---|---|---|
| Request Interpreter | CERRADO | Ninguna (puro, sin I/O) | No | No | No |
| Professional Context Engine | CERRADO | Repository Layer | No | No | Subscription/perfil especializado siempre `null` (IA-001, IA-002) |
| ScenaIA Knowledge Model | CERRADO | Knowledge Assets | No | No | Solo 2/8 dominios CAT-001 accesibles (IA-003) |
| Decision Engine | CERRADO | Tipos de RI/PCE/SKM | No | No | `estimatedCost` siempre `null` (IA-004) |
| Credit Manager | CERRADO | PCE, Accounting Engine | No | No | Depende de IA-001/IA-004 sin resolver (fail-closed ya diseñado para ello) |
| AI Gateway | CERRADO | Decision Engine, Credit Manager | No | No | Ninguna llamada real a proveedor de IA (IA-006); `ExecutionAudit` siempre con campos técnicos `null` |
| Response Composer | CERRADO | AI Gateway | No | No | `RESPONSE_SUCCESS`/`RESPONSE_PARTIAL` nunca alcanzables hoy (depende de IA-006); IA-008 (responsable de contenido interpretado) |
| Repository Layer | CERRADO | Supabase (infraestructura) | VD-001/VD-002 (sesión real, RLS dinámico, no probados) | No | Acta de cierre nunca archivada como archivo |
| Knowledge Assets | CERRADO | Repository Layer | No | No | Solo cubre Obras/Organizaciones; sin motor semántico (IA-003) |
| Accounting Engine | CERRADO | Repository Layer | VD-003 (respuesta RPC real de PostgREST no verificada) | No | Sin consumidor real en producción (Credit Manager no lo invoca fuera de tests); sin camino a Stripe (DT-002 sin implementar) |
| Procesos Asíncronos | CERRADO (v3) | Repository Layer | No | No | Sin productor real en producción (cero invocaciones a `recordActivity` en `app/`, verificado) |
| Mi Trayectoria® | CERRADO (v1) | Procesos Asíncronos | No | No | Alcance parcial ya documentado (solo interpreta patrones de uso registrados, no toda la trayectoria profesional) |
| Telemetría | CERRADO (v1) | Repository Layer | No | No | Sin productor real en producción (mismo motivo que Procesos Asíncronos) |
| **Observabilidad** | **NO INICIADO** | Telemetría, `ExecutionAudit` (AI Gateway) | — | Plan Técnico + código completos | — |
| **Analítica** | **NO INICIADO** | `ExecutionAudit` (AI Gateway) | — | Plan Técnico + código completos | — |
| **Sistemas de Caché** | **NO INICIADO** | Repository Layer, Knowledge Assets | — | Plan Técnico + código completos | — |
| **Subsistemas de Aprendizaje** | **NO INICIADO** | Sin fuentes/mecanismo definidos (vacíos diferidos declarados) | — | Bloqueado por R-02, luego Plan Técnico + código | — |
| **Outbound Provider Gateway** | **NO INICIADO** | Ninguna especificada | — | Especificación detallada + Plan Técnico + código | Solo frontera/nomenclatura congelada (DT-002); **sin fase asignada en el Plan Maestro** |
| **Inbound Provider Gateway** | **NO INICIADO** | Ninguna especificada | — | Especificación detallada + Plan Técnico + código | Mismo estado que el anterior |

Componentes mencionados solo como contexto arquitectónico en SC-005, sin especificación propia (Biblioteca, Directorio Profesional, Convocatorias, Castings, Editorial, Paneles): **fuera de este inventario** — no tienen estado porque nunca se abrió su especificación, explícitamente fuera del alcance documental del Bloque II.

---

## 4. Decisiones Transversales

| DT | Estado | ¿Vigente? | ¿Sustituida? | ¿Investigación pendiente? |
|---|---|---|---|---|
| **DT-001** — Correlación de Peticiones | CONGELADA | Sí | No | Relación DT-001↔DT-002 para eventos entrantes sin `RequestId` de origen — señalada desde 2026-07-12, nunca resuelta, no bloqueante hasta ahora |
| **DT-002** — Frontera hacia Proveedores Externos no-IA | CONGELADA (frontera/nomenclatura) | Sí | No | Especificación detallada de ambos Gateway — pendiente desde el cierre de Fase 4 |
| **DT-003** — Relación Núcleo↔Dominios Funcionales | CONGELADA | Sí | No | Ninguna — aplicada consistentemente en Procesos Asíncronos y Mi Trayectoria® |

**Confirmación expresa solicitada: DT-004 nunca llegó a abrirse.** Fue investigada como candidata durante la Fase C ("¿hace falta una decisión transversal para la ejecución de Servicios de Plataforma en segundo plano?"), con conclusión negativa documentada en `docs/actas-bloque-3/investigacion-ejecucion-en-segundo-plano.md`: el modelo de "procesamiento diferido a sesión" basta para los consumidores congelados hasta ahora. **No existe ningún documento DT-004. La numeración de Decisiones Transversales sigue terminando en DT-003.** Condición de reapertura ya registrada: si Observabilidad o Analítica demuestran necesitar ejecución/lectura verdaderamente independiente de sesión (ver §5, punto 1), se retomarían directamente las 4 alternativas ya analizadas en esa investigación.

*Nota de alcance:* DA-001 (Decisión Arquitectónica sobre propiedad de límites de plan) y R-01/R-02 (revisiones de gobernanza del Plan Maestro) son series distintas de DT-xxx — no se listan aquí porque el corte solicitado es específicamente sobre Decisiones Transversales.

---

## 5. Investigaciones abiertas (reales, no hipótesis)

1. **Acceso agregado multi-usuario para Observabilidad/Analítica.** El modelo de sesión `auth.uid() = profile_id`, aplicado sin excepción en todo el proyecto, solo permite leer los propios datos. La misión ya congelada de Observabilidad ("monitorización... de la actividad ya producida por el Núcleo") es, por naturaleza, un concepto de plataforma, no de un solo usuario — no es una hipótesis, es una tensión ya verificada entre un contrato congelado y una limitación real de infraestructura. Obligatorio de resolver antes o durante el Plan Técnico de Observabilidad.
2. **Especificación detallada de Outbound/Inbound Provider Gateway.** Diferida desde el cierre de la Fase 4 (2026-07-13), nunca retomada. El Plan Maestro de Bloque III (5 fases, ya auditado) **no la incluye en ninguna fase** — es una pieza de la Arquitectura Oficial sin ruta de implementación asignada.
3. **Relación DT-001↔DT-002** para eventos entrantes de proveedores externos sin `RequestId` de origen (p. ej. un webhook de Stripe) — señalada desde el cierre de DT-002, nunca resuelta. Aplica directamente cuando se aborde el punto anterior.
4. **R-02 — primer contrato implementable de Subsistemas de Aprendizaje.** Prerrequisito ya fijado en el Plan Maestro, antes del segundo componente de Fase E — nunca resuelto.
5. **Orquestación real del pipeline y enrutamiento de `ExecutionAudit`.** Generalización verificada de IA-007 (redactada originalmente solo para Accounting Engine): hoy ningún componente del Núcleo está conectado en una ruta real de la aplicación (ver §6, hallazgo principal) — sin resolver esto, Observabilidad/Analítica/Accounting Engine (liquidación) no tendrán ningún dato real que consumir, solo datos de prueba.

---

## 6. Implementaciones pendientes (código ya decidido, todavía inexistente)

1. **Observabilidad** — Servicio de Plataforma, sin Plan Técnico ni código.
2. **Analítica** — Servicio de Plataforma, sin Plan Técnico ni código.
3. **Sistemas de Caché** — Servicio de Plataforma, sin Plan Técnico ni código (Fase E).
4. **Subsistemas de Aprendizaje** — Servicio de Plataforma, sin código; bloqueado por R-02.
5. **Outbound Provider Gateway** — sin código; solo frontera/nomenclatura congelada.
6. **Inbound Provider Gateway** — mismo estado.

**Hallazgo principal de este corte, verificado contra código real (`grep` sobre `app/`):** ningún route handler de la aplicación invoca la secuencia completa del Núcleo (Request Interpreter → ... → AI Gateway → Response Composer), ni existe ningún punto real que invoque `recordActivity()` (Procesos Asíncronos) o `recordMetric()` (Telemetría). Todo lo construido en Bloque III hasta ahora — Núcleo completo, Repository Layer, Knowledge Assets, Accounting Engine, Procesos Asíncronos, Mi Trayectoria®, Telemetría — existe como librería, verificada exhaustivamente por pruebas unitarias, **pero nunca conectada a una petición HTTP real.** No es responsabilidad de ningún componente ya cerrado (cada uno se validó correctamente contra el contrato de su dependencia inmediata, precedente aceptado desde Fase B) — es una pieza de integración que la arquitectura da por sentada (el "SPO" coordinando el flujo) pero que **no está asignada a ninguna fase del Plan Maestro** ni tiene dueño.

---

## 7. Validaciones pendientes

**Pruebas:** ninguna pendiente sobre lo ya cerrado — 211/211 pruebas superadas, `tsc --noEmit` limpio, `eslint` sin errores, verificado en este mismo corte (2026-07-18). Los componentes no iniciados no tienen pruebas porque no tienen código — ya cubierto en §6, no es una prueba "faltante" sino trabajo no iniciado.

**Migraciones:** las 7 migraciones existentes (`supabase/migrations/`) nunca se han aplicado a un proyecto Supabase real — VD-002 (políticas RLS no verificadas dinámicamente) y VD-003 (forma exacta de la respuesta de PostgREST para las funciones RPC de Accounting Engine) siguen abiertas, heredadas por cada componente posterior.

**Verificación arquitectónica:** VD-001 (propagación real de sesión de usuario, `cookies()`/`next/headers`) sigue sin poder probarse fuera de un contexto de petición Next.js real — limitación de entorno, documentada desde Repository Layer, nunca resuelta.

**Documentación/Actas:**
- Acta de Cierre de Repository Layer — nunca archivada como archivo (§2, Fase A).
- Acta Oficial de Cierre del Núcleo de Procesamiento (Bloque I) y Acta de Apertura del Bloque III — existen solo en memoria conversacional de sesiones anteriores, nunca archivadas en el repositorio.
- `docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md` — **verificado en este corte: sigue fechado 2026-07-08**, anterior al inicio de la transferencia de ScenaIA (2026-07-11). No reconoce ningún documento SC-00x/DT-00x/CAT-001/ADR-001 ni ninguna Acta de Bloque III.
- Especificación detallada de Outbound/Inbound Provider Gateway — pendiente como documento, no solo como código (§5, punto 2).

---

## 8. Riesgos arquitectónicos reales

1. **El pipeline completo del Núcleo nunca ha sido orquestado en código real.** Si el proyecto se declarara concluido hoy, ScenaIA no respondería a ninguna petición real de usuario, pese a tener sus 7 componentes de Núcleo cerrados y probados. Es la pieza que convierte "arquitectura implementada" en "sistema funcionando" — sin ella, no puede cerrarse el proyecto correctamente.
2. **Divergencia real ya verificada entre Nivel 1 y Nivel 2:** `app/api/webhooks/stripe/route.ts` usa `SUPABASE_SERVICE_ROLE_KEY` directamente, sin pasar por Repository Layer (SC-005.1, única frontera de persistencia) ni por el futuro Outbound/Inbound Provider Gateway (DT-002). Verificado contra código real durante la investigación de Fase C. **Nunca se ha registrado como incidencia arquitectónica formal** (sin número IA-xxx) — si el proyecto declara la arquitectura de persistencia como cumplida, esta excepción sigue viva y sin resolver en producción.
3. **`ESTADO_MAESTRO_DOCUMENTAL.md` (fuente única de verdad documental declarada) lleva sin actualizarse desde 2026-07-08.** No reconoce nada de ScenaIA. Riesgo de gobernanza real: cualquier incorporación futura al proyecto que confíe en ese documento no encontrará rastro de Bloque I/II/III.
4. **Tres Actas de gobernanza clave existen solo en memoria conversacional**, nunca archivadas: Acta de Cierre del Núcleo (Bloque I), Acta de Apertura del Bloque III, Acta de Cierre de Repository Layer. Si esa memoria no está disponible en una sesión futura, no hay forma de reconstruir esas decisiones desde el propio repositorio.

---

## 9. Próximo paso recomendado

Dos frentes, no uno solo — y en este orden:

**Primero, remediación documental de bajo coste, antes de seguir implementando** (§7/§8, puntos 3-4): archivar como archivos reales las tres Actas que hoy solo existen en memoria (Cierre del Núcleo, Apertura del Bloque III, Cierre de Repository Layer), y actualizar `ESTADO_MAESTRO_DOCUMENTAL.md` para que al menos reconozca la existencia de Bloque III. Es barato, no requiere decisiones nuevas, y elimina el riesgo de que esa información se pierda entre sesiones — exactamente el tipo de "tarea pendiente por detrás" que motivó este corte.

**Segundo, continuar la Fase D con el Plan Técnico de Observabilidad**, que es la consecuencia natural de tener Telemetría cerrada — con una condición: su propio Plan Técnico deberá abordar explícitamente la pregunta ya señalada en §5.1 (acceso agregado multi-usuario), no aplazarla otra vez.

**No recomiendo** abordar ahora mismo el hallazgo más grande de este corte (§6/§8.1, orquestación real del pipeline) como parte de la Fase D — es una pieza transversal, sin dueño ni fase asignada, que probablemente merezca su propia decisión de gobernanza (¿una fase nueva? ¿una ampliación del Plan Maestro?) antes de escribir código. Lo señalo con el mismo peso que un hallazgo de investigación, no lo resuelvo por iniciativa propia: la Dirección debe decidir cuándo y cómo se aborda, igual que ya se hizo con R-01 y R-02.
