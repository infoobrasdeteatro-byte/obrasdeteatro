# ADENDA AL ACTA DE AUTORIZACIÓN — Prueba de encendido del género y orden de los interruptores

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-006A (adenda a SCENAIA-006)
**Fecha:** 2026-09-29
**Estado resultante:** AUTORIZADA CON CONDICIONES — LISTA PARA IMPLEMENTACIÓN

**Verificación documental previa a la asignación del expediente (2026-09-29):** `SCENAIA-006A` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`;
- los ficheros de los dos árboles de trabajo adicionales;
- los mensajes de commit ni los objetos versionados de ninguna rama, incluidos el reflog, el stash y las referencias de respaldo (`refs/backup`);
- los objetos sueltos o inalcanzables del repositorio;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`.

Las adendas existentes son la 004A y la 004B.

---

### 1. Objeto de la Adenda

Precisar el **§7.4 del Acta SCENAIA-006**, cuyo resultado exigido para «teatro clásico» depende de un interruptor que esa Acta no conocía, y fijar el **orden recomendado de encendido** de los tres interruptores del listado de obras. Nada más. El resto del Acta SCENAIA-006 sigue vigente sin cambios.

### 2. Base documental

1. **Acta SCENAIA-006, §7.4.** Exige, antes de encender `SCENAIA_GENERO_SQL_ENABLED`, repetir la prueba del PR 5 de la Adenda 004B con el resultado «teatro clásico» → 1 ficha y «Mostrando 1 de 1».
2. **Acta SCENAIA-007** («La época como dimensión propia»), tramitada a la vez que esta Adenda. Con `SCENAIA_EPOCA_ENABLED` encendido, «clásico» deja de ser un criterio de género y pasa a ser un criterio de época sobre `works.epocas`.
3. **Adenda SCENAIA-004B**, PR 5: protocolo de prueba con cuenta dedicada contra la base de producción.

### 3. Qué se revisa

El resultado «teatro clásico» → 1 del §7.4 de SCENAIA-006 mide el filtro de género: una obra, *La vida es sueño*, lleva «Teatro clásico» en `genre`. Con `SCENAIA_EPOCA_ENABLED` encendido, esa consulta ya no pasa por el género: devuelve las obras cuyas épocas se solapan con la expansión de «clásico», es decir, las 10 del Siglo de Oro.

Si la prueba del §7.4 se ejecutara con los dos interruptores encendidos, fallaría sin que el filtro de género tuviera ningún defecto.

### 4. Qué cambia exactamente

**4.1 Alcance del resultado «teatro clásico» del §7.4.**
- **Con `SCENAIA_EPOCA_ENABLED` apagado,** el resultado exigido sigue siendo el que fija el §7.4: 1 ficha y «Mostrando 1 de 1».
- **Si `SCENAIA_GENERO_SQL_ENABLED` y `SCENAIA_EPOCA_ENABLED` se encienden a la vez, o el segundo antes que el primero,** el resultado exigido pasa a ser **el conjunto de obras del Siglo de Oro**:
  - 10 fichas y recuento 10;
  - los mismos identificadores que `'siglo_de_oro' = any(epocas)`.
  - En ese caso, el filtro de género por SQL se verifica solo con «dame la lista de obras de comedia» → 5 fichas y «Mostrando 1-5 de 5», que no cambia.

**4.2 Resto del §7.4.** Sin cambios:
- «dame la lista de obras de comedia» → 5 fichas;
- listado sin género igual;
- ninguna fila nueva en `credit_reservations` ni en `ai_requests`;
- cuenta dedicada, huellas antes y después y limpieza verificada.

**4.3 Orden recomendado de encendido en Production.**
  1. **`SCENAIA_PAGINACION_ENABLED`**, si no lo está ya. Es condición previa del género por SQL (Acta SCENAIA-006, §7.6).
  2. **`SCENAIA_GENERO_SQL_ENABLED`**, con la prueba del §7.4 de SCENAIA-006 en su forma original («teatro clásico» → 1), puesto que la época sigue apagada. Debe estar encendido antes de que el catálogo supere las 1.000 obras.
  3. **`SCENAIA_EPOCA_ENABLED`**, una vez aplicado el PR 1 de SCENAIA-007 en Production, con la prueba del §7.4 de SCENAIA-007.

  **Por qué este orden:**
  - cada prueba aísla un único cambio de comportamiento, de modo que un fallo señala sin ambigüedad qué interruptor lo produce;
  - la prueba de la época, hecha la última, cubre además la combinación de género por SQL y época («comedias clásicas» → 5);
  - la época no depende técnicamente de la paginación ni del género por SQL (se resuelve en SQL en los dos modos), así que otro orden no rompe nada: solo obliga a aplicar el §4.1 de esta Adenda.

**4.4 Apagado.** Se apaga en orden inverso: primero la época, luego el género y por último la paginación. Apagar solo la época devuelve «teatro clásico» a su resultado por género sin afectar a los otros dos interruptores.

### 5. Riesgos y su acotación

1. **Probar con un estado de interruptores distinto del que se cree.** Antes de cada prueba se anota el valor efectivo de los tres interruptores en el entorno de compilación y se incluye en el registro de la prueba.
2. **Desbordar la Adenda.** No cambia código, base de datos ni ningún otro punto del Acta SCENAIA-006. Solo precisa un resultado esperado y un orden.

### 6. Condiciones

1. La prueba del §7.4 de SCENAIA-006 se ejecuta y se registra con el resultado que corresponda según el §4.1 de esta Adenda, dejando constancia del valor de los tres interruptores.
2. El encendido sigue el orden del §4.3, salvo decisión expresa de Dirección, que se registrará.
3. Aceptación de Dirección.

### 7. Veredicto

**AUTORIZADA CON CONDICIONES.** Dirección autoriza los puntos del §4 de esta Adenda, en los términos de las condiciones del §6 y de las recogidas en el §8. El resto del Acta SCENAIA-006 sigue vigente sin cambios.

---

### 8. Autorización

**Decisión:** ☐ Autorizada   ☒ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

Se autoriza la precisión del §7.4 de SCENAIA-006 y el orden de encendido del §4.3, tal como los fija esta Adenda.

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** Héctor Renee Díaz Bausson — Founder & CEO, obrasdeteatro.com   **Fecha:** 2026-09-29
