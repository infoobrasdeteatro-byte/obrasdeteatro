# ACTA DE AUTORIZACIÓN — Emisión de la respuesta por fragmentos (streaming)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-005 (Arreglo D, PR 3 y 4)
**Fecha:** ____________
**Estado resultante:** PENDIENTE DE AUTORIZACIÓN — LA IMPLEMENTACIÓN NO ESTÁ AUTORIZADA

**Verificación documental previa a la asignación del expediente (2026-09-22):** `SCENAIA-005` no existía en documentación, código, migraciones, material archivado bajo `_incidente-trazabilidad-2026-07-19/`, mensajes de commit de ninguna rama, objetos versionados de ninguna rama, el stash de respaldo `refs/backup/stash-scenaia-bloque-3` (`f6f2caf`) ni el respaldo permanente de `Documentos\respaldos\obrasdeteatro-2026-09-19`. El expediente más alto en uso era `SCENAIA-003`.

---

### 1. Objeto del Acta

Autorizar que la respuesta de ScenaIA se muestre al usuario según llega del proveedor, en vez de esperar a tenerla completa.

Los dos primeros pasos del plan ya están en producción y **no** dependen de esta Acta: la medición del primer fragmento (PR #20) y el canal NDJSON con un único evento final, tras `SCENAIA_STREAMING`, hoy apagado (PR #21). Ninguno cambió el comportamiento del turno. Esta Acta cubre los pasos 3 y 4, que sí lo cambian.

### 2. Base documental

1. `docs/gobernanza/caracterizacion-orquestador-flujo-completo.md` — PAO-01 a PAO-09, en particular PAO-02 y PAO-06.
2. `docs/gobernanza/acta-autorizacion-implementacion-orquestador.md` §4.6 — toda modificación arquitectónica posterior pasa por gobernanza.
3. `lib/response-composer/compose-response.ts` — degradación a `RESPONSE_DIRECT` cuando la IA no entrega contenido.
4. `lib/accounting-engine/economic-unit.ts` — `resolveSettlementCost`: sin desglose de tokens se liquida el coste reservado.
5. Plan del Arreglo D, entregado a Dirección el 2026-09-22.
6. Métricas `scenaia.ai.first_token_ms` y `scenaia.request.duration_ms`, en producción desde el PR #20.

### 3. Principio que se revisa

**PAO-06** exige preservar el orden del flujo congelado, y hoy ese orden sostiene una garantía implícita que nadie escribió como propiedad pero que el sistema cumple: **el usuario no ve absolutamente nada hasta que Response Composer ha decidido el tipo de respuesta.** Mientras esa decisión no existe, el sistema conserva la opción de cambiar de respuesta.

Con streaming, los 7 pasos se ejecutan en el mismo orden y Response Composer sigue componiendo el `ResponseContext`, pero **deja de ser una puerta**: el texto sale antes de que él decida. Eso es lo que esta Acta somete a Dirección.

**PAO-02** (el Orquestador nunca genera contenido) se respeta a condición de que el Orquestador **reenvíe** los fragmentos sin acumularlos ni editarlos. Si llegara a componer el texto, lo estaría generando.

**PAO-03, PAO-04 y PAO-05** no se ven afectadas: no se almacena conocimiento, el búfer muere con la invocación y no aparece ningún prompt nuevo.

### 4. Qué cambia exactamente

**4.1 Proveedor y Gateway (PR 3, sin efecto visible).** El adaptador ya llama en streaming desde el PR #20; se añade la forma de ejecución que entrega los fragmentos a quien invoca, conservando `usage`, `finish_reason` y el audit actuales. El Orquestador sigue esperando al final. Sirve para comprobar que la liquidación no cambia antes de tocar nada visible.

**4.2 Orquestador y ruta (PR 4).** `coordinateFlow` acepta un destinatario de fragmentos y los reenvía. La ruta emite eventos `chunk` y cierra con el evento `final` ya existente, que lleva el `ResponseContext` y el estado conversacional sin cambio de forma.

**4.3 Cliente.** El mensaje se crea vacío con el primer fragmento y crece. El aviso del turno se calcula **solo** con el evento final, como hoy.

**4.4 Cierre del turno.** La liquidación y los tres registros ocurren después del último fragmento y antes de cerrar el canal. La decisión de liquidar o liberar no cambia y **nunca se toma al empezar a enviar texto**.

**4.5 Interruptor.** `SCENAIA_STREAMING`, ya desplegado y apagado. Volver atrás es apagarlo y redesplegar la misma versión, sin tocar código.

### 5. Riesgo principal: error de OpenAI a mitad de la respuesta

**Hoy**, si la IA falla, Response Composer degrada a `RESPONSE_DIRECT` y el usuario recibe igualmente la información factual recuperada. **Esa degradación es imposible una vez enviado el primer byte:** el texto ya mostrado no puede retirarse.

Regla propuesta, que acota el riesgo sin eliminarlo:

  a) **antes del primer fragmento**, todo se comporta como hoy, degradación incluida. Los fallos más frecuentes — credencial, proveedor caído, red — ocurren aquí;
  b) **después del primer fragmento**, se conserva el texto recibido y el evento final llega con `RESPONSE_PARTIAL` y una advertencia de interrupción. El usuario ve una respuesta a medias con su aviso, en vez de una respuesta factual completa.

**Riesgo residual que Dirección debe aceptar o rechazar:** en los fallos a mitad de generación, el usuario recibe menos de lo que recibe hoy.

**Efecto económico asociado.** Si el usuario corta la conexión o el stream se interrumpe, el proveedor no publica `usage`, y la liquidación cae al coste reservado, que es mayor que el real. Estimar los tokens a partir del texto recibido sería inventar una cifra económica, y esta Acta no lo propone.

### 6. Beneficio esperado y su verificación

Adelantar la primera palabra de unos 6,7 s a unos 1,5-2,2 s; el turno completo tarda lo mismo. **La cifra debe confirmarse antes de decidir**, con la mediana de `scenaia.ai.first_token_ms` frente a `scenaia.request.duration_ms`, ya en producción. Si ambas resultan próximas, el beneficio es pequeño y esta Acta debería denegarse.

### 7. Condiciones de la futura implementación

1. PR 3 y PR 4 por separado, en ese orden, cada uno reversible.
2. El Orquestador reenvía, nunca acumula ni compone texto (PAO-02).
3. La liquidación y los registros ocurren siempre, aunque el cliente se haya ido.
4. `SCENAIA_STREAMING` apagada por defecto; se enciende por decisión expresa.
5. Ningún cambio en el techo de tokens, en `needsAI`, en los créditos ni en el contrato `ResponseContext`.
6. Suite completa, `tsc`, lint y build en verde.
7. Aceptación funcional de Dirección con el interruptor encendido, antes de considerarlo el comportamiento por defecto.

### 8. Veredicto

**PENDIENTE.** Sin firma, el interruptor permanece apagado y la respuesta sigue entregándose completa, como hasta ahora.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

_______________________________________________________________

**Firma:** ____________________________   **Fecha:** ____________
