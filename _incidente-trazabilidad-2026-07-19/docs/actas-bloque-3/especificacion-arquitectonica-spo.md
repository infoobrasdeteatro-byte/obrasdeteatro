# ESPECIFICACIÓN ARQUITECTÓNICA CONGELADA
## SPO — ScenaIA Process Orchestrator (Mecanismo de Coordinación del Núcleo)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** I — Núcleo de Procesamiento (completa una definición ya reconocida en SC-003, sin alterar su composición congelada)
**Origen:** Corte de Control 2026-07-18 → `investigacion-orquestacion-del-pipeline.md` (P-006, vacío de planificación) → esta especificación.
**Estado:** 🔒 CONGELADA
**Fecha:** 2026-07-18

---

### 1. Clasificación arquitectónica

**El SPO pertenece al Núcleo de Procesamiento y constituye su mecanismo de coordinación** — no un octavo componente funcional (la composición en 7 componentes quedó congelada y reafirmada documentalmente por SC-005 y por el Acta de Cierre del Núcleo) ni una capa arquitectónica ni una categoría distinta del sistema. Esta especificación no incorpora ningún componente nuevo: completa la definición del coordinador cuya existencia ya reconocía SC-003, sin alterar la composición del Núcleo ya congelada.

### 2. Misión (SC-003, sin alterar)

> *"El SPO es el núcleo de coordinación de ScenaIA: no responde, decide el flujo completo de procesamiento antes de que exista cualquier respuesta."*

### 3. Principios (SC-003, sin alterar)

Nunca genera contenido · nunca almacena conocimiento · nunca mantiene memoria · nunca contiene prompts · coordina el sistema.

### 4. Responsabilidades

1. **Coordinar el flujo oficial del Núcleo conforme a la secuencia arquitectónica vigente**, propagando la salida de cada componente como entrada del siguiente.
2. Generar el identificador de correlación (`RequestId`, DT-001) al inicio del recorrido y mantenerlo constante durante todo el proceso.
3. Activar, como parte de la misma secuencia, las observaciones laterales que ya asumen su existencia — el registro de actividad (Procesos Asíncronos) y el registro de auditoría técnica (Telemetría/Analítica) — sin que esto constituya, en ningún caso, notificación activa hacia un Dominio Funcional (DT-003 permanece intacto: la observación sigue siendo pasiva desde la perspectiva de quien la consume).
4. Entregar la respuesta final, ya producida por Response Composer, al origen de la petición.

### 5. No responsabilidades

- **El SPO no toma decisiones funcionales o de negocio; dichas decisiones corresponden exclusivamente a los componentes especializados del Núcleo.**
- No genera ningún contenido de respuesta.
- No persiste nada por iniciativa propia, más allá de invocar las funciones de registro ya diseñadas para depender de él — "nunca mantiene memoria" es literal: sin estado entre peticiones.
- No conoce ni invoca directamente a ningún Dominio Funcional (DT-003).
- No decide ni gestiona el mecanismo de autenticación de los Servicios de Plataforma de alcance transversal — ya resuelto aparte (DT-004).
- No asume la especificación detallada de Outbound/Inbound Provider Gateway ni la relación con eventos entrantes de proveedores externos (DT-002, P-010) — fuera de su alcance.

### 6. Entradas

Una petición ya autenticada de un usuario real. La autenticación es, según el propio flujo de SC-003 (*"Usuario → Autenticación → SPO..."*), un paso previo y externo — **el mecanismo concreto de entrada (p. ej., un route handler) queda explícitamente fuera del alcance de esta especificación**, igual que "Autenticación" nunca formó parte de ningún documento del Núcleo.

### 7. Salidas

La respuesta final producida por Response Composer, entregada al origen de la petición. En paralelo: activación (no gestión de contenido) del registro de actividad y del registro de auditoría técnica.

### 8. Invariantes

1. La secuencia de coordinación del Núcleo es siempre la ya congelada — no admite alteración condicional en tiempo de ejecución; solo cambia mediante reapertura formal del flujo oficial.
2. El SPO nunca mantiene estado entre peticiones.
3. Las observaciones laterales que activa permanecen como observación pasiva desde la perspectiva de cualquier Dominio Funcional — nunca las convierte en notificación activa.
4. El SPO nunca decide contenido ni resultado de negocio — solo coordina invocaciones ya decididas por los componentes especializados.

### 9. Vacíos explícitamente fuera de esta especificación

- El mecanismo concreto de entrada (Sección 6).
- Si el registro de actividad/auditoría se invoca directamente o mediante algún paso intermedio no contemplado todavía.
- El escenario de coordinación fuera de una sesión de usuario viva (vacío ya diferido desde Fase C, condición de reapertura ya registrada).

### 10. Historial de resolución de esta especificación

- **Clasificación verificada antes de cualquier otro contenido** (mismo rigor que Mi Trayectoria®): dos lecturas documentales posibles (octavo componente del Núcleo vs. capa arquitectónica distinta) presentadas con su evidencia respectiva, sin decidir unilateralmente. Resuelta por la Dirección: mecanismo de coordinación del Núcleo, ni componente adicional ni capa nueva.
- Dos ajustes de redacción incorporados: la responsabilidad de coordinación se formula sobre "la secuencia arquitectónica vigente" en vez de un orden literal inmutable, evitando ligar la misión a una única secuencia que nunca pudiera evolucionar bajo gobernanza; la no-responsabilidad de decisión se precisa como ausencia de decisiones funcionales o de negocio, exclusivas de los componentes especializados.
- P-006, clasificado previamente como vacío de planificación (no de implementación) en `investigacion-orquestacion-del-pipeline.md`, queda ahora con la especificación documental que le faltaba — sin que ello, por sí solo, resuelva dónde encaja su implementación en el Plan Maestro (ver Sección 11).

### 11. Estado y siguiente paso

**Especificación arquitectónica del SPO — CONGELADA.** Completa Bloque I sin reabrir su Acta de Cierre ni alterar la composición de 7 componentes ya congelada — es una ampliación documental aditiva, del mismo tipo ya usado repetidamente en Bloque III para código, aplicado aquí a documentación de Bloque I.

**No autorizado todavía:** Plan Técnico, implementación, ni decisión sobre si P-006 queda resuelto dentro del Bloque III o exige una reorganización del Plan Maestro. Esa decisión, según lo ya indicado por la Dirección, se toma ahora que esta especificación existe.
