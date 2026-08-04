# AEC-003 — Fase 5

## Especificación Arquitectónica Oficial — Extinción de Identidad Digital

**Expediente:** AEC-003 (Arquitectura del Ecosistema de Cuentas) — Fase 5
**Ámbito:** eliminación de cuenta de usuario.
**Estado:** Núcleo conceptual CERRADO. Especificación de referencia para la implementación futura de la Fase 5. No autoriza, por sí sola, ninguna implementación.
**Fundamento:** PA-001 y Decisiones Arquitectónicas Oficiales DA-001 a DA-006, todas aprobadas por Dirección Técnica.
**Precede a esta especificación:** AEC-003 Fases 1–4 (registro y confirmación de cuenta, contraseña, sesiones, correo electrónico — CERRADAS), Fase 5a (inventario y comparación de alternativas).

---

## 1. Principio fundacional — PA-001, Conservación del Patrimonio Compartido

ObrasDeTeatro reconoce el derecho de cualquier usuario a abandonar la plataforma y extinguir su identidad digital. Ese derecho no se extiende automáticamente a la información generada durante su participación en el ecosistema.

La arquitectura distingue siempre entre dos conceptos independientes:

- **Identidad personal** — información cuya titularidad corresponde exclusivamente al usuario (autenticación, correo electrónico, contraseña, datos personales, preferencias, perfil identificable). Su eliminación constituye un derecho.
- **Patrimonio digital compartido** — información cuya existencia afecta, documenta o forma parte de la actividad de otros usuarios o del ecosistema en su conjunto (conversaciones, mensajes, relaciones profesionales, historial de colaboración, organizaciones, compañías, obras, y cualquier otra entidad cuya desaparición afecte a terceros). Una vez compartido, deja de pertenecer en exclusiva a quien lo originó.

**Consecuencia arquitectónica:** la extinción de la identidad personal y la conservación del patrimonio digital compartido son dos procesos independientes, que podrán tener tratamientos técnicos distintos.

---

## 2. Modelo de planos — DA-002

La identidad digital de una cuenta no es una entidad homogénea. Se distinguen tres planos funcionales independientes:

| Plano | Qué es | Destino tras la extinción |
|---|---|---|
| **1 — Identidad de Autenticación** | La capacidad de autenticarse y acceder al ecosistema | Extinción permanente e irreversible. Incompatible con cualquier acceso futuro |
| **2 — Identidad Personal** | Toda información que permite identificar directamente a una persona (nombre, correo, teléfono, biografía, avatar, contacto y equivalentes) | El contenido identificable deja de estar disponible. No implica necesariamente la desaparición física del registro que lo contiene |
| **3 — Ancla de Continuidad del Ecosistema** | La referencia estructural que mantiene la integridad del patrimonio digital compartido. No representa una persona ni constituye una identidad | Permanece. Es el punto de continuidad que preserva conversaciones, mensajes, relaciones profesionales, organizaciones, compañías, obras, candidaturas y cualquier otro elemento protegido por PA-001 |

**Principio derivado:** una **Identidad Extinguida** constituye un estado arquitectónico permanente del ecosistema, no la desaparición física de una cuenta. Esta definición forma parte de la terminología oficial del proyecto.

**Axioma del Ancla** (derivado de DA-002 y DA-003): el patrimonio compartido no depende de que la identidad esté viva; depende únicamente de que el Ancla de Continuidad del Ecosistema exista.

---

## 3. Modelo de estados y transición temporal — DA-004

El ciclo de vida de una cuenta respecto a la extinción de identidad reconoce exactamente tres estados:

```
Cuenta Activa
     │
     │  (solicitud de extinción)
     ▼
Cuenta Activa con Extinción Programada
 (sinónimo documental: "Proceso de Extinción Programado")
     │
     │  Evento Arquitectónico Atómico — irreversible
     ▼
Identidad Extinguida
```

- **Cuenta Activa:** los tres planos coinciden en una identidad viva y operativa.
- **Cuenta Activa con Extinción Programada:** estado reversible. Los tres planos permanecen exactamente como en Cuenta Activa — ninguno se ha alterado todavía. Existe únicamente una intención registrada. La cancelación desde este estado no deja ninguna diferencia estructural respecto a no haber solicitado nunca la extinción.
- **Identidad Extinguida:** estado terminal. Se alcanza mediante una única transición no reversible.

El Ancla de Continuidad del Ecosistema (Plano 3) existe desde la creación de la cuenta y permanece sin alteración a lo largo de los tres estados — su continuidad no comienza en la extinción, es constante durante todo el ciclo de vida.

**Principio de Irreversibilidad:** la transición hacia el estado de Identidad Extinguida constituye un evento arquitectónico atómico e irreversible.

---

## 4. Comportamiento del patrimonio compartido — DA-003

Ningún elemento de patrimonio compartido se degrada, oculta o pierde integridad por la extinción de una identidad, salvo en aquello que dependiera directamente del contenido de los Planos 1 o 2.

| Categoría | Comportamiento tras la extinción |
|---|---|
| Conversaciones y mensajes | El hilo y el contenido ya enviado permanecen íntegros y legibles para la otra parte. Ningún mensaje nuevo puede originarse (Plano 1 extinguido). La atribución sigue apuntando al Ancla, que ya no resuelve hacia una identidad personal reconocible |
| Relaciones profesionales | El hecho estructural de la relación permanece (p. ej., recuentos de seguidores no se alteran retroactivamente). La identidad extinguida deja de ser navegable, visitable o capaz de originar relaciones nuevas |
| Organizaciones, compañías, obras, festivales | Caso distinto de los anteriores: estas entidades tienen identidad propia, no personal. Sobreviven **íntegras y plenamente funcionales**, sin degradación — solo deja de resolver la referencia a la persona responsable |
| Referencias históricas (candidaturas, solicitudes de derechos, moderación) | Función exclusivamente documental. Permanecen como prueba de que la actividad ocurrió, sin necesidad de que la identidad sea alcanzable |

**Regla general de visibilidad:** deja de ser visible cualquier superficie que presente a la identidad extinguida como una persona alcanzable (ficha navegable, posibilidad de iniciar relación nueva). Permanece como patrimonio colectivo todo el contenido ya generado y compartido cuyo sentido no depende de que la identidad siga siendo reconocible.

**Principio de No Regresión del Patrimonio:** la extinción de una identidad nunca podrá reducir el valor informativo del patrimonio digital compartido existente antes de dicha extinción.

---

## 5. Condiciones previas a la ejecución — DA-005

El evento irreversible no puede dispararse mientras existan condiciones pendientes, clasificadas en tres categorías:

### Condiciones Técnicas

- **Principio de Integridad Externa:** ningún proceso de Extinción de Identidad podrá ejecutarse mientras existan obligaciones contractuales activas con sistemas externos dependientes de dicha identidad (motivado por Stripe; aplicable como regla general a cualquier integración externa futura). Ninguna suscripción ni cobro debe quedar abierto en Stripe en el momento del evento.
- **`credit_reservations` liquidadas:** no constituye un bloqueo técnico bajo este modelo (el evento no ejecuta `DELETE` sobre `profiles`, por lo que la restricción `ON DELETE RESTRICT` no llega a evaluarse). Queda como condición **candidata** por motivos de coherencia contable, cuya decisión final corresponde al Credit Manager — sin alterar su comportamiento.

### Condiciones de Seguridad

- **Reautenticación inmediata:** condición arquitectónica obligatoria. Ningún camino hacia el evento irreversible puede prescindir de una reafirmación de identidad tomada en el mismo momento, no heredada de una sesión abierta previamente. El mecanismo concreto queda pendiente de una decisión posterior.

### Condiciones Jurídicas

- **Principio de Consentimiento Informado:** ningún evento irreversible podrá ejecutarse sin que el usuario haya recibido previamente una explicación suficiente de sus consecuencias permanentes. Deriva directamente del Principio de No Regresión del Patrimonio y de PA-001.

---

## 6. Modelo de ejecución del evento — DA-006

El evento de extinción es un **Evento Arquitectónico Atómico**: nunca es observable, ni de forma transitoria, un estado en el que un plano esté extinguido y el otro no.

Internamente, el evento se compone de suboperaciones — **no estados del ciclo de vida, no observables desde el exterior**, cuyo orden existe únicamente para garantizar la consistencia de la ejecución:

1. **Verificación de condiciones previas**, repetida en el instante del disparo (no basta con que se cumplieran al programar la extinción).
2. **Punto de no retorno declarado** — inicio formal del evento irreversible.
3. **Extinción del Plano 2** (identidad personal) — se ejecuta primero, mientras el Plano 1 aún permite anclar cualquier constancia del propio evento a una autenticación todavía válida.
4. **Extinción del Plano 1** (autenticación) — se ejecuta en último lugar; es el verdadero punto sin retorno operativo del modelo.
5. **Confirmación del Ancla intacta** — verificación de que el Plano 3 no ha sido alterado, y transición formal a Identidad Extinguida.

**Principio de Consistencia Observacional:** desde el punto de vista de cualquier actor del ecosistema, el evento de Extinción de Identidad se percibirá siempre como una transición única y consistente, independientemente de las suboperaciones internas necesarias para materializarla.

---

## 7. Glosario de terminología oficial

| Término | Definición |
|---|---|
| Identidad personal | Información cuya titularidad corresponde exclusivamente al usuario (PA-001) |
| Patrimonio digital compartido | Información cuya existencia afecta a terceros o al ecosistema (PA-001) |
| Plano 1 — Identidad de Autenticación | Capacidad de acceso; su extinción es permanente e irreversible (DA-002) |
| Plano 2 — Identidad Personal | Contenido identificable de la persona (DA-002) |
| Ancla de Continuidad del Ecosistema (Plano 3) | Referencia estructural que sostiene el patrimonio compartido; no es una identidad (DA-002/DA-003) |
| Identidad Extinguida | Estado arquitectónico permanente; no equivale a la desaparición física de la cuenta (DA-002) |
| Cuenta Activa con Extinción Programada / Proceso de Extinción Programado | Estado reversible posterior a la solicitud, previo al evento irreversible (DA-004) — expresiones sinónimas |
| Principio de Irreversibilidad | La transición a Identidad Extinguida es atómica e irreversible (DA-004) |
| Principio de No Regresión del Patrimonio | La extinción nunca reduce el valor informativo del patrimonio previo (DA-003) |
| Principio de Integridad Externa | Sin obligaciones activas con sistemas externos antes de extinguir (DA-005) |
| Principio de Consentimiento Informado | Explicación suficiente de consecuencias permanentes, previa al evento (DA-005) |
| Evento Arquitectónico Atómico | El evento irreversible de extinción, compuesto de suboperaciones no observables (DA-006) |
| Principio de Consistencia Observacional | El evento se percibe siempre como una transición única, pese a sus suboperaciones internas (DA-006) |

---

## 8. Alcance — lo que esta especificación no determina

Deliberadamente fuera de este núcleo conceptual, pendiente de decisiones arquitectónicas posteriores centradas en materialización:

- Mecanismo técnico de cada suboperación (columnas, funciones, SQL, triggers, migraciones).
- Qué dispara la transición final dentro del periodo reversible (vencimiento de plazo u otro mecanismo).
- Duración del estado *Cuenta Activa con Extinción Programada*.
- Mecanismo concreto de reautenticación.
- Presentación al usuario (UX) del recorrido, advertencias y consentimiento informado.
- Resolución técnica de la integración con Stripe.
- Decisión final del Credit Manager sobre `credit_reservations` como condición previa.

---

## 9. Restricciones vigentes

Esta especificación, y toda decisión que la compone, respeta íntegramente:

- El Núcleo Conversacional (SC-001 a SC-004), sin modificación alguna.
- SEC-001 y AEC-001, sin alteración de su comportamiento certificado.
- AEC-003 Fases 1 a 4, cerradas y sin modificación.
- El modelo de datos, las relaciones, claves foráneas, políticas RLS y triggers existentes — ninguno redefinido.

No autoriza, por sí sola, ninguna implementación, migración o commit.

---

## 10. Estado del expediente

Con esta especificación queda **cerrado el núcleo conceptual de la Fase 5** de AEC-003 (PA-001 y DA-001 a DA-006). Las decisiones arquitectónicas posteriores deberán centrarse en la materialización del modelo aquí descrito — implementación, auditoría, validación y despliegue — no en redefinir sus fundamentos.
