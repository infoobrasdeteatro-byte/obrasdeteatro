# ACTA DE AUTORIZACIÓN — Desajuste de vocabulario teatro/theater en Organizaciones

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-009
**Fecha:** ____________
**Estado resultante:** PENDIENTE DE FIRMA

**Verificación documental previa a la asignación del expediente (2026-09-30):** `SCENAIA-009` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`, incluidos los ficheros ignorados por git;
- los ficheros de los dos árboles de trabajo adicionales (`_aec003-fase5` y `_scenaia-003-replay`);
- los mensajes de commit ni el contenido versionado de ninguna rama, incluidos el reflog, el stash y la referencia de respaldo (`refs/backup`). Son 88 referencias en total, 1 de ellas de respaldo;
- los 215 objetos sueltos o inalcanzables del repositorio, examinados uno a uno;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`, incluidos sus dos paquetes git (`obrasdeteatro-completo.bundle`, 296 commits, y `stash-scenaia-bloque-3.bundle`, 143 commits).

Las actas existentes de ScenaIA son la 004 (con sus adendas 004A a 004D), la 005, la 006 (con la 006A), la 007 (con la 007A) y la 008.

---

### 1. Objeto del Acta

Corregir dos defectos de la búsqueda del dominio **Organizaciones** en su población de **perfiles públicos** (cuentas de usuario con `tipo_perfil` organizativo):

1. **Traducción de dos tipos.** Las consultas por teatros y por compañías no encuentran nunca los perfiles de esos tipos, porque el criterio llega en el vocabulario de `institutions` (`theater`, `company`) y los perfiles usan el de `tipo_perfil` (`teatro`, `compania`).
2. **Aviso de «sin filtrar».** Las consultas por productoras, escuelas o instituciones listan el dominio entero sin ningún aviso, porque el intérprete no reconoce esas palabras como tipo.

Quedan **fuera** de esta Acta:
- La tabla `institutions`, su columna `type` y su CHECK.
- La base de datos: ni el enum `tipo_perfil` ni ningún dato se renombran.
- Los registros, formularios y perfiles de usuario.
- **Filtrar** por productora, escuela o institución (§8).
- El Request Interpreter y `DOMAIN_KEYWORDS`.

### 2. Base documental

1. **Diagnóstico de solo lectura del 2026-09-30,** sobre `921cafc`, con recuentos sobre la base de producción (§3).
2. **Comentario de diseño de `lib/repository-layer/organization-profiles.ts`** (líneas 18-26, en `main` desde `3c785f0`, 2026-09-18): «aquí viaja el valor literal de `tipo_perfil` […], NO el vocabulario de `institutions.type` […]. No se traduce entre ambos porque tres de los seis valores no tienen equivalente inequívoco (`productora`, `escuela`, `institucion`)». Es una limitación documentada, no un olvido. Ninguna acta la decidió.
3. **Acta SCENAIA-008** (firmada el 2026-09-30, en producción desde `921cafc`): precedente del mecanismo. Organizaciones declara en `unappliedCriteria` lo que no sabe aplicar, y el conocimiento emite la nota de criterio parcial o de sin filtrar que ya existe. También la nota al §3.3 de esa acta (`7b8d44e`), que dejó constancia de este desajuste.
4. **Invariante del intérprete de Organizaciones** (`lib/knowledge-assets/__tests__/contract-invariants.test.ts`, «solo emite valores de `type` admitidos por el CHECK real de institutions»). **No se toca:** la traducción del §4.1 vive en Repository Layer, después del intérprete.
5. **Prueba vigente que fija el comportamiento actual** (`lib/repository-layer/__tests__/organization-profiles.test.ts:78-84`): «un tipo del vocabulario de institutions devuelve NINGUNO». Su revisión se autoriza expresamente en el §4.5.

### 3. Qué se revisa

**3.1 Cómo busca hoy Organizaciones.** `listOrganizationKnowledge` une dos consultas con **el mismo** criterio, que produce el intérprete en el vocabulario de `institutions`:

| | `institutions` | Perfiles públicos (`profiles`) |
|---|---|---|
| Función | `listPublicOrganizations` | `listPublicOrganizationProfiles` |
| Campo de tipo | `type` (texto con CHECK) | `tipo_perfil` (enum de Postgres) |
| Valores | `platform, editorial, university, cultural_org, foundation, festival, other, company, theater` | Organizativos: `compania, productora, teatro, festival, escuela, institucion` |
| Filtro de tipo | `type = criterio` | Si el criterio no es un valor organizativo, **vacío** a propósito; si lo es, `tipo_perfil = criterio` |

**3.2 Qué falla.**

| Consulta | Tipo emitido | En perfiles |
|---|---|---|
| teatros, salas, teatro barroco | `theater` | **Nunca** encuentra un perfil `teatro` |
| compañías, grupos teatrales | `company` | **Nunca** encuentra un perfil `compania` |
| festivales | `festival` | Funciona: el valor es idéntico en los dos vocabularios |
| productoras, escuelas, instituciones | ninguno | Lista **todo** el dominio (instituciones y todos los perfiles organizativos) sin ningún aviso |

**3.3 Estado de producción** (2026-09-30):
- 1 perfil público y activo de tipo `teatro`: hoy no aparece al pedir teatros, pero sí al pedir productoras, escuelas o instituciones.
- 1 perfil de tipo `compania` (no público) y 1 de tipo `productora` (la cuenta del titular, no pública).
- Ningún perfil público de los tipos `festival`, `escuela` o `institucion`.
- `institutions`: 1 fila (tipo `platform`).

La aceptación de SCENAIA-008 lo confirmó en producción: «productoras barrocas» recuperó 2 entidades, la institución y el perfil de teatro.

### 4. Qué cambia exactamente

**4.1 Traducción en la consulta de perfiles.** En `listPublicOrganizationProfiles`, antes de comparar con `tipo_perfil`, el criterio `type` se traduce con una tabla **cerrada** de dos entradas:
- `theater` → `teatro`
- `company` → `compania`

`festival` ya coincide y no se toca. Cualquier otro valor sigue como hoy, es decir, sin resultados si no es un valor organizativo. La traducción afecta **solo al filtro**: los resultados siguen devolviendo el valor real de `tipo_perfil`, y quien lo lea después (por ejemplo, la derivación de funciones teatrales) no cambia.

**4.2 Comentario de diseño actualizado.** El comentario de `organization-profiles.ts` pasa a explicar las dos cosas:
- por qué **estos dos sí** se traducen: la equivalencia es inequívoca, y `theatrical-function.ts` ya trata `theater` como sala;
- por qué `productora`, `escuela` e `institucion` **siguen sin traducirse**: no tienen equivalente en `institutions.type`.

**4.3 Aviso de «sin filtrar» para productoras, escuelas e instituciones.** Mismo patrón que SCENAIA-008:
- Una función pura del intérprete de Organizaciones declara `'tipo'` como criterio no aplicado cuando la consulta menciona, por **palabra completa**, `productora/s`, `escuela/s` o `institucion/es`.
- La rama de Organizaciones del recuperador lo añade a `unappliedCriteria`, junto a `'ubicacion'` y a los criterios de obra de la 008.
- Sin ningún otro criterio, la búsqueda cuenta como no acotada y el conocimiento emite la nota de **sin filtrar**. Con ubicación u otro criterio, emite la nota **parcial**.

**Decisión de Dirección sobre el alcance del aviso:**
- **(i) Solo cuando no hay criterio de tipo** («productoras», «escuelas», «instituciones»). Es lo que pide el encargo.
- **(ii) (propuesta) También cuando hay otro tipo.** Con el §4.1, «escuelas de teatro» se resuelve como `theater` porque «teatro» es la única palabra de tipo, y pasaría a listar el perfil de teatro como si fuera una escuela. Con (ii), ese caso lleva la nota parcial.

**4.4 Vocabulario del §4.3.**
- Es una lista cerrada propia del intérprete de Organizaciones. Knowledge Assets no puede importar `DOMAIN_KEYWORDS` del Request Interpreter.
- Una prueba de sincronía la contrasta con los valores de `ORGANIZATION_PROFILE_TYPES` que no tienen traducción.
- Se declara como **lista plana**, nunca con líneas de la forma `  clave: [`, porque el invariante del §2.4 lee esas líneas como tipos emitidos.

**4.5 Prueba que se revisa (autorización expresa).** La prueba de `organization-profiles.test.ts:78-84` pasa a comprobar la traducción: `theater` busca `tipo_perfil = 'teatro'`. Un valor ajeno a los dos vocabularios (por ejemplo, `platform`) sigue sin devolver nada y sin consultar la base. Es la única prueba existente que se modifica.

**4.6 Lo que NO cambia.**
- La tabla `institutions`, su consulta y su CHECK.
- El enum `tipo_perfil` y cualquier dato.
- El intérprete de Organizaciones en lo que emite (`type` solo del CHECK real) y su invariante.
- `DOMAIN_KEYWORDS`, el Request Interpreter y la subordinación de dominios.
- Scenaia Knowledge Model, Decision Engine, Prompt Composer, Direct Content Builder y la composición: se reutilizan las notas existentes.
- Los interruptores `SCENAIA_PAGINACION_ENABLED`, `SCENAIA_GENERO_SQL_ENABLED` y `SCENAIA_EPOCA_ENABLED`.
- El Acta SCENAIA-008, salvo el efecto indicado en el §6.4.
- Ningún invariante de contrato existente.

### 5. Alcance

- **Repository Layer:** `lib/repository-layer/organization-profiles.ts`, la tabla de traducción del §4.1 y el comentario del §4.2.
- **Knowledge Assets, acotado al §4.3 y el §4.4:** una función pura en `interpret-organization-query.ts` y la línea de `unappliedCriteria` de la rama de Organizaciones en `semantic-retriever.ts`.
- Sus pruebas, incluida la revisión del §4.5.

No toca `institutions`, la base de datos ni ningún registro o formulario de usuario.

### 6. Riesgos y su acotación

1. **«Salas» también se traduce a `teatro`.** El intérprete ya resuelve «sala/s» como `theater`, así que «salas» encontrará los perfiles de teatro. Es aceptable y razonable: un teatro es una sala.
2. **Que la traducción alcance a otro consumidor de `tipo_perfil`.** Revisado en el diagnóstico:
   - `listPublicOrganizationProfiles` solo la llama `listOrganizationKnowledge` (Knowledge Assets);
   - `criteria.type` solo lo leen esa función y `listPublicOrganizations`;
   - la clasificación de perfiles (`profile-classification.ts`), el Professional Context Engine y los formularios no pasan por ella.

   La traducción queda **dentro** de la función y solo afecta a su filtro. Lo comprueba una prueba del §7.5.
3. **Qué cuenta como «mencionar» productora, escuela o institución.** Se reutiliza la detección por palabra completa de SCENAIA-008 (`containsTerm`), con singular y plural cerrados. Una palabra de la lista usada en otro sentido («la escuela de Stanislavski») solo produce un aviso de más, nunca un filtro ni un dato inventado.
4. **Cambio visible de coste y de respuesta.**
   - Hoy «teatros» y «teatro barroco» responden directamente, sin IA y sin coste («no he encontrado ningún resultado»). Con el §4.1 encuentran el perfil de teatro, así que pasan por la IA (con uno o más resultados, Organizaciones siempre va a la IA) y consumen una reserva.
   - En «teatro barroco», la IA recibe además la nota parcial de SCENAIA-008.
   - Esto invalida, desde el despliegue, el comportamiento que se comprobó en la aceptación de la 008 («teatro barroco» sin IA). Es el efecto buscado, no un fallo.
5. **«Escuelas de teatro»** listaría el perfil de teatro como si fuera una escuela. Lo acota la opción (ii) del §4.3, si Dirección la aprueba. Con la (i) queda como riesgo conocido.
6. **Riesgo residual, que esta Acta no resuelve:**
   - filtrar de verdad por productora, escuela o institución;
   - el mismo hueco de vocabulario en el dominio Personas;
   - el tipo `other` de `institutions`.

### 7. Condiciones de la futura implementación

1. **Pruebas con el perfil de teatro**, reproducido como fila simulada con el mismo tipo y la misma visibilidad que el de producción, y con los intérpretes y el recuperador reales:
   - «teatros», «salas» y «teatro barroco» **lo encuentran**;
   - «teatro barroco» lleva además la nota parcial de la 008;
   - «compañías» encuentra un perfil `compania` público simulado.
2. **Consultas sin criterio de tipo:** «productoras», «escuelas» e «instituciones», sin nada más → `unappliedCriteria` incluye `'tipo'` y el conocimiento lleva la nota de **sin filtrar**. La IA recibe el aviso de «NO filtrado» en lugar de un listado presentado como coincidente. Con cero resultados, sale el texto directo de «no he podido aplicar el criterio que pedías».
3. **Con ubicación resuelta** («productoras en Madrid»): la nota parcial.
4. **Opción del §4.3** según la decisión de Dirección: «escuelas de teatro» con nota parcial (ii) o sin ella (i).
5. **Aislamiento:** la traducción solo alcanza al filtro de `listPublicOrganizationProfiles`. Los resultados devuelven el `tipo_perfil` real y la consulta de `institutions` recibe el criterio sin traducir.
6. **Sincronía** de la lista del §4.4 con `ORGANIZATION_PROFILE_TYPES`.
7. **Revisión de la prueba del §4.5**, y solo esa. **Ningún invariante existente se modifica.** El intérprete de Organizaciones sigue siendo puro y síncrono y solo emite tipos del CHECK real.
8. **Errores introducidos a propósito** con recuento de pruebas que fallan, entre ellos: quitar una entrada de la traducción, traducir también en la salida, quitar la declaración de `'tipo'` y comparar por subcadena.
9. **Suite completa, `tsc`, lint y `next build` en verde.**
10. **Diff revisado contra el §5** antes de fusionar.
11. **Aceptación funcional tras el despliegue**, con cuenta de prueba dedicada:
    - «teatros» y «teatro barroco» encuentran el perfil de teatro real (pasan por la IA, con una reserva);
    - «productoras» pasa por la IA con el aviso de «NO filtrado»;
    - recuentos y huellas idénticos tras la limpieza.

### 8. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Renombrar el enum `tipo_perfil` en la base** (`teatro` → `theater`…) | Afecta a cuentas reales, al registro, a los formularios y al Professional Context Engine: `'teatro'` aparece en 15 ficheros y `'compania'` en 12. El riesgo es alto para un fallo de búsqueda. |
| **Que el intérprete emita los dos vocabularios** | Choca con el invariante del §2.4 y cambia el contrato `OrganizationSearchCriteria`, con más alcance para el mismo efecto. |
| **Traducir los seis valores** | `productora`, `escuela` e `institucion` no tienen equivalente en `institutions.type`. Sería una equivalencia fabricada, justo lo que el comentario de diseño evita con razón. |
| **Filtrar perfiles por productora, escuela o institución** | Exigiría que el intérprete emitiera tipos fuera del CHECK de `institutions` (invariante) o un criterio nuevo. Queda como expediente futuro (§6.6). |
| **No hacer nada** | El perfil de teatro seguiría apareciendo solo cuando no se le busca, y las productoras seguirían listando todo sin aviso. |
| **Traducción cerrada en Repository Layer y aviso con el mecanismo de la 008 (propuesta)** | Es el cambio mínimo: no toca la base, el intérprete ni sus invariantes, y reutiliza las notas existentes. |

### 9. Veredicto

**PENDIENTE DE DECISIÓN.** Si se autoriza, hasta que la implementación cumpla las condiciones del §7 y se despliegue, no cambia ningún comportamiento.

---

### 10. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Decisión sobre el §4.3:** ☐ (i) Aviso solo sin criterio de tipo   ☐ (ii) Aviso también con otro tipo (propuesta)

**Revisión de la prueba del §4.5:** ☐ Autorizada   ☐ No autorizada

**Condiciones o exclusiones:**

______________________________________________________________

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** ______________________________   **Fecha:** ____________
