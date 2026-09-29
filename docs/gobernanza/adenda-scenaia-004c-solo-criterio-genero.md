# ADENDA AL ACTA DE AUTORIZACIÓN — Petición de solo criterio de género

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-004C (adenda a SCENAIA-004)
**Fecha:** __________
**Estado resultante:** BORRADOR — PENDIENTE DE FIRMA

**Verificación documental previa a la asignación del expediente (2026-09-29):** `SCENAIA-004C` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`, incluidos los ficheros ignorados por git;
- los ficheros de los dos árboles de trabajo adicionales (`_aec003-fase5` y `_scenaia-003-replay`);
- los mensajes de commit ni los objetos versionados de ninguna rama, incluidos el reflog, el stash y las referencias de respaldo (`refs/backup`). Son 74 referencias en total, 2 de ellas de respaldo;
- los 218 objetos sueltos o inalcanzables del repositorio, examinados uno a uno;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`. Los dos paquetes git que contiene solo apuntan a commits presentes en el repositorio local.

Las adendas existentes son la 004A, la 004B, la 006A y la 007A.

---

### 1. Objeto de la Adenda

Autorizar una **forma nueva de listado puro**, la **«petición de solo criterio de género»**, y fijar para ella el **dominio Obras de forma implícita**. Nada más. El resto del Acta SCENAIA-004 y de sus adendas 004A y 004B sigue vigente sin cambios.

Quedan **fuera** de esta Adenda:
  - **Las épocas** («barroco», «siglo de oro», «clásicos» como época). Forman una segunda fase: dependen de `SCENAIA_EPOCA_ENABLED`, que hoy no llega al Request Interpreter, así que esa fase tocaría también las actas SCENAIA-007 y SCENAIA-007A.
  - **«teatro clásico» y «teatro barroco» a secas.** Quedan fuera a propósito: «teatro» abre hoy el dominio Organizaciones, y las organizaciones tienen su propio `tipo_clasico`, así que la ambigüedad es real y no se resuelve adivinando.
  - **Las combinaciones de varios criterios** («comedias cortas») y **los criterios que no son género** («infantiles»).
  - **Las palabras clave de dominio general:** no se añade ningún género a `DOMAIN_KEYWORDS`.

### 2. Base documental

1. **Acta SCENAIA-004** (`docs/gobernanza/acta-autorizacion-scenaia-004-listado-puro.md`, firmada el 2026-09-22):
   - **§4.1:** definición cerrada del listado puro. Se exigen **todas** sus condiciones:
     - (a) expresión de una lista cerrada de listado;
     - (b) ninguna palabra que pida razonar;
     - (c) todos los criterios aplicados;
     - (d) dominio Obras, y solo Obras;
     - (e) al menos un resultado.
   - **§6.1:** el listado puro «solo alcanza a quien pide explícitamente una lista».
   - **§7:** condición 4, «la regla del §4.1 vive en un único lugar; ningún otro componente interpreta texto para decidirla»; condición 5, pruebas de los casos que cambian, de los que no y de los límites de la regla.
2. **Diagnóstico de solo lectura entregado a Dirección el 2026-09-29,** sobre `b4841c0`, con el Request Interpreter y el intérprete de obras reales (§3).
3. **Invariante del Request Interpreter** (`lib/request-interpreter/__tests__/contract-invariants.test.ts`): «solo importa de Knowledge Assets el tipo `KnowledgeDomain`, nunca sus accesores». El Request Interpreter no puede usar el vocabulario del intérprete de obras.
4. **Precedente de sincronía de vocabulario:** `lib/intent-resolver/__tests__/vocabulary.test.ts`. Es un invariante bidireccional entre una lista cerrada propia y los motores reales que la reconocen.
5. **Reapertura acotada del Request Interpreter.** El componente figura como **cerrado** en `docs/gobernanza/mapa-maestro-progreso-scenaia.md`. Esta Adenda lo reabre **solo** en lo que dice el §4.4.

### 3. Qué se revisa

**3.1 Comportamiento actual, medido.**

| Consulta | Dominio | Listado puro | Criterio de obras | Llama al resolutor |
|---|---|---|---|---|
| comedias | ninguno | no | `{genre:'comedia'}` | no |
| comedia | ninguno | no | `{genre:'comedia'}` | no |
| dame comedias | ninguno | no | `{genre:'comedia'}` | **sí** |
| quiero comedias | ninguno | no | `{genre:'comedia'}` | no |
| musicales / clásicos | ninguno | no | `musical` / `clasico` | no |
| obras de comedia | Obras | no | `{genre:'comedia'}` | no |
| dame obras de comedia | Obras | **sí** | `{genre:'comedia'}` | no |
| teatro clásico | Organizaciones | no | `clasico` | no |
| teatro barroco | Organizaciones | no | ninguno (época apagada) | sí |
| recomiéndame comedias | ninguno | no | `{genre:'comedia'}` | sí |

Con historial de una conversación sobre obras, «comedias» hereda el dominio Obras, pero sigue sin ser listado puro.

**3.2 Qué condiciones fallan.**
- **(a):** «comedias» no contiene ninguna expresión de la lista cerrada de listado. Es la decisión del §6.1.
- **(d):** en una conversación nueva, un género **no abre ningún dominio**. Las palabras clave de Obras son solo `obra`, `guion`, `texto teatral`, `dramaturgia` y `repertorio`.

**3.3 Riesgo principal.** Sin dominio, la completitud del conocimiento es «vacío» y `needsAI` devuelve `true`. Hoy, «comedias» en una conversación nueva **va a la IA sin ningún dato del catálogo delante**, con riesgo de que invente obras que no existen. Además:
- consume crédito;
- «dame comedias» añade una segunda llamada, la del resolutor.

**Esta Adenda lo resuelve para el caso de solo género.** Los demás casos ambiguos del §1 siguen sin resolver y quedan señalados como **riesgo residual conocido** (§6.4).

### 4. Qué cambia exactamente

**4.1 Forma nueva de listado puro: «petición de solo criterio de género».** Tras la normalización ya existente (minúsculas, sin acentos, sin signos), el texto **entero** debe estar formado por, y nada más:
  1. un **verbo de petición opcional**, de lista cerrada: `dame`, `quiero`, `busco`, `tienes`, `hay`, `muestrame`, `ensename`;
  2. un **artículo opcional**, de lista cerrada: `las`, `los`, `unas`, `unos`, `algunas`, `algunos`;
  3. **exactamente un término de género**, de lista cerrada: `comedia`, `comedias`, `musical`, `musicales`, `clasico`, `clasica`, `clasicos`, `clasicas`.

Cualquier otra palabra, o un segundo término de criterio, hace que la forma no se cumpla. En ese caso el turno se comporta exactamente como hoy.

**4.2 Dominio Obras implícito.** Cuando se cumple el §4.1 y el texto no abre ningún dominio por sí mismo, el dominio resuelto es **Obras**. No se modifica `DOMAIN_KEYWORDS`: el cambio solo alcanza a esta forma cerrada, nunca a «compañías de comedia» ni a «¿qué es la comedia del arte?».

**4.3 Lo que sigue igual del §4.1 de SCENAIA-004.**
- La forma nueva **amplía solo la condición (a)**.
- La **(b) sigue vetando** cualquier palabra de razonar y se evalúa antes: «recomiéndame comedias» y «¿qué comedias me recomiendas?» siguen yendo a la IA.
- Las condiciones **(c), (d) y (e)** se siguen comprobando en el Decision Engine, sin cambios.
- Una consulta de solo género sin resultados («musicales», con el catálogo actual) no es listado puro, pero tampoco llama a la IA, por la regla vigente de `needsAI` con cero resultados.

**4.4 Dónde vive.**
- **La detección** vive entera en `lib/request-interpreter/plain-listing-rules.ts`, el único lugar autorizado por la condición 4 del §7 de SCENAIA-004.
- **El dominio implícito** se fija en la resolución de dominios de `lib/request-interpreter/interpreter.ts`, que **solo consume** el resultado de esa detección: no interpreta texto por su cuenta.
- **Nada más** cambia del Request Interpreter.

**4.5 Revisión del §6.1 de SCENAIA-004.** El listado puro deja de alcanzar solo a quien pide explícitamente una lista: alcanza también a quien pide **un único género y nada más**. Una petición así no admite otra lectura razonable que la de un listado.

**4.6 Lo que NO cambia.**
- `DOMAIN_KEYWORDS` y la regla de subordinación de dominios.
- El intérprete de obras, el Intent Resolver, Knowledge Assets, Repository Layer, el Decision Engine y la composición de la respuesta.
- Los interruptores `SCENAIA_PAGINACION_ENABLED`, `SCENAIA_GENERO_SQL_ENABLED` y `SCENAIA_EPOCA_ENABLED`.
- Ningún invariante de contrato existente.
- Cualquier petición que no cumpla el §4.1 de esta Adenda.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Añadir los géneros a las palabras clave de Obras** | Cambiaría el dominio de muchas peticiones que no son listados («compañías de comedia», «¿qué es la comedia del arte?»). El alcance no quedaría acotado. |
| **Importar el vocabulario del intérprete de obras** | Rompe el invariante del Request Interpreter (§2.3). |
| **Incluir ya las épocas** | Con `SCENAIA_EPOCA_ENABLED` apagado, «barroco» no produce ningún criterio. Si contara como listado puro, se listaría el catálogo entero como si fuera barroco. Exige que el interruptor llegue al Request Interpreter (segunda fase, con SCENAIA-007 y 007A). |
| **Tratar «teatro clásico» como obras** | «Teatro» abre Organizaciones y las organizaciones tienen `tipo_clasico`: la petición puede buscar teatros de repertorio clásico. |
| **Dejarlo como está** | «Comedias» sigue yendo a la IA sin catálogo, con coste y con riesgo de obras inventadas. |
| **Forma cerrada de solo género (propuesta)** | Resuelve el caso más frecuente y más inequívoco, sin tocar el dominio general ni ningún otro componente. |

### 6. Riesgos y su acotación

1. **Que la forma se amplíe sin control.** Las tres listas del §4.1 son cerradas, y cualquier palabra fuera de ellas desactiva la forma. Ampliarlas exige una nueva adenda.
2. **Que el vocabulario del Request Interpreter se desincronice del intérprete de obras.** Lo acota la prueba de sincronía en los dos sentidos del §7.1.
3. **Que una petición que necesita razonar se cuele.** La regla (b) actúa antes, y las pruebas de los casos que no cambian (§7.2) lo fijan.
4. **Riesgo residual conocido, que esta Adenda no resuelve:**
   - las épocas a secas;
   - «teatro clásico» y «teatro barroco» a secas;
   - las combinaciones de varios criterios;
   - otros criterios a secas.

   Sin historial, siguen yendo a la IA sin catálogo delante o, en el caso de «teatro …», al dominio Organizaciones. Quedan señalados para un expediente posterior.

### 7. Condiciones de la futura implementación

1. **Vocabulario propio del Request Interpreter** para la lista de géneros del §4.1, con **prueba de sincronía en los dos sentidos** con el intérprete de obras, como la que ya existe para el Intent Resolver:
   - cada término de la lista produce un criterio de género en el intérprete de obras;
   - cada género que el intérprete de obras sabe interpretar tiene al menos un término en la lista.
2. **Pruebas obligatorias:**
   - **casos que cambian,** con y sin historial de conversación: «comedias», «comedia», «dame comedias», «quiero comedias», «las comedias», «clásicos»;
   - **casos que no cambian:** «recomiéndame comedias», «¿qué comedias me recomiendas?», «comedias cortas», «comedias de Lope», «teatro clásico»;
   - **límites de la forma:** dos géneros, verbo sin término, término con una palabra añadida, y un verbo o artículo fuera de las listas cerradas.
3. **Ningún invariante de contrato existente se modifica.**
4. **Suite completa, `tsc`, lint y `next build` en verde.**
5. **Diff revisado contra el §4.4** antes de fusionar: solo `plain-listing-rules.ts`, la resolución de dominios de `interpreter.ts` y sus pruebas.
6. **Aceptación funcional de Dirección** tras el despliegue, con el mismo protocolo de cuenta de prueba dedicada del PR 5 de la Adenda 004B: 0 filas nuevas en `credit_reservations` y en `ai_requests` para los casos que cambian.

### 8. Veredicto

**[Pendiente de decisión de Dirección.]** Hasta su firma, el §4.1 y el §6.1 del Acta SCENAIA-004 rigen en su redacción original, y «comedias» a secas sigue comportándose como hoy.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

____________________________________________

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** ______________________   **Fecha:** __________
