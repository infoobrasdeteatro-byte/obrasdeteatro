# ACTA DE AUTORIZACIÓN — Criterios de obra no aplicables en Organizaciones

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-008
**Fecha:** 2026-09-30
**Estado resultante:** AUTORIZADA CON CONDICIONES — LISTA PARA IMPLEMENTACIÓN

**Verificación documental previa a la asignación del expediente (2026-09-30):** `SCENAIA-008` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`, incluidos los ficheros ignorados por git;
- los ficheros de los dos árboles de trabajo adicionales (`_aec003-fase5` y `_scenaia-003-replay`);
- los mensajes de commit ni el contenido versionado de ninguna rama, incluidos el reflog, el stash y la referencia de respaldo (`refs/backup`). Son 86 referencias en total, 1 de ellas de respaldo;
- los 215 objetos sueltos o inalcanzables del repositorio, examinados uno a uno;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`, incluidos sus dos paquetes git (`obrasdeteatro-completo.bundle`, 296 commits, y `stash-scenaia-bloque-3.bundle`, 143 commits).

Las actas existentes de ScenaIA son la 004 (con sus adendas 004A a 004D), la 005, la 006 (con la 006A) y la 007 (con la 007A).

---

### 1. Objeto del Acta

Que la búsqueda del dominio **Organizaciones** declare como **criterio no aplicado** cualquier término de **género** o de **época** de la consulta, ya que no sabe filtrar por ellos. Así la respuesta advierte de que el resultado no está filtrado por todo lo pedido, en lugar de listar el dominio entero como si coincidiera.

El cambio vive entero en **Knowledge Assets**: en el intérprete de Organizaciones y en su rama del recuperador. Usa el mecanismo de «criterio no aplicado» que ya existe y no crea ninguno nuevo.

Quedan **fuera** de esta Acta:
- **Qué dominio gana** en «teatro» + época o género (`DOMAIN_KEYWORDS`, el Request Interpreter, la forma de solo criterio). Es el expediente futuro que señalan el §1 de la Adenda 004C y el de la 004D, y esta Acta no lo resuelve.
- **Filtrar** organizaciones por género o época. `institutions` no tiene ninguna columna para ello.
- **Otros criterios de obra** que Organizaciones tampoco sabe aplicar (edad, duración, reparto: «teatro infantil», «salas para obras cortas»). Se señalan como riesgo residual (§6.4).
- **Los dominios Personas y Oportunidades**, que tienen el mismo hueco (§6.4).

### 2. Base documental

1. **Diagnóstico de solo lectura del 2026-09-30,** sobre `a3c72fa`, con el Request Interpreter y los intérpretes de obras y de Organizaciones reales, y con recuentos sobre la base de producción (§3).
2. **Precedente del criterio no aplicado en Organizaciones** (`lib/knowledge-assets/semantic-retriever.ts:140`): la búsqueda ya declara `unappliedCriteria: ['ubicacion']` cuando la consulta pide un lugar que no ha podido resolver (`hasUnresolvedLocation`). Las ramas de Obras (`:129`, `['autor']`) y de Personas (`:151`, `['ubicacion']`) siguen el mismo patrón.
3. **Los cuatro estados del conocimiento** (`lib/scenaia-knowledge-model/knowledge-context-builder.ts`), que ya existen:

   | `requestWasNarrowed` | `unappliedCriteria` | Resultado |
   |---|---|---|
   | sí | vacío | completo, nada que declarar |
   | sí | con contenido | nota de criterio **parcial** (`partiallyAppliedCriteriaNote`) |
   | no | con contenido | nota de resultado **sin filtrar** (`unfilteredCriteriaNote`) |
   | no | vacío | sin criterio pedido, nada que advertir |

   Los consumidores ya los reconocen por coincidencia exacta:
   - `compose-prompt.ts` (`formatUnappliedCriteria`) avisa a la IA de las dos notas;
   - `build-direct-content.ts` usa la nota de sin filtrar en la respuesta directa;
   - `plain-listing.ts` (Decision Engine) veta el listado puro con cualquiera de las dos.
4. **Regla de uso de la IA** (`lib/decision-engine/needs-ai.ts:61-72`): un turno de Organizaciones con uno o más resultados va **siempre** a la IA, porque Organizaciones nunca es listado puro. Con cero resultados se responde directamente.
5. **Invariantes de Knowledge Assets** (`lib/knowledge-assets/__tests__/contract-invariants.test.ts`): el intérprete de Organizaciones es puro y síncrono, sin acceso a datos ni IA, y solo emite los valores de `type` del CHECK real de `institutions`. Nada impide que use el vocabulario del intérprete de obras, que pertenece al mismo componente.
6. **Corrección de hecho a la Adenda 004C.** El §1 y el §5 de la 004C excluyeron «teatro clásico» porque «las organizaciones tienen su propio `tipo_clasico`». Verificado el 2026-09-30:
   - `tipo_clasico` existe solo en `perfil_compania` y `perfil_festival`, no en `perfil_teatro`;
   - las tres tablas tienen 0 filas;
   - solo lo lee el Professional Context Engine (`organizational-profile.ts`), es decir, el perfil del propio usuario;
   - la búsqueda de ScenaIA en Organizaciones consulta únicamente `institutions` y nunca lo lee.

   La exclusión de la 004C sigue siendo válida por otros motivos (la ambigüedad de producto). Esta Acta **deja constancia de la corrección, pero no revisa la 004C**.

### 3. Qué se revisa

**3.1 Cómo busca hoy Organizaciones.** El intérprete (`interpret-organization-query.ts`) reconoce cuatro criterios, todos columnas reales de `institutions`: `type`, país, región y ciudad. **Nunca busca por nombre ni por repertorio.** Todo lo demás de la consulta se descarta en silencio:

| Consulta | Dominio | Criterio de Organizaciones | Qué se pierde |
|---|---|---|---|
| teatro barroco | Organizaciones | `{type:"theater"}` | «barroco» |
| teatro de comedia | Organizaciones | `{type:"theater"}` | «comedia» |
| compañías de teatro barroco | Organizaciones | `{type:"company"}` | «barroco» |
| festival de teatro clásico | Organizaciones | `{type:"festival"}` | «clásico» |
| productoras barrocas | Organizaciones | `{}` | «barroco» |
| instituciones del siglo de oro | Organizaciones | `{}` | «siglo de oro» |

**3.2 Qué falla.** Ningún término de género o época entra en `unappliedCriteria`, así que no se emite ninguna nota. El resultado se entrega como si respondiera a todo lo pedido. Hay dos casos:
- **Con término de tipo** («teatro barroco»): `requestWasNarrowed` es `true`. El día que exista al menos un teatro, se listarían **todos los teatros** como si fueran barrocos, en un turno que además pasa por la IA (§2.4) y consume una reserva.
- **Sin término de tipo** («productoras barrocas»): el criterio queda vacío y se lista **todo el dominio**. Esto **ya ocurre hoy**: `institutions` tiene 1 fila pública y activa («Biblioteca Oficial ObrasDeTeatro®», tipo `platform`), así que esas consultas van a la IA con esa institución delante y sin ningún aviso.

**3.3 Estado del catálogo** (producción, 2026-09-30):
- `institutions` tiene 1 fila, **0 teatros**.
- Ningún nombre de institución, perfil ni obra contiene un término de género o época.

La ambigüedad de nombres es hoy teórica. El fallo de 3.2 no lo es.

### 4. Qué cambia exactamente

**4.1 Detección en el intérprete de Organizaciones.** `interpret-organization-query.ts` incorpora una función pura, en el mismo patrón que `hasUnresolvedLocation`. Devuelve qué criterios de obra menciona la consulta y Organizaciones no sabe aplicar:
- `'genero'` si menciona un término de género;
- `'epoca'` si menciona un término de época.

La comparación es por **palabra completa**: «actual» no coincide dentro de «actualmente».

**4.2 Vocabulario.** Es el del intérprete de obras de Knowledge Assets, sin copiarlo:
- **Géneros:** los sinónimos de COMEDIA, MUSICAL y CLASICO.
- **Épocas:** los sinónimos de CONTEMPORANEO y todos los de `EPOCA_TERMS` (SCENAIA-007), incluidos los que la 004D dejó fuera de su forma (realismo, renacimiento, griego, áureo…). Aquí no se trata de listar, sino de avisar, y cualquier término que el intérprete de obras reconozca es algo que Organizaciones no aplica.

`interpret-work-query.ts` expone ese vocabulario con una exportación pura de solo lectura. **`interpretWorkQuery` no cambia de comportamiento.** Ninguna lista nueva se declara a mano.

**4.3 Independencia del interruptor de época (decisión de Dirección).**
- **Propuesta:** el vocabulario de épocas cuenta siempre, con `SCENAIA_EPOCA_ENABLED` encendido o apagado. Declarar un criterio como no aplicado nunca filtra, nunca amplía un resultado y nunca da por reconocido un criterio de obra: solo añade un aviso. Así el cambio no necesita que el interruptor llegue a Organizaciones, y no toca el transporte de la 007A. El §4.4 del Acta 007 regula qué **aplica** el intérprete de obras, y eso no cambia.
- **Alternativa:** que las épocas solo cuenten con el interruptor encendido. Exigiría llevar la opción de época también a la rama de Organizaciones: un destino nuevo en la 007A y un cambio en Scenaia Knowledge Model, fuera del alcance del §5.

**4.4 En el recuperador.** En la rama de Organizaciones de `semantic-retriever.ts`, `unappliedCriteria` pasa a ser la unión de lo que ya declara (`'ubicacion'`) y lo que devuelve la función del §4.1. `requestWasNarrowed` no cambia: sigue siendo `Object.keys(criteria).length > 0`.

**4.5 Efecto resultante.** No hace falta cambiar ningún consumidor:

| Situación | Nota | Qué ve el usuario |
|---|---|---|
| Con tipo, 1+ resultados («teatro barroco» con teatros cargados) | parcial | La IA recibe «el listado está filtrado solo EN PARTE» y no puede presentarlos como coincidentes. |
| Con tipo, 0 resultados (hoy, «teatro barroco») | parcial | Sin cambio: «En organizaciones no he encontrado ningún resultado.» La respuesta directa no usa la nota parcial, y con cero resultados no hay nada que matizar. |
| Sin tipo, 1+ resultados (hoy, «productoras barrocas») | sin filtrar | La IA recibe «el listado NO está filtrado por el criterio pedido». |
| Sin tipo, 0 resultados | sin filtrar | Cambia el texto directo: «En organizaciones no he podido aplicar el criterio que pedías, y tampoco he encontrado ningún resultado.» |

**4.6 Lo que NO cambia.**
- `DOMAIN_KEYWORDS`, la regla de subordinación de dominios y todo el Request Interpreter.
- Qué dominio gana en cualquier consulta.
- Los criterios que se aplican: ningún filtro nuevo en Organizaciones.
- Repository Layer, Scenaia Knowledge Model (la construcción de las notas), Decision Engine (`needsAI`, listado puro), Prompt Composer, Direct Content Builder y la composición de la respuesta.
- El comportamiento de `interpretWorkQuery` y del dominio Obras.
- Los interruptores `SCENAIA_PAGINACION_ENABLED`, `SCENAIA_GENERO_SQL_ENABLED` y `SCENAIA_EPOCA_ENABLED`, y dónde se leen.
- El Acta SCENAIA-004 y sus adendas 004A a 004D, el Acta SCENAIA-007 y la Adenda 007A.
- Ningún invariante de contrato existente.

### 5. Alcance

Solo **Knowledge Assets**:
- `lib/knowledge-assets/interpret-organization-query.ts`: la función del §4.1;
- `lib/knowledge-assets/interpret-work-query.ts`: únicamente la exportación de solo lectura del §4.2;
- `lib/knowledge-assets/semantic-retriever.ts`: únicamente la línea de `unappliedCriteria` de la rama de Organizaciones;
- sus pruebas.

No toca `DOMAIN_KEYWORDS`, el Request Interpreter ni ninguna otra acta de la familia 004.

### 6. Riesgos y su acotación

1. **Riesgo principal que esta Acta corrige: listar todo un dominio como si coincidiera.**
   - Con un solo teatro en el catálogo, «teatro barroco» listaría todos los teatros como barrocos, sin ninguna nota y con coste de IA.
   - Sin término de tipo ocurre ya hoy (§3.2).
   - Lo acotan la declaración del §4.4 y las pruebas del §7.1 y el §7.2.
2. **Avisos de más.** Una palabra de la lista usada en otro sentido («un teatro con una sala moderna») produciría una nota parcial innecesaria. La consecuencia es solo un aviso de más, nunca un filtro ni un dato inventado, y la comparación por palabra completa lo reduce. Se acepta a cambio de no perder nunca el aviso cuando procede.
3. **El aviso llega a través de la IA.** Con uno o más resultados, la advertencia viaja en el prompt, que el proveedor puede no respetar del todo. Es el mismo mecanismo y el mismo límite que ya rigen para la ubicación y el autor.
4. **Riesgo residual conocido, que esta Acta no resuelve:**
   - **Edad, duración y reparto** en Organizaciones («teatro infantil», «salas para obras cortas»);
   - el mismo hueco en **Personas** («actores de teatro barroco») y **Oportunidades**;
   - **qué dominio gana** en «teatro» + época o género (expediente propio, familia 004);
   - «escuelas de teatro clásico» se resuelve hoy como tipo `theater`, porque «escuela» no es un tipo de `institutions`. Es un problema de tipos, no de criterios.

### 7. Condiciones de la futura implementación

1. **Pruebas con al menos un teatro simulado en el catálogo**, con el intérprete de Organizaciones y el recuperador reales, y solo la persistencia simulada:
   - «teatro barroco», «teatro de comedia», «teatro del siglo de oro», «teatros contemporáneos» → el teatro aparece, `unappliedCriteria` incluye `'epoca'` o `'genero'`, y el conocimiento lleva la **nota parcial**;
   - «teatro barroco en Madrid» con Madrid sin resolver → `unappliedCriteria` incluye `'ubicacion'` y `'epoca'`;
   - con un teatro que **no** coincide con nada de lo pedido, la nota sale igual (Organizaciones no puede saber si coincide).
2. **Pruebas sin coincidencia de género o época:** «teatros», «teatros en Madrid» (resuelto), «salas», «compañías» → `unappliedCriteria` igual que hoy y **ninguna nota nueva**.
3. **Consulta sin término de tipo:** «productoras barrocas» con al menos una institución en el catálogo → nota de **sin filtrar**; con cero resultados, el texto directo del §4.5.
4. **Palabra completa:** «teatros en activo actualmente» no declara época; «teatro actual» sí.
5. **Independencia del interruptor**, si Dirección aprueba la propuesta del §4.3: el resultado es idéntico con la opción de época ausente, `false` o `true`.
6. **Sincronía del vocabulario:** la función del §4.1 reconoce cada sinónimo de género y época del intérprete de obras, sin excepciones, leído del propio intérprete y no de una lista escrita a mano.
7. **`interpretWorkQuery` no cambia:** sus pruebas actuales pasan sin modificar.
8. **Invariantes:** el intérprete de Organizaciones sigue siendo puro y síncrono, sin acceso a datos, y solo emite valores de `type` del CHECK real. **Ningún invariante existente se modifica.**
9. **Errores introducidos a propósito** con recuento de pruebas que fallan, entre ellos: quitar la declaración del §4.4, quitar las épocas o los géneros del vocabulario y comparar por subcadena en lugar de por palabra.
10. **Suite completa, `tsc`, lint y `next build` en verde.**
11. **Diff revisado contra el §5** antes de fusionar.
12. **Aceptación funcional tras el despliegue**, con el protocolo de cuenta de prueba dedicada:
    - «teatro barroco» sigue respondiendo «En organizaciones no he encontrado ningún resultado.» sin IA, mientras no haya teatros;
    - una consulta sin término de tipo («productoras barrocas») va a la IA como hoy, y en ese turno el prompt incluye el aviso de «NO filtrado»;
    - la ruta del caso f) de la 004D no cambia.

### 8. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **No hacer nada hasta que haya teatros** | El fallo sin término de tipo ya ocurre hoy (§3.2), y cargar teatros activaría el otro sin que nada lo advirtiera. |
| **Filtrar organizaciones por género o época** | `institutions` no tiene esas columnas. Sería inventar un criterio (ADR SCENAIA-002C.1: nunca un valor inventado). |
| **Enviar Organizaciones a Obras cuando hay género o época** | Cambia qué dominio gana: toca `DOMAIN_KEYWORDS` o la subordinación, que la 004C y la 004D congelan. Es el expediente futuro, no este. |
| **Declararlo en Scenaia Knowledge Model o en el Decision Engine** | Obligaría a interpretar texto fuera de Knowledge Assets, contra el patrón vigente: cada dominio declara sus propios criterios no aplicados. |
| **Lista de términos escrita a mano en Organizaciones** | Se desincronizaría del intérprete de obras. El vocabulario ya existe en el mismo componente (§4.2). |
| **Declaración en Knowledge Assets con el vocabulario real (propuesta)** | Reutiliza el mecanismo, las notas y los consumidores existentes, no añade transporte ni invariantes y queda en un solo componente. |

### 9. Veredicto

**AUTORIZADA CON CONDICIONES.** Dirección autoriza los puntos del §4 de esta Acta, en los términos de las condiciones del §7 y de las recogidas en el §10, con el vocabulario de épocas contando siempre, como propone el §4.3. El Acta SCENAIA-004 y sus adendas 004A a 004D, el Acta SCENAIA-007 y la Adenda 007A siguen vigentes sin cambios. Hasta que la implementación cumpla esas condiciones y se despliegue, no cambia ningún comportamiento: la búsqueda de Organizaciones sigue comportándose como hoy.

---

### 10. Autorización

**Decisión:** ☐ Autorizada   ☒ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Decisión sobre el §4.3:** ☒ Épocas siempre (propuesta)   ☐ Épocas solo con el interruptor encendido

**Condiciones o exclusiones:**

Se autoriza la declaración de criterios de obra no aplicables en Organizaciones según los términos del §4, con el vocabulario de épocas contando siempre, independientemente de SCENAIA_EPOCA_ENABLED, tal como propone el §4.3. El riesgo residual señalado en el §6.4 (Personas, Oportunidades, edad/duración/reparto) queda para expedientes futuros.

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** Héctor Renee Díaz Bausson — Founder & CEO, obrasdeteatro.com   **Fecha:** 2026-09-30
