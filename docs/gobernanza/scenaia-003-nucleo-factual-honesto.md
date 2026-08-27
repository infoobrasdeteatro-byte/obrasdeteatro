# SCENAIA-003 — Núcleo Factual Honesto

**Expediente:** SCENAIA-003, Evolución 01 del Motor Conversacional de ScenaIA. Complementario de IA-008 (Plan Técnico aprobado 2026-07-22), que creó `direct-content-builder`. **No es continuación del linaje SCENAIA-002** (Motor de Recuperación de Conocimiento): abre familia propia por decisión de Dirección de 2026-08-27.
**Ámbito:** composición determinista de la respuesta, exclusivamente dentro de `lib/direct-content-builder/`.
**Explícitamente fuera de ámbito:** los componentes, decisiones y capacidades enumerados de forma completa y normativa en §5 — `needsAI()`, PCE, SKM, SPO/Orquestador, Response Composer, Credit Manager, AI Gateway, `ResponseType`, cualquier documento de Nivel 1, historial, observabilidad, Repository Layer, Knowledge Assets, configuración, migraciones, Caso 4, D-1, D-2, D-3, conocimiento parcial como comportamiento propio de esta rama, IA adicional y créditos adicionales.
**Estado:** **APROBADO POR DIRECCIÓN — PENDIENTE DE AUTORIZACIÓN DE IMPLEMENTACIÓN. LA IMPLEMENTACIÓN NO ESTÁ AUTORIZADA.**
**Fecha de aprobación por Dirección:** 2026-08-27.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| **Identificador** | SCENAIA-003 |
| **Nombre** | Núcleo Factual Honesto |
| **Evolución** | Evolución 01 del Motor Conversacional de ScenaIA |
| **Fecha de decisión de Dirección** | 2026-08-27 |
| **Estado** | Aprobado por Dirección el 2026-08-27 — pendiente de autorización independiente de implementación |
| **Rama** | `scenaia-bloque-3` |
| **Commit base** | `12c1bd327625c1d041e4558713423e2cc1e6517c` |

**Justificación del linaje (decisión de Dirección, 2026-08-27):** SCENAIA-002 corresponde al Motor de Recuperación de Conocimiento. Esta evolución corresponde al comportamiento de composición determinista de la respuesta, y `direct-content-builder` nació en IA-008. No constituye continuación del linaje de recuperación, por lo que no se utiliza `SCENAIA-002D`.

**Verificación documental previa a la asignación:** `SCENAIA-003` no existía en documentación, código, migraciones, material archivado bajo `_incidente-trazabilidad-2026-07-19/` ni mensajes de commit de ninguna rama.

---

## 2. Objetivo

Conseguir que la respuesta determinista de ScenaIA sea **completa, natural, consciente de sus límites y honesta respecto de la información disponible**.

---

## 3. Visión de producto (contexto rector)

ScenaIA debe evolucionar hacia **la inteligencia especializada del mundo del teatro y todas sus ramificaciones**, con la experiencia objetivo que Dirección describe como «el ChatGPT del teatro».

**Esta frase es visión de producto. No constituye ni implica ninguna modificación de la arquitectura oficial.** Describe la experiencia y capacidad de asistencia perseguidas, no una intención de replicar la arquitectura interna de ningún otro sistema.

---

## 4. Alcance funcional ratificado

### Dentro

**Caso 1 — Hay información.** Presentación natural y contextual de la información realmente encontrada, agrupada por dominio. Ninguna etiqueta inventada ni reescrita: exclusivamente las presentes en `knowledgeSummary.entryLabelsByDomain`.

**Caso 2 — No hay información.** Comunicación clara de que no se encontraron resultados relevantes. No debe presentarse como error, ni como conocimiento insuficiente, ni como contenido vacío.

**Caso 3 — Criterio no reconocido.** Definición ratificada por Dirección, en su formulación exacta:

> Cuando un dominio devuelve resultados pero esos resultados no han reconocido el criterio concreto solicitado por el usuario, ScenaIA debe advertirlo de forma comprensible antes o junto a esos resultados, sin presentarlos como si cumplieran el criterio solicitado.

Su propósito es **proteger al usuario frente a una falsa impresión de precisión**, preservando la información encontrada.

### Lenguaje de la salida visible

No debe contener jerga interna, nombres de componentes ni códigos: `KnowledgeContext`, `knowledgeCompleteness`, `coveredDomains`, `needsAI`, `directContent`, `RESPONSE_*`, `IA-003`, `IA-008`, ni equivalentes.

---

## 5. Fuera de alcance

Ninguno de los siguientes elementos queda autorizado para modificación:

Caso 4 (aclaración conversacional) · D-1 (corrección interna de SKM) · D-2 (`detectedAmbiguities`) · D-3 (fallback del cliente) · conocimiento parcial como comportamiento propio de esta rama · nuevos `ResponseType` · Nivel 1 · IA adicional · créditos adicionales · Credit Manager · AI Gateway · PCE · SKM · SPO · Response Composer · `needsAI` · historial · observabilidad · Repository Layer · Knowledge Assets · configuración · migraciones.

**Nota sobre el conocimiento parcial.** Verificado que `knowledgeCompleteness === 'parcial'` produce `needsAI === true` y por tanto **no alcanza la rama determinista objeto de este expediente**. Queda fuera del alcance funcional. No debe simularse, aproximarse ni incorporarse artificialmente dentro de `direct-content-builder`, ni modificarse `needsAI`, el flujo de enrutamiento o el SKM para hacerlo alcanzable.

---

## 6. Decisiones ratificadas

**A1 — D-1.** No se modifica el SKM en esta evolución. El componente de composición no debe leer `knowledgeLimitations` de forma genérica; solo puede utilizar la señal exacta ya existente `unfilteredCriteriaNote(domain)`, por coincidencia exacta, cuando corresponda.

**A2 — Caso 4.** Permanece fuera de alcance. No debe construirse una falsa aclaración mediante `RESPONSE_DIRECT`. No se modifica `ResponseType`. No se abre Nivel 1.

**A3 — `directContent === null`.** Se conserva como guarda defensiva para el caso de `knowledgeDomains` vacío. No se modifica la firma pública `buildDirectContent(knowledgeContext: KnowledgeContext): string | null`.

**Caso 3.** Ratificado en su formulación de «criterio no reconocido» (sección 4).

**Reversibilidad.** La futura implementación será reversible. Su autorización no constituirá aceptación irrevocable del resultado.

---

## 7. Plan Técnico

### 7.1 Flujo actual verificado

`coordinate-flow.ts` invoca `buildDirectContent(knowledgeContext)` — **única invocación de producción en todo el repositorio**. El componente filtra los dominios con etiquetas; si no hay ninguno devuelve `null`; si los hay compone una cadena única, y añade por dominio un aviso cuando `knowledgeLimitations` contiene la coincidencia exacta de `unfilteredCriteriaNote(domain)`. `compose-response.ts` deriva `RESPONSE_DIRECT` cuando `needsAI === false` y emite el aviso `contenido no disponible (IA-008)` si el contenido es `null`.

### 7.2 Señales disponibles en la rama determinista

La rama solo se ejecuta con `knowledgeCompleteness === 'completo'`, lo que exige que todos los dominios solicitados estén cubiertos. En consecuencia, dentro de esta rama `domainsNotCovered` está siempre vacío y la limitación «dominio solicitado pero no cubierto» nunca aparece.

| Señal | Disponibilidad | Uso previsto |
|---|---|---|
| `knowledgeSummary.entryLabelsByDomain` | Disponible | Casos 1 y 2 |
| `knowledgeDomains` | Siempre no vacío en esta rama | Orden y agrupación |
| `unfilteredCriteriaNote(domain)` en `knowledgeLimitations` | Por dominio, coincidencia exacta | Caso 3 |
| Resto de `knowledgeLimitations` | Presente | **Prohibida su lectura** |

**Toda la información necesaria ya llega al componente. No se requiere transportar ninguna señal nueva ni añadir ninguna dependencia.**

### 7.3 Flujo futuro previsto

Idéntico en estructura. Cambia únicamente el cuerpo de `buildDirectContent`: composición natural para el Caso 1; declaración de ausencia en lugar de `null` para el Caso 2; aviso comprensible y sin jerga para el Caso 3; y conservación de `null` para la guarda defensiva de `knowledgeDomains` vacío.

### 7.4 Superficie prevista

| Archivo | Tipo de cambio | Contrato |
|---|---|---|
| `lib/direct-content-builder/build-direct-content.ts` | Cuerpo de función | Firma pública sin cambios |
| `lib/direct-content-builder/__tests__/build-direct-content.test.ts` | Actualización de 5 de sus 7 tests (4 de formato, 1 de comportamiento) | — |
| `lib/direct-content-builder/__tests__/contract-invariants.test.ts` | Solo adición. Los 5 invariantes existentes permanecen intactos | — |

**Condición de alcance.** Si durante la futura implementación apareciera una necesidad demostrada de tocar un cuarto archivo, deberá **detenerse la ejecución y elevarse a Dirección como decisión adicional**. Esta condición no constituye autorización para tocar ese cuarto archivo.

---

## 8. Condiciones de futura implementación

1. Solo los 3 archivos previstos.
2. Firma pública sin cambios.
3. `null` conservado como guarda defensiva.
4. Prohibida la lectura genérica de `knowledgeLimitations`.
5. Llamadas adicionales a IA = 0.
6. Créditos adicionales = 0.
7. `needsAI` no se modifica.
8. No se modifica ningún componente cerrado.
9. No se modifica ningún contrato.
10. No se introduce jerga interna en la salida visible.
11. No se introducen etiquetas inexistentes en `entryLabelsByDomain`.
12. Los invariantes existentes deben permanecer verdes.
13. La suite completa debe mantenerse en verde.
14. La reversión debe ser completa y contenida.
15. La aceptación funcional de Dirección será necesaria.

**Verificación estructural de las condiciones 5 y 6.** `buildDirectContent` es puro y síncrono, y su invariante vigente prohíbe importar AI Gateway o cualquier SDK de proveedor. La evolución no modifica `needsAI()`, único determinante de `estimateCost()` y de la reserva de crédito. Si `needsAI` no cambia, el consumo de crédito no puede cambiar.

---

## 9. Criterios de aceptación

**Compilar y pasar tests no equivale por sí solo a aceptación.**

**Técnico:** funcionamiento correcto · contratos preservados · tests en verde · ausencia de errores.

**Regresión:** capacidades existentes intactas · componentes cerrados intactos · comportamiento de IA intacto. Los archivos de prueba `compose-response.test.ts`, `coordinate-flow.test.ts`, `compose-prompt.test.ts` y `route.test.ts` utilizan el texto actual como dato de entrada, no como aserción sobre `buildDirectContent`: deben pasar sin modificación. Si alguno falla, es señal de alcance desbordado.

**Funcional:** resultados encontrados correctamente comunicados · ausencia de resultados correctamente comunicada · criterio no reconocido correctamente comunicado · lenguaje natural · ausencia de falsa precisión · ausencia de jerga interna.

**Arquitectura:** cero modificaciones fuera del alcance · cero IA adicional · cero créditos adicionales.

**Gobernanza:** verificación completa · aceptación expresa de Dirección.

---

## 10. Reversión

**Estado estable previo:** `12c1bd327625c1d041e4558713423e2cc1e6517c`.

La futura reversión deberá poder recuperar el comportamiento anterior revirtiendo exclusivamente los cambios autorizados. No existen migraciones, configuración ni estado persistido asociados a esta evolución: el componente afectado es puro y sin efectos secundarios, por lo que la reversión es total y sin residuo.

**No se ejecuta ninguna reversión en el momento de redactar este expediente.**

---

## 11. Estado del expediente

**SCENAIA-003 — Aprobado por Dirección el 2026-08-27. Pendiente de autorización independiente de implementación.**

Este expediente **no declara** la evolución implementada, cerrada, aprobada para producción, desplegada ni aceptada funcionalmente. La implementación requiere una autorización independiente y posterior de Dirección.

El Acta de Cierre será una actividad posterior, procedente únicamente cuando exista implementación, exista verificación, exista evaluación funcional y Dirección acepte el resultado.

---

## 12. Trazabilidad

**Actividades previas que fundamentan este expediente**, todas concluidas antes de su redacción: Expedición Técnica del Hito 3 (`needsAI`), con clasificación (c) — arquitectura existente correcta, presentación susceptible de evolución; Auditoría de Diseño de la política de comportamiento conversacional; Validación arquitectónica de la propuesta conceptual inicial; Expedición de Diseño «ScenaIA como inteligencia especializada del teatro»; Auditoría Técnica del Núcleo Factual Honesto; Micro-auditoría de decisión A1–A4; y Ratificación de Dirección sobre la formulación del Caso 3.

**Precedentes de gobernanza utilizados:** `docs/gobernanza/ux-012-pulido-flujo-extincion-identidad.md` como patrón estructural de expediente complementario de capa de presentación sobre un componente ya implementado y auditado; `docs/actas-bloque-3/acta-global-cierre-fase-b.md` §8, principio 4, sobre valores de contrato reservados pero no alcanzables; y `docs/expedientes/SCENAIA-002C1-patron-recuperacion-conocimiento.md` (ADR SCENAIA-002C.1) sobre el Principio de Madurez de la Abstracción.
