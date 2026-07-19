# CARACTERIZACIÓN ARQUITECTÓNICA — Orquestador del Flujo Completo

**Fecha:** 2026-07-19
**Base documental:** exclusivamente las 13 referencias consolidadas en `verificacion-documental-orquestador-completa.md`. Ninguna otra fuente.
**Objeto:** qué debe ser el Orquestador arquitectónicamente — no cómo debe implementarse. Ningún mecanismo, patrón, clase, interfaz, API ni tecnología.

---

## Vacíos documentales — tratados como tales, no resueltos ni asumidos

1. **Quién invoca al PCE** — sin confirmar por el propio documento de PCE (SC-004.1).
2. **Si el Orquestador debe coordinar también `recordMetric()` y `recordExecutionTrace()`**, además de `recordActivity()` — solo documentado para `recordActivity()`.
3. **La forma concreta de materialización del Orquestador** — sin especificar en ningún documento.

Ninguna propiedad de esta lista asume una respuesta a estos tres puntos. Donde una propiedad se ve afectada, se indica expresamente.

---

## Propiedades arquitectónicas

### PAO-01 — Debe coordinar la secuencia completa de procesamiento, decidiendo el flujo antes de que exista respuesta

**Evidencia:** SC-003, literal: *"decide el flujo completo de procesamiento antes de que exista cualquier respuesta."*
**Relación con otras propiedades:** PAO-06 concreta el contenido exacto de la secuencia que esta propiedad exige coordinar.
**Dependencia de vacío:** el alcance exacto de "coordinar" — si incluye el propio paso de invocar al PCE o si ese paso corresponde a otro elemento — depende del **Vacío 1**, no resuelto aquí.

### PAO-02 — No debe generar contenido

**Evidencia:** SC-003, "Principios del SPO": *"nunca genera contenido."*
**Relación:** independiente de PAO-03/04/05 — cada uno de los cuatro principios de SC-003 se trata por separado, tal como el propio documento los enumera.
**Dependencia de vacío:** ninguna.

### PAO-03 — No debe almacenar ni gestionar conocimiento del ecosistema

**Evidencia:** SC-003: *"nunca almacena conocimiento."*
**Relación:** independiente de PAO-02/04/05.
**Dependencia de vacío:** ninguna.

### PAO-04 — No debe mantener memoria ni estado propio entre invocaciones

**Evidencia:** SC-003: *"nunca mantiene memoria"*; reforzado en Fase C (*"el SPO no puede persistir nada"*) y en código real ya cerrado (`record-activity.ts`: *"sin mantener el mismo ningún estado"*).
**Relación:** independiente de PAO-02/03/05.
**Dependencia de vacío:** ninguna.

### PAO-05 — No debe contener prompts ni lógica de generación de IA

**Evidencia:** SC-003: *"nunca contiene prompts."*
**Relación:** independiente de PAO-02/03/04.
**Dependencia de vacío:** ninguna.

### PAO-06 — Debe preservar el orden del flujo oficial ya congelado

**Evidencia:** SC-003, diagrama de flujo: *"congelado, ningún asistente futuro podrá alterarlo."*
**Relación:** concreta el contenido de PAO-01 (qué secuencia exacta debe coordinar).
**Dependencia de vacío:** el punto de inicio exacto de esa secuencia (si el propio Orquestador invoca al PCE o lo recibe ya invocado) depende del **Vacío 1**.

### PAO-07 — Debe ser el único punto autorizado para invocar `recordActivity()` de Procesos Asíncronos, manteniendo a los componentes del Núcleo ajenos a esa relación

**Evidencia:** código real ya cerrado (`lib/procesos-asincronos/record-activity.ts`): *"solo el SPO... debe invocarla. Ningún componente del Núcleo... debe conocerla ni invocarla directamente."*
**Relación:** instancia concreta y verificada de PAO-01 (coordinación) aplicada a un caso documentado específico.
**Dependencia de vacío:** si esta misma propiedad se extiende a `recordMetric()`/`recordExecutionTrace()` depende del **Vacío 2** — no se asume ni se descarta aquí.

### PAO-08 — Su rol de coordinación es independiente de los 7 componentes del Núcleo — ninguno de ellos lo materializa ni lo absorbe

**Evidencia:** verificado en la clasificación previa (`verificacion-orquestador-flujo-completo.md`, ya parte de la documentación consolidada): los 4 "componentes internos" originales de SC-003 se disolvieron — 3 son hoy componentes de pleno derecho del Núcleo, 1 fue absorbido por AI Gateway (R-01) — sin que quede ningún resto agrupado; y verificado por invariante ya probada que ninguno de los 7 componentes del Núcleo invoca a otro.
**Relación:** consecuencia directa de PAO-01 (algo debe coordinar la secuencia) combinada con la evidencia de que ninguno de los 7 lo hace.
**Dependencia de vacío:** ninguna.

### PAO-09 — Mantiene una relación documentada, sin detalle adicional, con el SKM

**Evidencia:** SC-002, "Dependencias oficiales declaradas del SKM": nombra al SPO como una de las dependencias del SKM, junto a PCE, Response Composer y Agentes especializados.
**Relación:** independiente del resto — es una relación documentada, no una obligación de comportamiento; se incluye por completitud de cobertura documental, no porque añada una restricción verificable más allá de su propia mención.
**Dependencia de vacío:** ninguna — el vacío aquí es la falta de detalle en el propio documento origen, no uno de los tres vacíos ya identificados; no se amplía ni se completa.

---

## Validación interna

**Contradicciones:** ninguna encontrada entre las 9 propiedades — las cuatro restricciones (PAO-02/03/04/05) proceden literalmente de la misma enumeración de SC-003 y no se solapan entre sí ni con las positivas (PAO-01/06/07/08).

**Redundancias:** revisado el par más próximo, PAO-01/PAO-06 (ambas sobre "el flujo") — no redundante: PAO-01 es una propiedad de comportamiento (cuándo/qué decide), PAO-06 es una propiedad de contenido (qué secuencia concreta). PAO-07/PAO-08 revisados igual — PAO-07 es una instancia concreta ya verificada en código; PAO-08 es una propiedad estructural sobre su relación con el Núcleo — no se solapan.

**Cobertura:** las 9 propiedades cubren la totalidad de las 13 referencias documentales de la verificación previa, salvo las tres que constituyen, precisamente, los vacíos ya declarados (PCE, `recordMetric`/`recordExecutionTrace`, materialización) y la referencia a Response Dispatcher/R-01 (#7/#8 de la tabla), que no aporta una propiedad nueva sobre el Orquestador en sí — solo explica la disolución de sus antiguos "componentes internos", ya reflejada en PAO-08.

**Separación entre hechos y vacíos:** cada propiedad indica expresamente si depende de alguno de los tres vacíos (PAO-01, PAO-06, PAO-07) o no (PAO-02, PAO-03, PAO-04, PAO-05, PAO-08, PAO-09). Ninguna propiedad asume una respuesta no documentada.

---

## Resultado

Nueve propiedades arquitectónicas (PAO-01 a PAO-09), cada una con evidencia documental directa, sin contradicciones ni redundancias, con dependencias de vacío señaladas donde existen. No se ha propuesto ningún mecanismo, patrón, interfaz ni solución. Queda disponible para una futura validación arquitectónica — no autorizada, no iniciada, en esta actividad.
