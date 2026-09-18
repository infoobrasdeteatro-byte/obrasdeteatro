# ADR — SCENAIA-002C.1

## Patrón Oficial de Recuperación de Conocimiento Estructurado

**Estado:** APROBADO — segunda Decisión Arquitectónica Permanente del proyecto, tras PRD-001.
**Fecha de cierre:** 28 de julio de 2026.
**Aprobado por:** Dirección, Arquitectura Funcional, Arquitectura de Implementación (unanimidad).

---

## Contexto

SCENAIA-002B (auditoría de Knowledge Assets) demostró que el conocimiento del ecosistema ya existe, en su mayor parte, en el modelo relacional — el cuello de botella real está en cómo se recupera, no en el dato en sí. SCENAIA-002C diseñó una primera solución concreta para el dominio Obras. Este ADR abstrae ese diseño en un patrón que debe regir cualquier futuro motor de recuperación, para que cada dominio nuevo no tenga que redescubrir la misma arquitectura.

---

## Decisiones aprobadas

- Separación estricta entre interpretación del lenguaje y acceso a datos.
- Repository Layer nunca interpreta lenguaje natural — solo recupera datos.
- Knowledge Assets orquesta la recuperación de conocimiento — nunca accede directamente a persistencia.
- Prompt Composer permanece completamente desacoplado del mecanismo interno de recuperación.
- AI Gateway permanece completamente ajeno a cómo se construyó el conocimiento.
- Los motores de recuperación son específicos de cada dominio — el patrón se reutiliza, el contenido no.

De estas seis decisiones, las cuatro centrales (Repository Layer, Knowledge Assets, Prompt Composer, AI Gateway) no son principios nuevos: son invariantes ya existentes y ya verificados en el código real del proyecto, heredados y confirmados aquí para el caso específico del motor de recuperación — no inventados por este ADR.

---

## Patrón oficial

```
Consulta del usuario
   ↓
Normalización lingüística (normalizeText — ya existe, sin cambios)
   ↓
Domain Vocabulary (responsabilidad lógica — ver definición)
   ↓
Interpretación por reglas declarativas (específica de cada dominio)
   ↓
Search Criteria tipado (específico de cada dominio)
   ↓
Knowledge Assets (orquesta interpretación + ejecución)
   ↓
Repository Layer (traduce el criterio ya resuelto a consulta real — nunca interpreta)
   ↓
Modelo de datos (Supabase)
   ↓
Knowledge Assets (empaqueta en StructuredKnowledgeItem — contrato sin cambios)
   ↓
Prompt Composer (consume KnowledgeContext, sin conocer cómo se construyó)
   ↓
AI Gateway (sin conocer nada de lo anterior)
```

Este patrón es la referencia oficial para cualquier futuro Motor de Recuperación del proyecto. Las futuras implementaciones no deben rediseñarlo — únicamente especializarlo para cada dominio.

---

## Domain Vocabulary — responsabilidad arquitectónica explícita

**Aprobado como responsabilidad. No como componente independiente en esta implementación.**

### Contrato

- **Entrada:** texto ya normalizado mecánicamente.
- **Salida:** conceptos canónicos del dominio.

```
comedia, comedias, humorística  →  COMEDIA
lorca                            →  AUTOR:LORCA
infantil                         →  INFANTIL
```

### Responsabilidades

| Hace | No hace |
|---|---|
| Normaliza vocabulario | Interpretar intención |
| Resuelve sinónimos | Construir criterios |
| Unifica conceptos | Consultar datos |
| — | Aplicar reglas de negocio |

### Ubicación

Integrado dentro de la fase de normalización lingüística. Su extracción futura a módulo propio requiere evidencia objetiva de reutilización entre varios dominios reales (no anticipada).

---

## Principio de Madurez de la Abstracción (nuevo, permanente)

> *"Una responsabilidad puede existir antes que un componente. Los componentes aparecerán únicamente cuando exista evidencia suficiente de reutilización."*

Principio permanente del proyecto, aplicable más allá de este expediente: toda responsabilidad arquitectónica identificada se documenta y delimita en el momento en que se reconoce, pero solo se materializa como módulo, carpeta o interfaz propia cuando existe necesidad demostrada de reutilización real — nunca de forma preventiva. Domain Vocabulary es su primer caso de aplicación.

---

## Search Criteria

Recomendación: unión discriminada (`KnowledgeSearchCriteria = { domain: 'Obras'; criteria: WorkSearchCriteria } | ...`), no herencia con campos base compartidos — evita introducir estructuras genéricas no respaldadas por un estado real, coherente con PRD-001.

---

## Degradación — taxonomía formal

| Tipo | Ejemplo | Tratamiento obligatorio |
|---|---|---|
| Criterio no representable en el modelo | "obras para gira" | Se declara explícitamente no evaluable — nunca se sustituye por un campo aproximado |
| Criterio representable sin resultados actuales | "musicales" (0 en el catálogo real) | Se ejecuta el criterio real; ausencia de resultados se refleja explícitamente — nunca se amplía el criterio en silencio |
| Criterio ambiguo con más de una interpretación válida | "obras clásicas" (género vs. año) | Requiere decisión de producto explícita y documentada antes de implementar ese dominio |

---

## Extensibilidad

Añadir un criterio dentro de un dominio existente toca únicamente su tabla de reglas y su `XSearchCriteria`. Añadir un dominio nuevo exige su propio Criteria + Reglas + ejecución, sin rediseñar el patrón. Permanecen siempre estables: `KnowledgeContext`, `StructuredKnowledgeItem`, `KnowledgeSummary`, `NormalizedAIRequest`, `AIExecutionInput`, Prompt Composer, AI Gateway, Response Composer, Credit Manager, Decision Engine.

---

## Riesgos

Técnico (proliferación de tablas de reglas por dominio), de mantenimiento (conocer las capas al añadir un dominio), de acoplamiento (la tentación futura de tocar Prompt Composer/AI Gateway "ya que estamos" — el riesgo más importante, y el que este ADR existe para bloquear), de escalabilidad (coincidencia de texto libre válida para el volumen actual del catálogo, no necesariamente para miles de filas), de comprensión (más piezas que una función con condicionales, mitigado por tests de invariantes por capa), y de evolución hacia IA/RAG (no bloqueada — sustituir la interpretación por un `SemanticRetriever` real no toca nada aguas abajo, la interfaz ya está preparada desde IA-003).

---

## Alcance

Este ADR define exclusivamente la arquitectura de recuperación de conocimiento. **No define:** modelos de datos, reglas específicas de cada dominio, implementación, motores semánticos, IA, RAG ni embeddings — todo ello queda fuera de este documento, a resolver en los expedientes de implementación correspondientes.

---

## Consecuencias

A partir de este ADR, cualquier nuevo dominio implementa su Motor de Recuperación respetando este patrón, sin rediseñarlo. Domain Vocabulary queda documentado como responsabilidad, no como componente, hasta que un segundo dominio real justifique su extracción. El Principio de Madurez de la Abstracción queda vigente para todas las decisiones arquitectónicas futuras del proyecto.

**Cualquier modificación futura de este ADR deberá realizarse mediante un nuevo ADR que justifique expresamente el cambio.**

---

## Expediente siguiente

**SCENAIA-002C** — Implementación del Motor de Recuperación del Dominio Obras, sujeta íntegramente a las decisiones aquí recogidas. Pendiente de su propia Autorización de Implementación, con alcance y reglas propias, antes de escribir ningún código.
