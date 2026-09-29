# ADENDA AL ACTA DE AUTORIZACIÓN — Época a secas como listado puro

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-004D (adenda a SCENAIA-004; revisa la Adenda 004C y la Adenda 007A)
**Fecha:** __________
**Estado resultante:** BORRADOR — PENDIENTE DE FIRMA

**Verificación documental previa a la asignación del expediente (2026-09-29):** `SCENAIA-004D` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`, incluidos los ficheros ignorados por git;
- los ficheros de los dos árboles de trabajo adicionales (`_aec003-fase5` y `_scenaia-003-replay`);
- los mensajes de commit ni los objetos versionados de ninguna rama, incluidos el reflog, el stash y las referencias de respaldo (`refs/backup`). Son 84 referencias en total, 1 de ellas de respaldo;
- los 215 objetos sueltos o inalcanzables del repositorio, examinados uno a uno;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`, incluidos los dos paquetes git que contiene.

Las adendas existentes son la 004A, la 004B, la 004C, la 006A y la 007A.

---

### 1. Objeto de la Adenda

Ampliar la forma **«petición de solo criterio»** de la Adenda 004C para que admita también **términos de época**, con dominio Obras implícito, y hacer que el interruptor `SCENAIA_EPOCA_ENABLED` llegue como dato al Request Interpreter. Nada más. El resto del Acta SCENAIA-004, de sus adendas 004A, 004B y 004C, del Acta SCENAIA-007 y de la Adenda 007A sigue vigente sin cambios, salvo lo que revisan expresamente el §4.6 y el §4.7.

Quedan **fuera** de esta Adenda:
  - **«teatro» + época** («teatro barroco», «teatro clásico», «teatro del siglo de oro»). Siguen yendo al dominio Organizaciones por la palabra clave «teatro». Es un expediente propio futuro: toca `DOMAIN_KEYWORDS`, que la 004C blinda, y la ambigüedad es real.
  - **«del siglo de oro».** La preposición «del» no cuenta como artículo; la forma no se cumple y el turno se comporta como hoy.
  - **Las combinaciones con otros criterios:** «obras barrocas», «comedias barrocas», «comedias del siglo de oro».
  - **Las palabras clave de dominio general:** no se añade ninguna época a `DOMAIN_KEYWORDS`.

### 2. Base documental

1. **Acta SCENAIA-004** (`docs/gobernanza/acta-autorizacion-scenaia-004-listado-puro.md`, firmada el 2026-09-22): §4.1, definición cerrada del listado puro, condiciones (a) a (e); §7, condición 4, «la regla del §4.1 vive en un único lugar».
2. **Adenda SCENAIA-004C** (`docs/gobernanza/adenda-scenaia-004c-solo-criterio-genero.md`, firmada el 2026-09-29):
   - **§4.1:** la forma cerrada, con sus tres listas (verbos, artículos y términos de género).
   - **§5:** descartó incluir las épocas porque, con `SCENAIA_EPOCA_ENABLED` apagado, «barroco» no produce ningún criterio y se listaría el catálogo entero como si fuera barroco. Lo dejó para una segunda fase que tocaría también SCENAIA-007 y 007A.
   - **§6.1:** ampliar cualquiera de las listas exige una nueva adenda.
3. **Acta SCENAIA-007** (`acta-autorizacion-scenaia-007-epoca.md`) y **Adenda 007A** (`adenda-scenaia-007a-lectura-interruptor.md`):
   - **007A §4.1:** el interruptor se lee **solo** en el Orquestador (`lib/verified/orquestador/epoca.ts`) y en la ruta.
   - **007A §4.2:** viaja **como dato** a tres destinos: el intérprete de obras, el Intent Resolver y la validación del estado.
   - **007A §4.4:** con el interruptor apagado, no se añade ningún argumento a ninguna llamada.
4. **Invariante del Request Interpreter** (`lib/request-interpreter/__tests__/contract-invariants.test.ts`): «solo importa de Knowledge Assets el tipo `KnowledgeDomain`, nunca sus accesores». No puede importar ni el vocabulario de épocas ni el tipo `OpcionesEpoca`.
5. **Diagnóstico de solo lectura entregado a Dirección el 2026-09-29,** sobre `520e5a2`, con el Request Interpreter, el intérprete de obras y el Intent Resolver reales, y recuentos sobre el catálogo de producción (§3).
6. **Reapertura acotada del Request Interpreter,** como en la 004C: solo en lo que dice el §4.5.

### 3. Qué se revisa

**3.1 Comportamiento actual, medido** (época encendida en producción; catálogo de 11 obras publicadas, 10 con época Siglo de Oro y Barroco).

| Consulta | Conversación nueva | Con historial de Obras |
|---|---|---|
| barroco, el barroco, ¿barroco? | sin dominio → **IA sin catálogo** (1 llamada) | Obras, `barroco` → 10, IA (1 llamada) |
| dame barroco | sin dominio → resolutor + IA (**2 llamadas**) | Obras, `barroco` → 10, IA (1 llamada) |
| siglo de oro, el siglo de oro | sin dominio → IA sin catálogo | Obras, `siglo_de_oro` → 10, IA |
| isabelino, neoclásico, medieval, contemporáneo… | sin dominio → IA sin catálogo | Obras → 0, respuesta directa sin IA |
| clásico, clásicos, dame clásicos | Obras, listado puro, 10, **sin IA** (ya por la 004C) | igual |
| teatro barroco / teatro clásico | Organizaciones | Organizaciones |
| comedias barrocas | sin dominio → IA sin catálogo | Obras, comedia + barroco → 5, IA |

**3.2 Qué falla.** Igual que en la 004C antes de su implantación: en una conversación nueva una época no abre ningún dominio. La completitud es «vacío», `needsAI` devuelve `true`, y el turno va a la IA **sin ningún dato del catálogo delante**, con riesgo de obras inventadas y con coste. «Clásico» ya no falla porque la 004C lo incluyó como término de género.

**3.3 Por qué no basta con copiar la lista de la 004C.** Con `SCENAIA_EPOCA_ENABLED` apagado, «barroco» no produce ningún criterio de obras. En ese caso el conocimiento no añade ninguna nota de criterio no aplicado (el usuario «no pidió nada que filtrar»), la condición (c) del §4.1 se cumpliría y el turno **listaría las 11 obras como si fueran barrocas**. El Request Interpreter no conoce hoy el estado del interruptor. Es el riesgo principal de esta Adenda (§6.1).

### 4. Qué cambia exactamente

**4.1 Lista nueva de términos de época, `SOLO_EPOCA_TERMINOS`.** Lista cerrada, **separada** de `SOLO_GENERO_TERMINOS`, ya sin acentos:
  - `barroco`, `barroca`, `barrocos`, `barrocas`;
  - `siglo de oro`, `siglos de oro`;
  - `isabelino`, `isabelina`, `isabelinos`, `isabelinas`;
  - `neoclasico`, `neoclasica`, `neoclasicos`, `neoclasicas`;
  - `medieval`, `medievales`;
  - `grecolatino`, `grecolatina`, `grecolatinos`, `grecolatinas`;
  - `renacentista`, `renacentistas`;
  - `contemporaneo`, `contemporanea`, `contemporaneos`, `contemporaneas`;
  - `romanticismo`;
  - `vanguardia`, `vanguardias`;
  - `posguerra`.

`clasico` y sus variantes **no** se repiten aquí: siguen en `SOLO_GENERO_TERMINOS` (Adenda 004C).

**4.2 Términos compuestos.** Un término puede tener varias palabras (`siglo de oro`). La forma se cumple cuando las palabras que quedan tras el verbo y el artículo opcionales forman **exactamente** un término de la lista, completo y sin nada más.

**4.3 Artículos en singular.** La lista cerrada de artículos pasa a ser: `el`, `la`, `las`, `los`, `unas`, `unos`, `algunas`, `algunos`. **Revisa el §4.1 de la Adenda 004C:** la lista es común a las dos formas, de modo que «la comedia» y «el musical» también pasan a cumplir la forma de solo género. «del» no es artículo (§1).

**4.4 Dependencia del interruptor.**
- **Encendido:** una petición que cumple la forma con un término de época es listado puro y, si no abre ningún dominio por sí misma, su dominio es **Obras**, exactamente como la 004C para los géneros. Las condiciones (b) a (e) del §4.1 de SCENAIA-004 se siguen comprobando igual: una época sin obras en el catálogo no es listado puro, pero tampoco llama a la IA, por la regla vigente de `needsAI` con cero resultados.
- **Apagado:** **ningún** término de época cuenta como listado puro ni fija el dominio Obras. El comportamiento es **idéntico al actual**: sin dominio, a la IA, como hoy.

**4.5 Dónde vive.**
- **La detección** vive entera en `lib/request-interpreter/plain-listing-rules.ts`, que recibe `epocaHabilitada` **como dato**, con un **tipo propio del Request Interpreter** (`{ readonly epocaHabilitada: boolean }`), declarado en el propio componente. No se importa `OpcionesEpoca` ni ninguna otra cosa de Knowledge Assets.
- **`normalizeRequest`** (`interpreter.ts`) recibe esa opción como parámetro **opcional y último**, y solo la reenvía a la detección. Ausente, el comportamiento es el de hoy. `requestId` sigue siendo el segundo parámetro, obligatorio (invariante F5F-1).
- **El Orquestador** (`coordinate-flow.ts`) la pasa a la **primera** llamada a `normalizeRequest` con el mismo patrón que ya usa para el conocimiento y el resolutor: con el interruptor apagado no añade ningún argumento (007A §4.4). La segunda llamada, tras el resolutor, no cambia: el texto aumentado nunca cumple la forma.
- **Nada más** cambia del Request Interpreter.

**4.6 Revisión de la Adenda 004C.**
- **§4.1:** se añade la lista de términos de época del §4.1 de esta Adenda, con términos compuestos (§4.2), y la lista de artículos incorpora `el` y `la` (§4.3).
- **§4.6 («Lo que NO cambia»):** el interruptor `SCENAIA_EPOCA_ENABLED` pasa a ser leído, como dato, por el Request Interpreter. Nada más de ese apartado cambia.
- **§6.4:** «las épocas a secas» deja de ser riesgo residual. El resto de ese apartado sigue vigente.

**4.7 Revisión de la Adenda 007A.**
- **§4.1 no cambia:** el interruptor se sigue leyendo **solo** en el Orquestador y en la ruta.
- **§4.2:** se añade un destino más al que el valor viaja **como dato**:
  - **Al Request Interpreter:** desde el Orquestador, en la primera llamada a `normalizeRequest`. Solo lo usa la detección de la forma de solo criterio (`plain-listing-rules.ts`).
- **§4.3:** el alcance de tránsito incluye `interpreter.ts`, que solo recibe y reenvía el valor.
- **§4.4 sigue vigente** también para este destino: apagado, la llamada es exactamente la anterior.
- **El invariante de Knowledge Assets no se toca:** el Request Interpreter no importa nada nuevo de Knowledge Assets; el tipo de la opción es propio.

**4.8 Lo que NO cambia.**
- `DOMAIN_KEYWORDS` y la regla de subordinación de dominios.
- La lista de verbos de la 004C.
- El intérprete de obras, el Intent Resolver, Knowledge Assets, Repository Layer, el Decision Engine, la composición de la respuesta y la validación del estado.
- Los interruptores `SCENAIA_PAGINACION_ENABLED`, `SCENAIA_GENERO_SQL_ENABLED` y `SCENAIA_EPOCA_ENABLED`, y dónde se leen.
- Ningún invariante de contrato existente.
- Cualquier petición que no cumpla la forma.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Añadir las épocas a `SOLO_GENERO_TERMINOS`** | Con el interruptor apagado se listaría el catálogo entero como si fuera de esa época (§3.3). Además rompe la prueba de sincronía de la 004C, que exige que cada término de género produzca solo `{genre}` con el interruptor apagado. |
| **Leer el interruptor dentro del Request Interpreter** | Contradice la 007A §4.1 (se lee solo en el Orquestador y la ruta) y convierte una función pura en dependiente del entorno. |
| **Importar `OpcionesEpoca` o el vocabulario de Knowledge Assets** | Rompe el invariante del Request Interpreter (§2.4). |
| **Protegerlo en el Decision Engine** (exigir criterio aplicado cuando la forma es de época) | Obliga a interpretar texto fuera del Request Interpreter, contra la condición 4 del §7 de SCENAIA-004, y a una señal nueva en el conocimiento. |
| **Dejarlo como está** | Las épocas a secas siguen yendo a la IA sin catálogo, con coste y riesgo de obras inventadas. |
| **Lista propia de épocas + interruptor como dato (propuesta)** | Resuelve el caso sin tocar el dominio general, ningún invariante ni otro componente que el transporte ya previsto por la 007A. |

### 6. Riesgos y su acotación

1. **Riesgo principal: listar el catálogo entero como si perteneciera a una época.** Ocurriría si un término de época contara como listado puro con `SCENAIA_EPOCA_ENABLED` apagado. Lo acotan:
   - la detección recibe `epocaHabilitada` como dato y, apagado, ignora la lista de épocas (§4.4);
   - la prueba obligatoria del §7.3, que reproduce el caso de las 11 obras con el interruptor apagado;
   - apagar el interruptor devuelve las épocas exactamente al comportamiento de hoy, no a este fallo.
2. **Que la forma se amplíe sin control.** Las listas siguen siendo cerradas; ampliarlas exige una nueva adenda.
3. **Que la lista de épocas se desincronice del intérprete de obras.** Lo acota la prueba de sincronía en los dos sentidos del §7.1.
4. **Que los artículos en singular admitan algo indebido.** Solo cuentan dentro de la forma cerrada: «la comedia del arte» sigue sin cumplirla por la palabra añadida.
5. **Riesgo residual conocido, que esta Adenda no resuelve:**
   - «teatro» + época y «teatro clásico» a secas (Organizaciones);
   - «del siglo de oro»;
   - las combinaciones con otros criterios («obras barrocas», «comedias barrocas»);
   - los sinónimos de época fuera de la lista del §4.1.

   Siguen comportándose exactamente como hoy.

### 7. Condiciones de la futura implementación

1. **Prueba de sincronía en los dos sentidos** con el intérprete de obras, **en modo encendido**:
   - cada término de `SOLO_EPOCA_TERMINOS` produce, con `epocaHabilitada: true`, un criterio de época y nada más;
   - cada concepto de época que el intérprete de obras reconoce tiene al menos un término en la lista, salvo los que el §4.1 deja fuera de forma expresa.
2. **Vocabulario propio y sin duplicados dentro del Request Interpreter:** `SOLO_EPOCA_TERMINOS` se declara solo en `plain-listing-rules.ts`, e `interpreter.ts` no contiene ningún término de época.
3. **Prueba del interruptor apagado:** con `epocaHabilitada` ausente o `false`, **ningún** término de época es listado puro ni fija el dominio Obras, en todas las combinaciones de verbo y artículo. Incluye expresamente el caso de las 11 obras: «barroco» con el interruptor apagado no produce un listado del catálogo entero.
4. **Casos que cambian** (interruptor encendido), con y sin historial: «barroco», «el barroco», «dame barroco», «siglo de oro», «el siglo de oro», «isabelino», «contemporáneo».
5. **Casos que no cambian:** «teatro barroco», «comedias barrocas», «recomiéndame barroco», «del siglo de oro», «obras barrocas».
6. **Límites de la forma:** dos épocas, época y género juntos, término compuesto incompleto («siglo de»), palabra añadida, y verbo o artículo fuera de las listas.
7. **La forma de solo género de la 004C sigue pasando todas sus pruebas,** más «la comedia» y «el musical» (§4.3).
8. **Ningún invariante de contrato existente se modifica.**
9. **Suite completa, `tsc`, lint y `next build` en verde.**
10. **Diff revisado contra el §4.5** antes de fusionar: solo `plain-listing-rules.ts`, `interpreter.ts`, la primera llamada a `normalizeRequest` en `coordinate-flow.ts` y sus pruebas.
11. **Aceptación funcional de Dirección** tras el despliegue, con el protocolo de cuenta de prueba dedicada del PR 5 de la Adenda 004B: 0 filas nuevas en `credit_reservations` y en `ai_requests` para los casos que cambian.

### 8. Veredicto

**[Pendiente de decisión de Dirección.]** Hasta su firma, el §4.1 de la Adenda 004C y el §4.2 de la Adenda 007A rigen en su redacción actual, y las épocas a secas siguen comportándose como hoy.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

____________________________________________

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** ______________________   **Fecha:** __________
