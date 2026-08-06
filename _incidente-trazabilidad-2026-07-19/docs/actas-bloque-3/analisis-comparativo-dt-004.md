# ANÁLISIS COMPARATIVO — DT-004
## Mecanismo de Acceso para Servicios de Plataforma con Alcance Transversal

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación
**Fecha:** 2026-07-18
**Estado:** Propuesta de solución (Chief Architect) — pendiente de revisión y Acta de Cierre de la Dirección, mismo procedimiento ya usado en DT-001/DT-002/DT-003.

---

### 1. Objeto

Responder, exclusivamente, a la pregunta que delimita el alcance de DT-004: **¿cuál es el mecanismo autorizado para que un Servicio de Plataforma cuya misión exige alcance transversal pueda acceder a datos agregados, respetando SC-005.1 y el modelo de seguridad ya congelado?** No diseña Analítica. No modifica Repository Layer. No abre migraciones. No implementa autenticación. Es, exclusivamente, una decisión de mecanismo.

### 2. Por qué procede abrir DT-004 ahora, y no en Fase C

La investigación de Fase C (`investigacion-ejecucion-en-segundo-plano.md`) concluyó que ningún consumidor congelado entonces exigía romper el modelo de sesión — no se abrió DT-004 por falta de necesidad demostrada, nunca por descartar la pregunta en sí. Tres hechos, todos posteriores, cambian esa conclusión para Analítica específicamente:

1. Analítica tiene una misión documental ("interpretación de **negocio**") textualmente distinta de la de cualquier otro consumidor ya congelado — verificado, no asumido, en `verificacion...` de Analítica y en la investigación de acceso específica.
2. La Alternativa D (diferido a sesión), que resolvió Procesos Asíncronos y Mi Trayectoria® sin abrir DT alguna, queda **excluida estructuralmente** para Analítica — no por preferencia, sino porque ningún consumidor de un solo perfil puede satisfacer, bajo el RLS actual, una necesidad de agregación entre perfiles.
3. El Hallazgo 2 (persistencia de `ExecutionAudit`), que en un primer momento parecía un obstáculo adicional, quedó reclasificado como ampliación normal de Repository Layer — deja de ser un impedimento para decidir el mecanismo.

Ya no se pregunta si hace falta decidir — se pregunta cuál es la decisión.

### 3. Alcance evaluado

Las tres alternativas ya identificadas en la investigación de Fase C, re-evaluadas contra el estado actual del proyecto. No se introduce ninguna alternativa nueva — ningún documento revisado demuestra que A, B o C hayan dejado de ser válidas en sí mismas (D queda excluida para este consumidor, no del catálogo general).

---

## 4. Alternativa A — Service Role encapsulado exclusivamente dentro de Repository Layer

Un cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY`, instanciado únicamente dentro de Repository Layer, nunca expuesto directamente — solo a través de funciones nombradas y de alcance estrecho (mismo principio ya exigido a toda escritura de Repository Layer: "ninguna mutación genérica, solo operaciones nombradas con contrato propio").

| Criterio | Evaluación |
|---|---|
| Compatibilidad con SC-005.1 | **Alta.** SC-005.1 exige que Repository Layer sea la única frontera de persistencia — no exige un mecanismo de autenticación concreto. Confinado dentro de Repository Layer, con funciones nombradas y estrechas, refuerza esa frontera única en vez de romperla. |
| Compatibilidad con el modelo de seguridad congelado | **Media-baja.** El modelo vigente en todo el proyecto ha sido, sin excepción, `auth.uid() = profile_id` vía RLS. Un service role bypasa RLS por completo — no contradice ningún principio Nivel 1 (el propio texto de SC-005.1 no lo prohíbe; "sin cliente privilegiado" se verificó como convención de Nivel 2), pero rompe, por primera vez de forma gobernada, la uniformidad de mecanismo mantenida hasta ahora. |
| Impacto sobre principios Nivel 1 | Ninguno directo — no reabre ningún contrato ya congelado. |
| Complejidad de implementación | **Baja.** Un cliente adicional dentro de Repository Layer, funciones nuevas y estrechas. Sin cambios de esquema (sin nuevo tipo de perfil, sin infraestructura de tokens). |
| Coste de mantenimiento | **Medio.** Exige disciplina continua para que el service role nunca se filtre fuera de funciones nombradas y estrechas — el riesgo no es técnico sino de gobernanza sostenida (mismo tipo de riesgo que ya materializó el webhook de Stripe, P-014, cuando esa disciplina no existía). |
| Riesgo arquitectónico | **Alto.** El radio de impacto de una clave de servicio mal usada, filtrada, o de una futura función mal acotada es la base de datos completa, no solo los datos agregados que Analítica necesita — el mayor riesgo estructural de las tres alternativas. |
| Reutilización por futuros consumidores | **Alta**, pero cada reutilización añade otra función con capacidad de bypass total — el riesgo agregado crece con cada nuevo consumidor, no se diluye. |
| Compatibilidad con el Registro de Pendientes | Ofrece, como efecto colateral positivo, una vía de remediación futura para **P-014** (el webhook de Stripe podría migrarse a este mismo patrón gobernado) — única de las tres alternativas con esta ventaja adicional. |

## 5. Alternativa B — Usuario de sistema con políticas RLS específicas

Un perfil de sistema real (fila propia en `profiles`, con su propio `auth.users`), autenticado con sus propias credenciales, al que se le conceden nuevas políticas RLS explícitas de `SELECT` sobre las tablas concretas que un consumidor transversal necesita — sin bypass, sin cliente privilegiado: sigue siendo RLS evaluado normalmente, solo que autoriza a un actor adicional, identificable y auditable.

| Criterio | Evaluación |
|---|---|
| Compatibilidad con SC-005.1 | **Alta — la más alta de las tres.** No introduce ningún tipo de cliente nuevo ni ningún bypass; usa exactamente el mismo `createClient()` de sesión ya existente, con una identidad distinta. |
| Compatibilidad con el modelo de seguridad congelado | **Alta.** El modelo (`auth.uid()`-vía-RLS) se preserva íntegro — esta alternativa opera *dentro* de él, no lo rodea. Cada política nueva es declarativa, auditable e inspeccionable con las mismas herramientas ya usadas para las 52+ políticas existentes del proyecto. |
| Impacto sobre principios Nivel 1 | Ninguno — puramente aditivo. |
| Complejidad de implementación | **Media.** Tres piezas, todas de patrones ya usados en el proyecto: (a) resolver el hueco detectado en la investigación — `tipo_perfil` no contempla ningún rol de sistema, exige una decisión propia de implementación, no de esta DT; (b) aprovisionar credenciales del usuario de sistema; (c) escribir las nuevas políticas RLS. Más piezas que A, pero cada una ya tiene precedente directo en el repositorio. |
| Coste de mantenimiento | **Bajo-medio.** Mantenimiento de políticas RLS adicionales — disciplina ya establecida y probada en el proyecto desde su primera migración. |
| Riesgo arquitectónico | **Medio — el más bajo de las tres con acceso real a datos agregados.** Una credencial comprometida expone solo lo que sus propias políticas autorizan explícitamente, nunca la base de datos completa. |
| Reutilización por futuros consumidores | **Alta.** El mismo usuario de sistema (o usuarios adicionales del mismo patrón) puede extenderse con más políticas para necesidades transversales futuras, sin decidir un mecanismo nuevo cada vez. |
| Compatibilidad con el Registro de Pendientes | No resuelve P-014 directamente (el webhook de Stripe usa un modelo distinto, de bypass total) — pero establece un patrón alternativo, más gobernado, disponible como referencia de comparación cuando se aborde P-014. |

## 6. Alternativa C — Tokens o sesiones delegadas

Un mecanismo de tokens de vida corta con alcance elevado, verificados por petición, sin identidad permanente — requeriría infraestructura de emisión/verificación/revocación propia, hoy inexistente.

| Criterio | Evaluación |
|---|---|
| Compatibilidad con SC-005.1 | **Media.** Depende de dónde viva la infraestructura de tokens — si no se ancla claramente dentro de Repository Layer, introduce una vía de acceso a datos paralela a la ya congelada, del mismo tipo de vacío ya detectado para el SPO o los Provider Gateway: nombrada en abstracto, sin sitio arquitectónico propio. |
| Compatibilidad con el modelo de seguridad congelado | **Media.** Añade un segundo mecanismo de autenticación completo, paralelo al de Supabase Auth ya congelado — más superficie conceptual que razonar, no una extensión del modelo existente como sí lo es B. |
| Impacto sobre principios Nivel 1 | **Bajo-medio**, pero probablemente exigiría su propia especificación Nivel 1 (un "Servicio de Delegación de Tokens" sin precedente en ningún documento congelado) — expande el alcance arquitectónico más allá de decidir un mecanismo. |
| Complejidad de implementación | **Alta — la más alta de las tres.** Emisión, expiración, revocación, verificación, almacenamiento seguro — ninguna de esas piezas existe hoy en el proyecto. |
| Coste de mantenimiento | **Alto.** Ciclo de vida de tokens es una carga operativa continua, no una configuración mayormente estática como A o B. |
| Riesgo arquitectónico | **Medio-alto.** Bien implementado, un token de vida corta y alcance estrecho es seguro en principio — pero la barra de implementación correcta es mucho más alta que en A o B, y cada pieza adicional (emisión, verificación, revocación) es una superficie de fallo nueva. |
| Reutilización por futuros consumidores | **Alta en teoría**, pero solo tras una inversión inicial sustancialmente mayor — el retorno depende de que aparezcan varios consumidores transversales futuros, hoy no confirmado. |
| Compatibilidad con el Registro de Pendientes | No resuelve P-014. Podría generar un pendiente nuevo (especificación del propio servicio de delegación) en vez de resolver uno existente — mismo patrón de vacío que P-008/P-009. |

---

### 7. Síntesis comparativa

| | A — Service Role encapsulado | B — Usuario de sistema + RLS | C — Tokens delegados |
|---|---|---|---|
| Alineación con SC-005.1 | Alta | **Alta (la mayor)** | Media |
| Preserva el modelo de seguridad tal cual | No (lo bypasa) | **Sí (opera dentro de él)** | No (añade uno paralelo) |
| Complejidad | Baja | Media | Alta |
| Riesgo si algo falla | **Alto (base de datos completa)** | Medio (acotado por política) | Medio-alto |
| Reutilizable sin coste creciente | Parcial (riesgo agregado crece) | **Sí** | Solo tras inversión alta |
| Resuelve o ayuda a P-014 | Sí, indirectamente | Parcialmente (referencia) | No |

### 8. Propuesta de solución (Chief Architect)

**Se recomienda la Alternativa B — usuario de sistema con políticas RLS específicas.**

Es la única de las tres que no introduce ningún mecanismo nuevo de autenticación ni ningún bypass del modelo de seguridad ya congelado — extiende ese mismo modelo a un actor adicional, identificable, auditable y revocable con las mismas herramientas (políticas RLS) ya usadas en cada uno de los componentes cerrados del proyecto hasta ahora. Tiene el menor riesgo arquitectónico entre las dos opciones que sí resuelven la necesidad real (A y B; C se descarta por desproporción entre complejidad y necesidad actual, sin consumidores adicionales confirmados que la justifiquen todavía), y es la que mejor resiste el criterio ya aplicado en todo el Bloque III: preferir lo que menos se aparta de los principios ya congelados, no lo más simple de implementar hoy.

**Queda fuera del alcance de esta Decisión Transversal** (y se difiere explícitamente a la implementación futura, en el Plan Técnico de Analítica o en una ampliación aditiva propia): la resolución concreta del hueco de `tipo_perfil` (nuevo valor de enum vs. reutilización semánticamente imprecisa de uno existente), el aprovisionamiento real de credenciales, y la redacción de las políticas RLS específicas. DT-004 decide el mecanismo, no sus detalles de implementación — mismo alcance que tuvieron DT-001/002/003.

**Alternativa A queda registrada como opción de repliegue**, no descartada del todo: si en la implementación real B demostrara ser inviable por algún motivo no anticipado aquí, A sigue siendo arquitectónicamente aceptable, con el riesgo ya documentado explícitamente asumido.

**Alternativa C queda registrada, no elegida ni descartada de forma permanente:** desproporcionada para el único consumidor confirmado hoy (Analítica); revisable si en el futuro aparecen varios consumidores transversales que justifiquen la inversión.

### 9. Próximo paso

Pendiente de revisión y confirmación de la Dirección del Proyecto — mismo procedimiento ya usado en DT-001/DT-002/DT-003: propuesta de solución (esta) → revisión crítica → Acta de Cierre formal de DT-004. Ningún código, migración o política se escribe hasta entonces.
