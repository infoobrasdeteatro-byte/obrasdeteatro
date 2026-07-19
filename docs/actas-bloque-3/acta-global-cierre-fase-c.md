# ACTA GLOBAL DE CIERRE OFICIAL — FASE C (ASÍNCRONO)
## Bloque III — Implementación

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** C — Asíncrono
**Estado resultante:** COMPLETA · IMPLEMENTADA · VALIDADA · DOCUMENTADA
**Fecha:** 2026-07-18

---

### 1. Objeto del Acta

La presente Acta consolida y certifica, como único punto de referencia arquitectónico, el cierre íntegro de la Fase C (Asíncrono) del Plan Maestro de Implementación del Bloque III. Sustituye, a efectos de consulta rápida del estado del proyecto, la necesidad de recorrer las Actas individuales y documentos de investigación que la componen — que permanecen como registro detallado y no quedan derogados por esta.

### 2. Objetivo perseguido por la Fase

Habilitar la observación de la actividad que el Núcleo (Fase B) ya produce, sin modificar ni invadir ninguno de sus contratos congelados (DT-003), y construir sobre esa observación el primer Dominio Funcional del ecosistema: una interpretación estructurada de la evolución profesional del usuario, devuelta a él mismo. La Fase C debía demostrar que ScenaIA puede crecer hacia capacidades orientadas al usuario final sin reabrir el Núcleo ni introducir infraestructura de ejecución no gobernada.

### 3. Componentes entregados

| # | Componente | Clasificación | Alcance final | Acta individual |
|---|---|---|---|---|
| 1 | Procesos Asíncronos | Servicio de Plataforma (SC-005) | v3 — completo: `recordActivity`, `listPendingActivity`, `listActivityHistory`, `markActivityProcessed` | `acta-cierre-procesos-asincronos-v1.md` · `v2.md` · `v3.md` |
| 2 | Mi Trayectoria® | Dominio Funcional Nivel 3 (DT-003) | v1 — completo de su especificación Fase 1: `buildTrajectory` | `especificacion-mi-trayectoria-fase1.md` · `acta-cierre-mi-trayectoria.md` |

Ambos componentes cierran **sin partes diferidas** para los consumidores actualmente conocidos.

### 4. Decisiones arquitectónicas que quedan consolidadas

1. **Modelo de ejecución "diferido a la siguiente sesión real del propio profesional"** para Servicios de Plataforma que operan fuera de la ruta síncrona del Núcleo — sin necesidad de cliente privilegiado, sin nueva Decisión Transversal (ver §5). Queda como patrón por defecto para cualquier necesidad futura de este tipo.
2. **Separación explícita entre dos invariantes que estaban mezclados:** "Repository Layer es la única frontera de persistencia" es Nivel 1 (misión literal de SC-005.1, independiente del mecanismo de autenticación); "toda operación opera vía sesión de usuario" es una convención de Nivel 2, introducida durante la implementación, no un principio fijado en la Fase 4. Esta separación queda disponible como precedente para cualquier futura discusión sobre mecanismos de ejecución.
3. **Semántica de cola y semántica de historial como dos capacidades públicas independientes de un mismo Servicio de Plataforma**, ambas sobre la misma tabla y la misma política RLS, sin duplicar datos ni crear una segunda fuente de verdad — patrón reutilizable para cualquier futuro Servicio de Plataforma que necesite exponer más de una vista sobre el mismo registro.
4. **Mi Trayectoria® establece el patrón de referencia para Dominios Funcionales:** dependencia exclusiva de un único Servicio de Plataforma, cero persistencia propia (todo se calcula bajo demanda), y una **nota de alcance real** congelada explícitamente en el diseño — la interpretación se basa en la evidencia actualmente disponible, nunca se presenta como la totalidad de la trayectoria profesional. Mismo criterio de honestidad sobre cobertura parcial ya aplicado en Knowledge Assets (2 de 8 dominios).
5. **"Ampliación aditiva sin reapertura" reforzada tres veces en esta Fase** (políticas de lectura RLS sobre `nucleo_activity_log`, `listActivityHistory` en Procesos Asíncronos v3, re-export de `ResponseType` en su barril público) — ninguna reabrió una Acta ya cerrada; todas quedaron documentadas como adición, no como corrección.

### 5. Investigación sobre ejecución fuera de sesión — resumen y conclusión

Al completar el lado de lectura de Procesos Asíncronos y diseñar Mi Trayectoria®, se detectó un bloqueo compartido por ambos: ¿cómo debe autenticarse Repository Layer cuando opera fuera del contexto de una sesión de usuario? Se investigó formalmente si esto constituía una nueva Decisión Transversal (candidata **DT-004**, numeración deliberadamente no asignada hasta confirmar que hacía falta):

1. **Hallazgo de partida:** el invariante que parecía bloquear la implementación ("sin cliente privilegiado, RLS exclusivamente vía sesión") nunca fue Nivel 1 — era una convención introducida durante la propia implementación de Repository Layer. Se verificó además, contra código real, que ya existe infraestructura privilegiada no gobernada (`SUPABASE_SERVICE_ROLE_KEY` en el webhook de Stripe) — descartada explícitamente como precedente válido, por violar simultáneamente la frontera única de persistencia y el modelo de sesión.
2. **Separación de invariantes** (§4.2 de esta Acta) — solicitada expresamente por la Dirección antes de continuar.
3. **Análisis comparativo de 4 alternativas de autenticación** (service-role dentro de Repository Layer; usuario de sistema con RLS dedicada; tokens delegados; procesamiento diferido a sesión), evaluadas contra principios congelados, impacto, seguridad, gobernanza, mantenibilidad y reutilización — sin seleccionar ninguna todavía.
4. **Pregunta decisiva, planteada por la Dirección antes de elegir mecanismo:** ¿los consumidores ya congelados (Procesos Asíncronos, Mi Trayectoria®) exigen, por contrato, ejecución realmente independiente de sesión? **Verificado que no** — ninguno de los dos especifica un disparador fuera de sesión; ambos son, por diseño, de un único profesional observando su propia actividad.

**Conclusión: no se abrió ninguna Decisión Transversal nueva.** El modelo de "procesamiento diferido a sesión" resultó suficiente para los consumidores actuales. Queda documentada una **condición de reapertura explícita**: si un futuro consumidor ya congelado (candidato más plausible: **Analítica**, interpretación agregada multi-usuario) exige ejecución verdaderamente autónoma, retomar directamente las 4 alternativas ya analizadas en `docs/actas-bloque-3/investigacion-ejecucion-en-segundo-plano.md`, sin rehacer el análisis desde cero.

### 6. Registro de incidencias, hallazgos y validaciones de esta Fase

- **IA-009** — propuesta durante la apertura de la Fase (responsabilidad de registrar actividad, aparentemente sin dueño tras descartar al SPO) y **retirada** tras verificar que la necesidad nace únicamente con SC-005/DT-003 y que este último ya está satisfecho por el comportamiento real de Response Composer — no hubo ninguna promesa incumplida, solo un detalle de mecanismo nunca antes necesario. No registrada, mismo tratamiento que IA-005 en la Fase B.
- **DT-004 (candidata)** — nunca asignada; ver conclusión de la investigación en §5.
- **RA-xxx** — ningún hallazgo nuevo de revisión arquitectónica en toda la Fase. Los únicos ajustes detectados durante las revisiones propias fueron de tipos (estrechamiento `string → ResponseType`, tratamiento de `profile_id` nulo), ya resueltos y documentados en las Actas de Procesos Asíncronos v2/v3, sin numeración propia por no ser hallazgos de lógica ni de arquitectura.
- **VD-xxx** — no se registra ninguna validación diferida nueva. VD-002 (verificación dinámica de RLS contra el proyecto Supabase real) aplica transitivamente a las dos migraciones nuevas de esta Fase, por el mismo motivo ya documentado desde Fase A.
- **Cero migraciones nuevas** para Procesos Asíncronos v3 y para Mi Trayectoria® — ambos reutilizaron persistencia y políticas RLS ya existentes.

Ninguna incidencia abierta, heredada o propia de esta Fase bloquea su cierre.

### 7. Estado de validación técnica agregado

- **193/193 pruebas superadas**, en 52 archivos de test, sin ninguna regresión detectada en ningún cierre sucesivo dentro de la Fase.
- **`tsc --noEmit` limpio** en todo el repositorio.
- **`eslint` sin errores** (solo warnings preexistentes, ajenos a este trabajo, ya documentados desde Fase A).
- Prueba explícita que protege la distinción cola/historial como parte del contrato de Procesos Asíncronos (verifica que `listActivityHistory` nunca invoca `.is('processed_at', null)`).

### 8. Una nota sobre el propio proceso

A diferencia de fases anteriores, en las que una incidencia detectada solía resolverse abriendo una nueva pieza de arquitectura (una incidencia, una reapertura, una decisión transversal), en esta Fase las investigaciones formales terminaron sistemáticamente **descartando complejidad** en vez de añadirla por defecto: IA-009 se retiró en vez de registrarse; la candidata DT-004 nunca llegó a abrirse tras verificar que ningún consumidor real la exigía; la tabla propia para Mi Trayectoria® se descartó a favor de reutilizar lo ya existente; ninguna de las tres ampliaciones de esta Fase exigió una migración nueva. En los tres casos, la decisión de no construir se tomó únicamente después de una verificación explícita contra los consumidores reales — no por precaución genérica ni por evitar trabajo. Se registra como señal de maduración del proceso de gobernanza, no como relajación del rigor: el mismo nivel de exigencia que en la Fase B, aplicado ahora con más precisión sobre cuándo la complejidad nueva está realmente justificada.

### 9. Capacidades que esta Fase deja preparadas

- **Un patrón de referencia completo para Dominios Funcionales futuros** (candidato inmediato: Biblioteca) — cómo diseñar su Plan Técnico, depender de un único Servicio de Plataforma, evitar persistencia propia cuando sea posible, y congelar una nota de alcance real desde el diseño.
- **Procesos Asíncronos con cuatro operaciones públicas estables** (`recordActivity`, `listPendingActivity`, `listActivityHistory`, `markActivityProcessed`), disponibles para cualquier futuro consumidor sin necesidad de tocar su Acta.
- **El modelo de sesión diferida como opción por defecto**, ya evaluado y documentado, para cualquier Servicio de Plataforma futuro que necesite operar fuera de la ruta síncrona del Núcleo — con su condición de reapertura ya escrita, evitando repetir el análisis desde cero.
- **Patrón "ampliación aditiva sin reapertura" verificado en tres formas distintas** (nueva política RLS, nueva función de lectura, nuevo re-export de tipo) — precedente directamente aplicable a Fase D.

### 10. Veredicto

Se certifica que la Fase C (Asíncrono) del Bloque III queda **completa, implementada, validada y documentada** conforme a la Arquitectura Oficial congelada en la Fase 4 y a la metodología de gobernanza establecida para el Bloque III. La investigación sobre ejecución fuera de sesión quedó cerrada con una conclusión negativa fundamentada, no con una decisión pendiente. Ninguna incidencia abierta compromete la integridad de ningún contrato ya cerrado.

**FASE C — CERRADA.**

### 11. Próximo paso autorizado

Queda autorizada la preparación de la **Fase D (Instrumentación)** del Plan Maestro: Telemetría → Observabilidad → Analítica. Su apertura efectiva requiere autorización expresa adicional de la Dirección del Proyecto. Se señala, como referencia para la Dirección: Analítica es el candidato ya identificado en la investigación de §5 como el consumidor más plausible en exigir, en el futuro, ejecución realmente independiente de sesión — la condición de reapertura ya documentada debería revisarse en cuanto se aborde su Plan Técnico.
