# ACTA DE CIERRE DE INVESTIGACIÓN
## Modelo de Ejecución de Servicios de Plataforma Fuera de Sesión de Usuario

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** C — Asíncrono
**Fecha:** 2026-07-17
**Tipo:** Investigación de posible Decisión Transversal — **cerrada sin apertura de DT**

---

### 1. Origen

Detectado durante la implementación de Procesos Asíncronos (v1): el lado de lectura (`listPendingActivity`, `markActivityProcessed`) y la futura Mi Trayectoria® requerirían, en apariencia, un mecanismo de ejecución sin sesión de usuario — algo que ningún componente anterior de Bloque III había necesitado. Se propuso tratarlo como una posible nueva Decisión Transversal (candidata a numeración DT-004, pospuesta explícitamente).

### 2. Recorrido de la investigación

1. **Verificación documental inicial** (5 cuestiones): confirmó que ningún documento congelado especifica un mecanismo de ejecución fuera de sesión, identificó que el invariante en tensión (*"sin cliente privilegiado, RLS vía sesión de usuario"*) es una **convención de Nivel 2** introducida durante la implementación de Repository Layer — nunca un principio de Nivel 1 congelado en la Fase 4 — y localizó infraestructura real ya existente y no gobernada (`SUPABASE_SERVICE_ROLE_KEY`, usada por el webhook de Stripe fuera de Repository Layer).
2. **Separación de dos principios previamente mezclados**, verificada documentalmente: *"Repository Layer como única frontera de persistencia"* **sí es** un principio de Nivel 1 (misión literal de SC-005.1, independiente de cualquier mecanismo de autenticación) y permanece congelado, sin reabrirse. El webhook de Stripe se descartó como precedente válido: viola ambos principios simultáneamente (ni pasa por Repository Layer, ni usa sesión), no solo el segundo.
3. **Análisis comparativo de cuatro alternativas** (A: clave de servicio encapsulada en Repository Layer; B: usuario de sistema con sesión propia y RLS dedicada; C: tokens de sesión delegados; D: procesamiento diferido a la siguiente sesión real del propio usuario) — evaluadas en compatibilidad, impacto, seguridad, gobernanza, mantenibilidad y reutilización futura, sin seleccionar ninguna.
4. **Verificación decisiva:** ¿los consumidores actualmente congelados (Procesos Asíncronos, Mi Trayectoria®) exigen, por contrato, ejecución realmente independiente de sesión? Contrastados ambos contratos ya congelados — ninguno lo exige. "Procesamiento diferido" (Procesos Asíncronos) no especifica disparador; el dominio de Mi Trayectoria® es, por naturaleza, de un único profesional observando su propia evolución, satisfacible cuando él mismo vuelve a tener sesión.

### 3. Conclusión

**No existe, hoy, una decisión transversal que deba tomarse.** Los contratos funcionales ya congelados de Procesos Asíncronos y Mi Trayectoria® se satisfacen íntegramente mediante procesamiento diferido a la siguiente sesión real del propio profesional afectado (Alternativa D del análisis comparativo) — sin introducir ningún mecanismo nuevo de autenticación, sin tocar ningún invariante ya verificado, sin coste de gobernanza adicional.

**No se abre DT-004 ni ninguna otra numeración.** La investigación se cierra sin generar una nueva Decisión Transversal — un resultado tan válido como abrir una, dado el criterio ya aplicado en todo el Bloque III: solo se documenta como incidencia o decisión lo que la evidencia demuestra necesario, nunca por precaución.

### 4. Condición de reapertura, registrada para el futuro

Si en el futuro aparece un consumidor cuyos requisitos **ya congelados** exijan ejecución verdaderamente autónoma — el candidato más plausible, ya nombrado en esta investigación sin ser consumidor actual, es **Analítica** (interpretación agregada de actividad de todos los usuarios, no de uno concreto); también, en menor medida, Observabilidad/Telemetría o Subsistemas de Aprendizaje — **entonces corresponderá abrir una Decisión Transversal para definir el mecanismo oficial de autenticación de Repository Layer fuera de sesión**, retomando directamente el análisis comparativo de la Sección 2.3 (alternativas A, B, C) como punto de partida, sin necesidad de rehacerlo desde cero.

### 5. Estado resultante

- Procesos Asíncronos (lado de lectura, diferido de su v1) y Mi Trayectoria® quedan **desbloqueados** para continuar su propio Plan Técnico, diseñados sobre el modelo de procesamiento diferido a sesión.
- Ningún principio arquitectónico ya congelado se modifica. Ninguna reapertura.
- Vacío legítimamente diferido, no incidencia: mecanismo de autenticación de Repository Layer fuera de sesión — pendiente de un consumidor real que lo exija, condición de la Sección 4.
