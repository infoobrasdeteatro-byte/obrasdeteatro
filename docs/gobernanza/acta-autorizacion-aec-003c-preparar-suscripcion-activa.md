# ACTA DE AUTORIZACIÓN — Verificación previa a la extinción con suscripción activa

**Proyecto:** Cuenta de usuario – ObrasDeTeatro®
**Bloque:** Extinción de Identidad Digital (revisión de AEC-003B)
**Expediente propuesto:** AEC-003C
**Fecha:** 2026-09-27
**Estado resultante:** AUTORIZADA CON CONDICIONES — LISTA PARA IMPLEMENTACIÓN

**Verificación documental previa a la asignación del expediente (2026-09-27):** `AEC-003C` no existía en documentación, código, migraciones, material archivado bajo `_incidente-trazabilidad-2026-07-19/`, mensajes de commit de ninguna rama, objetos versionados de ninguna rama, el stash ni las referencias de respaldo (`refs/backup`), ni el respaldo permanente de `Documentos\respaldos\obrasdeteatro-2026-09-19`. El expediente más alto en uso de la serie era `AEC-003B`.

---

### 1. Objeto del Acta

Autorizar que el paso «Verificar» de `/cuenta/eliminar` (`app/api/cuenta/eliminar/preparar/route.ts`) deje de bloquear a quien tiene una suscripción de Stripe activa, dado que el paso «Confirmar» (`app/api/cuenta/eliminar/ejecutar/route.ts`) ya cancela esa suscripción antes del punto de no retorno y vuelve a verificar todas las condiciones, sin rebajar su comportamiento fail-closed.

Esta Acta **revisa una decisión vigente** de AEC-003B (Fase 4, `ad57843`), expediente cerrado. No se limita a autorizar lo ya aprobado.

### 2. Base documental

1. `docs/gobernanza/aec-003b-materializacion-extincion-identidad.md`:
   - §3.6 — **DA-005, Principio de Integridad Externa**: ninguna identidad puede extinguirse mientras el ecosistema mantenga frente a Stripe una obligación comercial activa y sin resolver.
   - §4.5 y sección «Fase 4» — `preparar` se construyó cuando la cancelación de Stripe (Fase 5) aún no existía; su éxito no ejecutaba nada irreversible y la interfaz anunciaba que la eliminación definitiva llegaría «en una fase posterior».
   - §6.4 — Principio fail-closed y segunda verificación completa inmediatamente antes del punto de no retorno.
   - §7.3 — la resolución de Stripe se integra en la propia secuencia del evento «**en lugar de exigirla como un requisito externo que el usuario debiera resolver por su cuenta antes de poder solicitar la extinción**».
   - §9.3 — precedente de «dos piezas, cada una correcta por separado», que nunca se habían enlazado; clasificado como incidencia de integración, no como fallo arquitectónico.
   - §12 — la Certificación Funcional se ejecutó con una cuenta recién registrada, sin suscripción: el caso que motiva esta Acta nunca se ejercitó.
2. `lib/cuenta/verificar-condiciones-previas.ts` — motor de solo lectura de la Fase 3 (condiciones `stripe_suscripcion`, `stripe_cobros_pendientes`, `credit_reservations`).
3. `app/api/cuenta/eliminar/ejecutar/route.ts` — orquestador de la Fase 6: cancelación de Stripe (l. 73), verificación final (l. 82-86) y punto de no retorno declarado (l. 88).
4. `app/legal/suscripciones/page.jsx` §5, `app/legal/reembolsos/page.jsx` §4 y `app/legal/terminos/page.jsx` §11 — afirman que la única forma de cancelar una suscripción es eliminar la cuenta, y que la cancelación es inmediata y sin reembolso automático.
5. Diagnóstico y verificación con cuenta de prueba entregados a Dirección el 2026-09-27, con Stripe en modo test contra producción y recuento de limpieza verificado.

### 3. Principio que se revisa

**Regla vigente** (`preparar/route.ts:36-40`): «Verificar» exige `diagnostico.cumpleTodas`; cualquier condición técnica incumplida devuelve `400 condiciones_no_cumplidas`.

**Por qué se revisa.** Las dos condiciones de Stripe exigen que la suscripción esté ya cancelada **antes** de «Verificar», pero la única pieza que la cancela (`cancelarSuscripcionStripe`) se ejecuta en «Confirmar», y el botón «Confirmar» solo aparece si «Verificar» tiene éxito. La exigencia fue correcta en la Fase 4; dejó de serlo cuando la Fase 6 integró la cancelación en `ejecutar`, y `preparar` no se revisó. Es el mismo patrón que el §9.3: dos piezas correctas por separado que nunca se conectaron.

**Defecto verificado en producción (2026-09-27).** Una cuenta de prueba con suscripción activa (Stripe modo test) recorre el flujo real: «Solicitar» → 200; «Verificar» → `400 condiciones_no_cumplidas`. El usuario ve «No puedes continuar todavía: Suscripción en estado "active" -- debe resolverse antes de continuar. / Stripe reporta 1 suscripción(es) abierta(s): active.» y nunca llega a «Confirmar». Ningún suscriptor puede completar la eliminación de su cuenta, que es la única vía de cancelación que prometen los textos legales. A esa fecha la única suscripción activa corresponde a una cuenta interna del titular: ningún cliente está afectado hoy, pero el defecto alcanzaría a cualquier suscriptor.

**La garantía que la regla protegía no depende de ella.** El Principio de Integridad Externa se cumple en `ejecutar`: cancela en Stripe (l. 73) y, si no puede, aborta con `error_stripe` antes de tocar ningún plano; después repite la verificación completa, con la consulta real a Stripe y su fail-closed (l. 82-86), antes del punto de no retorno (l. 88).

**Alcance de la revisión.** Solo `stripe_suscripcion` y `stripe_cobros_pendientes` dejan de bloquear en «Verificar». **`credit_reservations` sigue bloqueando en `preparar`, sin cambios**: `ejecutar` no la resuelve y su resolución pertenece al Credit Manager (§6.3 de AEC-003B).

### 4. Qué cambia exactamente

**4.1 `app/api/cuenta/eliminar/preparar/route.ts:36-40`.** Solo bloquean las condiciones incumplidas que `ejecutar` no resuelve por sí mismo. Las condiciones `stripe_suscripcion` y `stripe_cobros_pendientes` se declaran «resueltas en la ejecución» en un único lugar del archivo. Si cualquier otra condición falla, la respuesta es exactamente la de hoy (`400 condiciones_no_cumplidas` con el diagnóstico). Se actualiza el comentario de cabecera (l. 6-13).

**4.2 Campo nuevo `suscripcionSeCancelara`.** La respuesta de éxito (hoy `{ ok: true, listo: true }`, l. 57) incorpora `suscripcionSeCancelara: true` cuando alguna de las dos condiciones de Stripe estaba incumplida, e incluye el caso de que Stripe no haya respondido. En los demás casos, `false`.

**4.3 Aviso de consentimiento — `app/cuenta/eliminar/PrepararExtincionPanel.tsx:168-172`.** En el estado «listo», antes del botón «Confirmar eliminación definitiva», si `suscripcionSeCancelara` es `true`, se muestra un aviso: al confirmar, la suscripción se cancelará en ese momento, sin esperar al final del período abonado y sin reembolso automático de los días restantes. Su redacción definitiva la aprueba Dirección y debe ser coherente con los tres textos legales del §2.4.

**4.4 Prueba nueva — `app/api/cuenta/eliminar/preparar/__tests__/route.test.ts`** (hoy `preparar` no tiene ninguna). Cubre como mínimo:
  - suscripción activa → éxito con `suscripcionSeCancelara: true`;
  - Stripe sin respuesta → éxito con `suscripcionSeCancelara: true`;
  - sin suscripción → éxito con `false`;
  - `credit_reservations` activas → **sigue bloqueando**;
  - sin sesión, sin solicitud, sin consentimiento y con contraseña incorrecta → mismo comportamiento que hoy.

**4.5 Lo que NO cambia.**
  - **`app/api/cuenta/eliminar/ejecutar/route.ts` no cambia**: orden, cancelación, verificación final fail-closed y punto de no retorno quedan intactos, y lo siguen cubriendo sus 9 pruebas.
  - Tampoco cambian `lib/cuenta/verificar-condiciones-previas.ts`, `lib/cuenta/cancelar-suscripcion-stripe.ts`, `/api/cuenta/eliminar/verificar`, el orden de comprobaciones de `preparar`, el consentimiento y la reautenticación, ni los textos legales, cuyo contenido pasa a ser cierto con este cambio.

### 5. Riesgo principal: cancelación inmediata al confirmar

Quien pulse «Confirmar» con una suscripción activa la cancelará **en el acto**, sin esperar al final del período abonado y sin reembolso automático de los días restantes. Es irreversible en Stripe y ocurre antes de la verificación final: si esa verificación fallara después (p. ej. por una reserva de crédito creada entre «Verificar» y «Confirmar»), la suscripción quedaría cancelada sin completarse la extinción. Este comportamiento ya fue aceptado en el §7.3 de AEC-003B («resolver esa obligación externa es un resultado correcto con independencia de si el resto del evento llega a completarse»).

**Acotación.** El aviso del §4.3 es obligatorio y debe verse antes del botón, no después. Con él, el Principio de Consentimiento Informado (DA-005) cubre la consecuencia económica y no solo la de identidad, que es la única que hoy describe el panel.

**Riesgo secundario.** Si Stripe no responde durante «Verificar», el paso ya no bloquea. Queda acotado porque `ejecutar` vuelve a consultar Stripe y aborta con `error_stripe` antes de cualquier acción irreversible, con el mensaje ya existente «No se pudo resolver tu suscripción. Inténtalo de nuevo más tarde.»

### 6. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Dejarlo como está** | Bloquea la baja a cualquier suscriptor e incumple lo que prometen los textos legales: la única vía de cancelación que ofrecen es inalcanzable para quien tiene que usarla. |
| **Exigir que el usuario cancele antes por otra vía (portal de cliente de Stripe)** | El portal está desplegado pero apagado (`STRIPE_PORTAL_ENABLED`), y sería un paso adicional innecesario: `ejecutar` ya resuelve la cancelación. Contradice además el §7.3 de AEC-003B, que integró la cancelación precisamente para no exigirla como requisito externo. |
| **Mover la cancelación a «Verificar»** | Convertiría en irreversible un paso que AEC-003B define como mera preparación (§9.2), antes del consentimiento final. |
| **Revisión acotada de `preparar` (propuesta)** | Desbloquea la baja con un cambio contenido en un archivo de API, un aviso y una prueba. No toca `ejecutar` ni el motor de verificación, y conserva intactos el Principio de Integridad Externa y el fail-closed. |

### 7. Condiciones de la futura implementación

1. Contenida en los archivos declarados en el §4. El diff de `ejecutar/route.ts`, `verificar-condiciones-previas.ts` y `cancelar-suscripcion-stripe.ts` debe ser vacío, y se comprueba antes de fusionar.
2. **El aviso de consentimiento del §4.3 es obligatorio, no opcional.** Sin él, la implementación no se fusiona.
3. `credit_reservations` sigue bloqueando en `preparar`, con prueba que lo demuestre.
4. Pruebas obligatorias del §4.4. **Suite completa, `tsc`, lint y build en verde.**
5. **Validación con cuenta de prueba en modo test hasta completar «Confirmar», antes de fusionar.** Será la primera ejecución real de `cancelarSuscripcionStripe`, que hasta hoy solo se ha validado con simulaciones (§7.2 de AEC-003B). Se ejecuta en un entorno con clave `sk_test_`, porque producción usa la clave live y no reconoce clientes de test. Debe comprobarse:
   - que la suscripción de test queda `canceled` en Stripe;
   - que la extinción se completa;
   - que el panel mostró el aviso antes del botón.

   Como la base de datos es la de producción, se aplica el protocolo de cuenta dedicada: recuento y huella antes y después, y limpieza verificada.
6. Aceptación funcional de Dirección tras el despliegue.

### 8. Veredicto

**AUTORIZADA CON CONDICIONES.** Dirección revisa la regla vigente de `preparar` y autoriza que `stripe_suscripcion` y `stripe_cobros_pendientes` dejen de bloquear el paso «Verificar», en los términos del §4, sujeto a las condiciones del §7 y a las recogidas en el §9. `credit_reservations` sigue bloqueando en `preparar` y `ejecutar/route.ts` no cambia. Hasta que la implementación cumpla esas condiciones y se despliegue, `preparar` sigue bloqueando a cualquier cuenta con suscripción activa, como hasta ahora.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☒ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

Se autoriza el cambio en preparar/route.ts según los términos del §4, con el aviso de consentimiento del §4.3 como condición obligatoria e ineludible antes de fusionar, y con la validación completa en modo test del §7.5 (incluyendo "Confirmar") como último paso antes del despliegue.

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta que la revise expresamente, con el mismo procedimiento que esta Acta ha seguido para revisar la regla anterior de preparar. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** Héctor Renee Díaz Bausson — Founder & CEO, obrasdeteatro.com   **Fecha:** 2026-09-27
