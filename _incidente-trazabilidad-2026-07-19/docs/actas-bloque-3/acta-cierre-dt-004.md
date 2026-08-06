# ACTA DE CIERRE — DT-004
## Mecanismo de Acceso para Servicios de Plataforma con Alcance Transversal

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación
**Fecha:** 2026-07-18
**Estado:** 🔒 CONGELADA como Arquitectura Oficial — cuarta Decisión Transversal del proyecto.

---

### 1. Objeto de la Acta

Cierra formalmente DT-004, congelando el mecanismo autorizado para que un Servicio de Plataforma cuya misión documental exija capacidades transversales pueda acceder a datos agregados, sin romper SC-005.1 ni el modelo de seguridad ya congelado. Recorrido completo: identificación (Corte de Control, verificación de Analítica) → investigación de re-contraste (`investigacion-acceso-multiusuario-analitica.md`) → análisis comparativo de tres alternativas (`analisis-comparativo-dt-004.md`) → propuesta de solución → revisión y confirmación de la Dirección → esta Acta de Cierre. Mismo procedimiento ya usado en DT-001, DT-002 y DT-003.

### 2. Decisión oficial

**Se adopta la Alternativa B: usuario de sistema con políticas RLS específicas.** No por ser la más simple de implementar (esa era la Alternativa A) — precisamente por lo contrario: **es la que menos modifica la arquitectura ya congelada.** Extiende el modelo de autenticación y RLS ya vigente en todo el proyecto a un nuevo actor legítimo, en vez de introducir un mecanismo paralelo (tokens delegados) o un bypass total del modelo de seguridad (clave de servicio sin RLS).

### 3. Principio arquitectónico consolidado

DT-004 no documenta únicamente una elección puntual para Analítica. Congela el siguiente principio general, vinculante para toda la arquitectura de ScenaIA en adelante:

> **Los Servicios de Plataforma cuya misión documental requiera capacidades transversales accederán siempre mediante una identidad explícita, gobernada por el mismo modelo de autenticación y las mismas políticas RLS del resto del sistema.**

Consecuencias directas, también congeladas:

- **No se autorizan privilegios globales permanentes** — ningún mecanismo de bypass total de RLS queda autorizado por esta Decisión.
- **No se introduce un mecanismo paralelo de autenticación** — se descarta expresamente cualquier infraestructura de tokens/sesiones delegadas independiente del modelo ya existente (Alternativa C, registrada pero no elegida).
- **Se extiende el modelo ya existente a un nuevo actor arquitectónicamente legítimo** — el usuario de sistema es, en términos de autenticación, una identidad más, sujeta a las mismas reglas que cualquier otra.

### 4. Restricción de reutilización — DT-004 crea un patrón, no un privilegio

La existencia del usuario de sistema **no constituye una autorización general** para que cualquier componente futuro lo invoque. Queda expresamente restringido:

> Cada nuevo Servicio de Plataforma que en el futuro pretenda utilizar este mecanismo deberá justificar documentalmente, antes de hacerlo:
> 1. que su misión congelada exige realmente capacidades transversales;
> 2. que no existe una alternativa compatible con el modelo de sesión ordinario;
> 3. y obtener autorización mediante una decisión arquitectónica expresa para esa reutilización concreta.

**DT-004 crea un patrón reutilizable, verificado caso por caso — no crea un privilegio reutilizable por defecto.** Ningún componente queda autorizado a usar el usuario de sistema solo porque DT-004 exista; cada uso exige su propia justificación, con el mismo rigor ya aplicado a Analítica.

### 5. Alcance explícito de esta Decisión — qué NO congela

- **No diseña Analítica** — su Plan Técnico (contratos, estructuras de datos, responsabilidades) sigue pendiente, como trabajo posterior y distinto.
- **No implementa Repository Layer** — ninguna ampliación aditiva se ha escrito.
- **No crea ninguna migración.**
- **No define las políticas RLS concretas** que el usuario de sistema necesitará — solo autoriza que existan, bajo el principio de la Sección 3.
- **No aprovisiona ninguna credencial.**

Todo lo anterior pertenece a la implementación posterior — al Plan Técnico de Analítica y a la ampliación aditiva de Repository Layer que de él se derive. **DT-004 congela únicamente el principio arquitectónico** que permitirá implementar esos elementos de forma coherente con el resto del proyecto.

**Detalle deferido, explícitamente señalado durante el análisis comparativo, no resuelto aquí:** el enum `tipo_perfil` no contempla ningún rol de sistema/servicio — su resolución (nuevo valor de enum, u otra vía) es una decisión de implementación, no de esta Decisión Transversal.

### 6. Nota metodológica — trazabilidad para futuras revisiones del proyecto

**DT-004 no contradice la investigación cerrada durante la Fase C — la confirma.** Aquella investigación (`investigacion-ejecucion-en-segundo-plano.md`, 2026-07-17) concluyó correctamente que, en ese momento, ningún consumidor congelado justificaba romper el modelo de sesión — Procesos Asíncronos y Mi Trayectoria® se resolvieron íntegramente mediante procesamiento diferido a sesión (Alternativa D), sin necesidad de ningún mecanismo nuevo. No fue una investigación incompleta ni una decisión aplazada por precaución: fue una conclusión correcta para la evidencia disponible entonces.

**DT-004 nace porque la evidencia arquitectónica cambió, no por anticipación.** Solo tras completar Telemetría y Observabilidad, y tras verificar documentalmente (sin analogía) la misión propia de Analítica, apareció el primer consumidor cuya misión congelada exige, de forma demostrada, capacidades transversales — con la Alternativa D excluida para él por razón estructural, no de preferencia. El mismo criterio metodológico que cerró la investigación de Fase C sin abrir una DT innecesaria es, exactamente, el que ahora abre DT-004 cuando la evidencia lo exige: **nunca decidir por anticipación, siempre decidir por evidencia demostrada.**

### 7. Revisión obligatoria del Registro de Pendientes Arquitectónicos

1. **¿Se ha cerrado algún pendiente existente?** Sí — **P-012**, en su parte relativa a Analítica, pasa de "mecanismo sin elegir" a **RESUELTO (mecanismo decidido: Alternativa B, DT-004)**. Se mantiene como pendiente de *implementación* (no de *decisión*) hasta que se materialice en Repository Layer.
2. **¿Ha aparecido algún pendiente nuevo?** Sí, uno: la resolución concreta del hueco de `tipo_perfil` para el usuario de sistema (Sección 5) — se incorpora como **P-015** en el Registro, con "Momento previsto de resolución: durante la implementación derivada de DT-004."

`docs/auditoria/REGISTRO_PENDIENTES_ARQUITECTONICOS.md` actualizado en consecuencia como parte de este cierre.

### 8. Veredicto

**DT-004 queda oficialmente CONGELADA como Arquitectura Oficial.** Cuarta Decisión Transversal del proyecto, junto a DT-001 (Correlación de Peticiones), DT-002 (Frontera hacia Proveedores Externos no-IA) y DT-003 (Relación Núcleo↔Dominios Funcionales). Ninguna reapertura de contratos ya cerrados. Ningún código escrito.

### 9. Próximo paso autorizado

Queda autorizado continuar el Plan Técnico de Analítica, ahora con el mecanismo de acceso agregado ya decidido a nivel de principio — su materialización concreta (políticas RLS, credenciales, resolución del hueco de `tipo_perfil`) se aborda como parte de esa implementación.
