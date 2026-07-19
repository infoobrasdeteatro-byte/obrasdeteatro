# ACTA DE VERIFICACIÓN DOCUMENTAL — Analítica

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación, tercer componente
**Fecha:** 2026-07-19
**Fuente:** exclusivamente Conjunto A (arquitectura Nivel 1 congelada, código verificado). Ningún dato del Conjunto B. Sin analogía con Telemetría ni Observabilidad salvo donde la propia arquitectura congelada la establece explícitamente.

---

## 1. Misión congelada, textual

*"Consumidor autorizado de `ExecutionAudit` bajo su propia categoría ('Analítica', SC-004.7 revisado) para interpretación de negocio sobre la actividad técnica ya registrada. Nunca participa en el flujo síncrono, nunca es conocida ni dependida por el Núcleo."*

## 2. Responsabilidades demostrables

- Consumir `ExecutionAudit`, bajo su categoría propia (una de las 5 de SC-004.7 revisado: Auditoría, Monitorización, Observabilidad, Analítica, Diagnóstico técnico, más Accounting Engine).
- Interpretar en términos de negocio, no técnicos (frontera con Observabilidad ya congelada por el propio reparto de categorías).

Ningún documento define, más allá de esto, entradas/salidas/estructuras concretas — mismo nivel de escueto que Telemetría, no una laguna nueva de Analítica.

## 3. Prohibición explícita, no analogía — corrección histórica ya congelada

Verificado en el propio historial de cierre de Bloque II: una primera versión de la especificación de Analítica afirmaba que *"podrá apoyarse... en el mecanismo de recolección provisto por Telemetría, del mismo modo en que ya lo hace Observabilidad"* — **corregida** antes de congelar, precisamente porque el texto de Telemetría solo autoriza a Observabilidad. El diagrama de flujo oficial de Analítica quedó simplificado a `AI Gateway → ExecutionAudit → Analítica`, **sin rama hacia Telemetría**.

**Consecuencia directa, no evitable por diseño:** la solución ya usada para Observabilidad (traducir `ExecutionAudit` a métricas de Telemetría) está **explícitamente descartada** para Analítica por el propio texto congelado. No es una decisión de este componente — es una restricción documental previa.

## 4. Hallazgo central — sin ninguna vía de persistencia autorizada

Ya verificado para Observabilidad y reconfirmado aquí: `ExecutionAudit` es un valor efímero devuelto por `executeAIRequest()` (AI Gateway); no existe, en Conjunto A, ningún accesor de Repository Layer para él. Para Observabilidad, este vacío se resolvió reutilizando Telemetría (autorización explícita). **Para Analítica esa vía está cerrada (§3), y no existe ninguna otra vía de persistencia autorizada por ningún documento verificado.**

Tampoco está confirmado que Analítica pueda usar Repository Layer directamente: su lista de consumidores autorizados (*"PCE, Knowledge Assets, Accounting Engine, Mi Trayectoria®, Servicios de Plataforma autorizados, Dominios Funcionales autorizados"*) nombra explícitamente a cuatro consumidores y deja el resto bajo una cláusula genérica ("Servicios de Plataforma autorizados") que ningún documento aterriza sobre Analítica en particular.

**Conclusión de este punto: hoy no existe, en la arquitectura verificada, ningún mecanismo de persistencia que Analítica pueda usar legítimamente.** No es una decisión de implementación pendiente — es la ausencia de una autorización previa que ningún Plan Técnico puede suplir por sí solo.

## 5. Vacío ya congelado, heredado sin novedad

Igual que Observabilidad: *"ni Observabilidad ni Analítica tienen autorización para consultar `DecisionContext`/`DecisionRationale`"* — vacío diferido, ya registrado en su momento, no nuevo.

## 6. Incertidumbre de alcance — ya anticipada por nombre, no descubierta ahora

La investigación cerrada de Fase C (`investigacion-ejecucion-en-segundo-plano.md`, Conjunto A) registró explícitamente, como condición de reapertura: *"si en el futuro un consumidor YA CONGELADO (candidato más plausible: **Analítica**, interpretación agregada multi-usuario) exige ejecución verdaderamente autónoma, retomar directamente las alternativas A/B/C ya analizadas."*

Esto no es una suposición de esta verificación — es una alerta ya escrita por este mismo proyecto, con el nombre de Analítica explícito, meses (en tiempo de proyecto) antes de llegar a este componente. La misión textual ("interpretación de negocio sobre la actividad ya registrada") no aclara por sí sola si el alcance es por perfil o agregado de plataforma — pero, a diferencia de Observabilidad (donde no había ninguna alerta previa y pude proponer alcance por perfil como la única lectura demostrable), aquí existe una advertencia documental previa y nominal que no puede ignorarse.

## 7. Dependencia heredada del orquestador inexistente

Si Analítica recibe `ExecutionAudit` en el instante de su producción (única forma posible, dado §4), hereda la misma dependencia ya señalada para `recordActivity`/`recordMetric`/`recordExecutionTrace`: un orquestador del flujo completo que hoy no existe como código (clasificado como patrón de coordinación sin agente asignado, verificación del 2026-07-19).

## 8. Clasificación del hallazgo

Los puntos §4 y §6, combinados, no son vacíos menores del mismo tipo ya aceptado en otros componentes (p. ej. IA-006, `estimatedCost` siempre `null`) — son la ausencia de una autorización arquitectónica previa (persistencia) y una advertencia documental ya registrada por nombre (alcance multiusuario) que condicionan cualquier Plan Técnico posible. Ambos son, por definición, **hallazgos arquitectónicos transversales**: no se originan en Analítica, afectan potencialmente a cualquier futuro consumidor de `ExecutionAudit` fuera de Observabilidad, y el segundo ya estaba anticipado como una decisión transversal pendiente (candidata a reabrir DT-004, nunca abierta).

## 9. Resolución de esta verificación

Conforme a la restricción ya fijada por la Dirección para esta fase (*"si durante la verificación aparece un hallazgo arquitectónico transversal, deberá detenerse la implementación y elevarse para revisión antes de continuar"*), **esta verificación se detiene aquí.** No se procede a delimitación de alcance ni a Plan Técnico. Se eleva para revisión de la Dirección:

1. **Mecanismo de persistencia para `ExecutionAudit` fuera del ya autorizado para Observabilidad** — sin él, Analítica no tiene ningún dato que interpretar.
2. **Alcance de Analítica: por perfil o agregado de plataforma** — con la advertencia de que, si es agregado, reabre directamente la investigación de ejecución en segundo plano cerrada en Fase C (candidata a alternativas A/B/C ya analizadas, o a una nueva verificación si las circunstancias han cambiado).

No se propone solución a ninguno de los dos puntos — se documentan y se elevan, tal como exige el criterio de trabajo vigente.
