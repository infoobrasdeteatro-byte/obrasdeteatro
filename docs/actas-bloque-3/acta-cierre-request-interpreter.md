# ACTA DE CIERRE OFICIAL DE COMPONENTE
## Request Interpreter (SC-004.4)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** B (Núcleo) — primer componente, orden corregido tras R-01
**Componente:** Request Interpreter
**Documento de referencia:** SC-004.4 – Request Interpreter (Arquitectura Oficial) · ADR-001 · CAT-001
**Estado anterior:** Plan Técnico revisado, aprobado con dos vacíos diferidos registrados
**Estado resultante:** IMPLEMENTADO · VALIDADO · CERRADO
**Fecha:** 2026-07-16

---

### 1. Objeto del Acta

La presente Acta certifica la finalización oficial de la implementación de Request Interpreter, primer componente de la Fase B (Núcleo) del Plan Maestro de Implementación, conforme al Plan Técnico revisado y aprobado expresamente por la Dirección del Proyecto tras dos rondas de aclaración (taxonomía de `RequestType` y fundamento de `ProfessionalContextLevel = FULL`).

### 2. Alcance implementado

`lib/request-interpreter/` — módulo puro, síncrono, sin I/O:

- `normalizeText()` — canonicalización mecánica (minúsculas, sin diacríticos, espacios colapsados).
- `detectKnowledgeDomains()` — tabla estática palabra-clave → dominio, restringida a los 8 dominios oficiales de CAT-001.
- `detectRequestType()` — señal binaria mecánica (`RECONOCIDA`/`NO_RECONOCIDA`), sin taxonomía de negocio, conforme a la resolución de la Dirección.
- `normalizeRequest()` — punto de entrada único, produce el objeto `NormalizedRequest` completo.

**Cobertura del contrato `NormalizedRequest` (SC-004.4):** los 10 campos mínimos quedan cubiertos — `RequestId` (generado localmente), `OriginalRequest`, `NormalizedIntent`, `RequestType`, `RequestedKnowledgeDomains`, `EstimatedComplexity`, `ProfessionalContextLevel`, `DetectedAmbiguities`, `InterpretationConfidence`, `Timestamp`.

**Simplificación respecto al Plan Técnico, registrada por transparencia:** la firma final de `normalizeRequest()` acepta únicamente `originalRequest` — se retiraron `locale`/`sessionContext` de la firma en vez de aceptarlos sin uso real, ya que ninguna regla de esta v1 depende de ellos. Es una decisión de implementación menor dentro del alcance ya aprobado (evita parámetros sin efecto), no una desviación del contrato: ambos siguen documentados como entradas disponibles y vacío diferido para reglas futuras.

### 3. Ciclo oficial completado

1. Verificación de la especificación arquitectónica (SC-004.4, ADR-001, CAT-001).
2. Identificación de contratos, dependencias y restricciones.
3. Verificación del estado real del repositorio (confirmó ausencia de infraestructura NLP/IA).
4. Elaboración del Plan Técnico, con dos rondas de aclaración exigidas por la Dirección sobre `RequestType` y `ProfessionalContextLevel = FULL`, resueltas antes de autorizar la implementación.
5. Implementación.
6. Revisión arquitectónica completa.
7. Corrección de hallazgos (Sección 5).
8. Reauditoría (sin hallazgos adicionales).
9. Pruebas unitarias.
10. Pruebas de invariantes estructurales.
11. Validación final.

El componente supera satisfactoriamente todas las fases anteriores.

### 4. Vacíos diferidos, ya registrados y confirmados no bloqueantes por la Dirección

- Una futura taxonomía oficial de `RequestType`, si la evolución funcional del sistema la requiere.
- Criterios arquitectónicos explícitos para la producción de `ProfessionalContextLevel = FULL`.
- Reglas de interpretación multi-idioma (`locale`) — no consumidas por ninguna regla de esta v1.

Ninguno de los tres bloquea el cierre de este componente ni compromete su contrato.

### 5. Hallazgos detectados durante la implementación

Dos hallazgos reales, ambos corregidos y verificados — se asigna **RA-003** (primer hallazgo real desde Repository Layer; Knowledge Assets y Accounting Engine cerraron sin hallazgos):

1. **RA-003 —** `estimateConfidence()` contenía una rama (`domains.length === 1` con ambigüedades) estructuralmente inalcanzable: las tres reglas de `detectAmbiguities()` son mutuamente excluyentes con el caso de un único dominio detectado, por lo que esa combinación nunca puede ocurrir en tiempo de ejecución. **Corregido:** rama eliminada, función simplificada a depender solo del número de dominios detectados; se retiró el parámetro `ambiguities`, ya innecesario.
2. **Hallazgo menor de portabilidad (sin numeración RA, no es un defecto de corrección):** la primera versión usaba `randomUUID` de `node:crypto`, un módulo exclusivo de Node.js, para un componente cuyo contrato nunca exige ejecución server-only. **Corregido:** se sustituyó por el global `crypto.randomUUID()` (Web Crypto, ya tipado por la librería `dom` del proyecto), coherente con la naturaleza de función pura sin dependencias de entorno del componente.

**Nota de proceso:** durante la primera ejecución de pruebas, dos casos de `contract-invariants.test.ts` fallaron por falso positivo — un comentario propio que explicaba "no accede a Supabase, al PCE ni al SKM" contenía, él mismo, las palabras que el test buscaba para detectar una violación real. Corregido reformulando el comentario sin alterar su contenido técnico. Registrado como lección de proceso para futuros comentarios en módulos con test de invariantes por palabra clave.

### 6. Pruebas realizadas

Se certifica:

- Revisión arquitectónica completa, con los dos hallazgos de la Sección 5 corregidos y verificados.
- 74 pruebas superadas en 18 archivos (17 preexistentes sin regresiones + 5 nuevos de Request Interpreter): `normalize-text.test.ts`, `domain-rules.test.ts`, `request-type-rules.test.ts`, `interpreter.test.ts` (incluye caso explícito que verifica que `ProfessionalContextLevel` nunca es `FULL`) y `contract-invariants.test.ts` (sin acceso a persistencia, sin importar accesores de Knowledge Assets, sin importar ningún componente del Núcleo, función pura sin `async`/`await`, sin exposición de Subscription).
- Compilación correcta (`tsc --noEmit`).
- Análisis estático sin errores ni warnings (`eslint`).

No se ha encontrado ningún incumplimiento del contrato SC-004.4.

### 7. Incidencias y validaciones abiertas asociadas

Sin cambios respecto al estado heredado — Request Interpreter no depende de persistencia, por lo que **no hereda VD-001/VD-002/VD-003**. No se abre ninguna incidencia arquitectónica nueva más allá de los tres vacíos diferidos ya registrados en la Sección 4.

### 8. Veredicto

Tras la revisión completa del componente se certifica que:

- la implementación respeta íntegramente SC-004.4, ADR-001 y CAT-001;
- no introduce IA en un componente donde está expresamente prohibida (verificado: cero dependencias externas, cero I/O, función determinista);
- no invade responsabilidades del PCE, del SKM ni de ningún otro componente del Núcleo;
- produce los diez elementos del contrato `NormalizedRequest`;
- los vacíos diferidos quedan correctamente acotados y no bloquean el cierre.

En consecuencia,

**Request Interpreter queda oficialmente declarado:**

**IMPLEMENTADO · VALIDADO · CERRADO**

como primer componente oficial de la Fase B (Núcleo) del Bloque III – Implementación.

### 9. Autorización para continuar

La Dirección del Proyecto podrá autorizar el inicio del siguiente componente de Fase B por orden corregido del Plan Maestro: **Professional Context Engine (PCE, SC-004.1)**.
