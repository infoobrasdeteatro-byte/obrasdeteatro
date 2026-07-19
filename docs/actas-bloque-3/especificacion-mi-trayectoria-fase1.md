# ESPECIFICACIÓN ARQUITECTÓNICA CONGELADA
## Mi Trayectoria® — Dominio Funcional (Nivel 3)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** C — Asíncrono, segundo componente
**Estado:** Fase 1 (dominio funcional) — **CONGELADA**
**Fecha:** 2026-07-17

---

### 1. Clasificación arquitectónica

**Mi Trayectoria® es un Dominio Funcional (Nivel 3)**, conforme a SC-005 y DT-003 — no un Servicio de Plataforma. Esta clasificación se verificó y confirmó expresamente al inicio de este proceso, tras detectarse una formulación imprecisa que la contradecía; no se ha reabierto ni SC-005 ni DT-003.

### 2. Misión

> Mi Trayectoria® representa, organiza y devuelve al profesional una interpretación estructurada de su evolución profesional dentro del ecosistema ObrasDeTeatro®.

Fundamento: principio 7 de SC-001 (*"toda evolución deberá respetar la trayectoria profesional del usuario"*) — el único de los 7 principios rectores de ScenaIA que nombra explícitamente la trayectoria profesional. Mi Trayectoria® es el Dominio Funcional que lo operacionaliza de cara al propio profesional.

### 3. Responsabilidades

1. Observar, de forma exclusivamente pasiva, la actividad relevante que el profesional ya genera en el ecosistema (DT-003).
2. Organizar esa actividad en una interpretación estructurada, temporal y evolutiva — no una lista sin orden ni criterio.
3. Presentar esa interpretación de vuelta al profesional de forma que le aporte valor (SC-005: *"aportar valor al usuario final"*).
4. Actuar como memoria profesional de **largo plazo** del ecosistema para ese usuario.
5. **Organizar la información de forma que constituya una base representacional suficiente para futuras capacidades del ecosistema** (recomendaciones, proyecciones de carrera, análisis evolutivo) — sin implementar esas capacidades por sí misma. Operacionaliza el verbo "proyectar" de la definición fundacional, distinto de "preservar" y "comprender".

### 4. No responsabilidades

- No decide nada por el Núcleo — dominio exclusivo de Decision Engine.
- No construye ninguna respuesta de ScenaIA — dominio exclusivo de Response Composer (SC-004.6).
- No coordina el flujo del pipeline — dominio exclusivo del SPO.
- No es invocada directamente por ningún componente del Núcleo, en ningún caso (DT-003).
- No participa en autorización ni gestión de créditos — dominio de Credit Manager/Accounting Engine.
- No es un Servicio de Plataforma reutilizable por otros Dominios Funcionales — consume Servicios de Plataforma, no los provee.
- No asume funciones de proyección activa, recomendación o decisión — ver invariante correspondiente.

### 5. Entradas

Exclusivamente a través de **Procesos Asíncronos**, el Servicio de Plataforma ya designado por DT-003 para esta relación — nunca invocación directa desde ningún componente del Núcleo. La entrada conceptual es actividad ya producida por el Núcleo como parte de su trabajo normal, nunca un dato construido especialmente para Mi Trayectoria®.

### 6. Salidas

Una interpretación estructurada y organizada de la evolución profesional del usuario, presentada de vuelta a él — no el dato bruto de actividad, sino una representación con sentido para quien la consulta. Sin forma técnica ni de presentación definida en esta fase.

### 7. Qué constituye trayectoria profesional, y qué no

**Existe un único concepto de dominio: Trayectoria Profesional** (verificado documentalmente: CAT-001 define el dominio de conocimiento "Trayectoria" citando expresamente el mismo principio 7 de SC-001 que fundamenta la misión de este componente; CAT-001 se autodeclara además autoridad exclusiva de nomenclatura de dominio). Ese concepto único tiene **dos consumidores distintos, sin dependencia nueva entre ellos**:
- El **SKM**, como parte del conocimiento general del ecosistema (consumo de terceros, vía Knowledge Assets, condicionado a IA-003).
- **Mi Trayectoria®**, para construir la vista personalizada en primera persona (consumo propio, vía Procesos Asíncronos).

**Dentro de la trayectoria:** actividad significativa y verificable del profesional en el ecosistema a lo largo del tiempo — hitos, cambios de estado, interacciones que reflejan una evolución profesional real.

**Fuera de la trayectoria:**
- Identidad/autenticación (dominio exclusivo de `Identity`, PCE).
- Estado de suscripción/facturación (dominio de Credit Manager/Accounting Engine).
- Contenido de conversaciones o interacciones puntuales sin significado evolutivo (mismo principio que el SKM aplica sobre sí mismo).
- **Información autodeclarada por el profesional, verificado que es epistemológicamente distinta** — el campo `trayectoria` ya existente en los perfiles especializados (junto a `biografia`, `formacion`, `premios`) es una biografía declarativa, autoeditada por el usuario a través de un formulario propio, que nunca pasa por el Núcleo ni es "observada" en el sentido de DT-003. Permanece arquitectónicamente separado del dominio Trayectoria Profesional — su eventual convivencia en la interfaz de usuario, si se decide en el futuro, es una decisión de presentación/producto, no de dominio.

### 8. Invariantes funcionales

1. **Observación pasiva, nunca invocación activa desde el Núcleo** (DT-003) — el invariante más fuerte, no debe ceder nunca.
2. **Cero modificación de cualquier contrato del Núcleo ya congelado** (DT-003: *"cero contratos del Bloque I modificados"*).
3. Es memoria de **largo plazo**, nunca memoria de sesión o conversación.
4. Comparte el concepto de dominio Trayectoria Profesional con el SKM (sección 7), sin que ello cree ninguna dependencia directa entre ambos componentes — cada uno accede por su propia vía ya congelada.
5. **Nunca asume las funciones de proyección activa, recomendación o decisión que pertenecen a Decision Engine o a cualquier futura capacidad de ScenaIA** — su "proyección" se limita a la estructura representacional (responsabilidad 5), nunca a producir el resultado proyectado.
6. **Representa conocimiento derivado de hechos observables por el ecosistema o de conceptos de dominio previamente definidos (Trayectoria Profesional, CAT-001). La información autodeclarada por el profesional nunca constituye, por sí misma, evidencia de trayectoria profesional — ni siquiera si el acto de redactarla o editarla fuera, en sí mismo, observado como actividad por el ecosistema.** La observación del acto de declarar no convierte el contenido declarado en evidencia verificable. No impide que información autodeclarada conviva como contexto complementario junto a evidencia verificada en futuras experiencias de usuario — impide que sea, ella sola, la base de la trayectoria.

### 9. Historial de resolución de esta especificación

- Clasificación arquitectónica verificada y corregida (Dominio Funcional, no Servicio de Plataforma) antes de iniciar el diseño.
- Misión refinada: de "evolución de su actividad" a "interpretación estructurada de su evolución profesional".
- Verbo "proyectar" de la definición fundacional, subdesarrollado en el primer borrador, incorporado explícitamente como responsabilidad (5) e invariante (5).
- Relación con CAT-001 verificada documentalmente: un único concepto de dominio, dos consumidores — no dos conceptos homónimos.
- Relación con el campo `trayectoria` existente verificada contra el código real: biografía declarativa, arquitectónicamente separada.
- Invariante final incorporado a petición de la Dirección: frontera entre evidencia observada y contenido autodeclarado elevada de explicación puntual a regla permanente, cerrando explícitamente el hueco de un futuro "evento de edición observado" que pudiera smuggle-in contenido autodeclarado por la vía legítima del canal.

### 10. Estado y siguiente paso

**Fase 1 (especificación arquitectónica del dominio) — CONGELADA**, con la misma metodología y nivel de rigor aplicado a los componentes del Núcleo durante la Fase B.

**No autorizado todavía:** Plan Técnico, persistencia, APIs, eventos, mecanismos de ejecución. Estos, además, dependen de una decisión pendiente y compartida con Procesos Asíncronos: el modelo de ejecución de Servicios de Plataforma en segundo plano (ver `docs/actas-bloque-3/acta-cierre-procesos-asincronos-v1.md`, sección 7).
