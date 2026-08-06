# ACTA DE APERTURA DE INVESTIGACIÓN
## Mecanismo de Acceso Multiusuario para Analítica

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación, verificación previa al Plan Técnico de Analítica
**Fecha:** 2026-07-18
**Tipo:** Investigación de encaje — **re-contraste de alternativas ya analizadas, sin elegir mecanismo**

---

### 1. Objeto de la investigación

Se abre esta investigación **porque existe evidencia suficiente que la justifica**, no porque su resultado esté decidido de antemano. La evidencia (Hallazgo 1 de la verificación documental de Analítica, 2026-07-18): su misión congelada — *"interpretación de negocio sobre la actividad técnica ya registrada"* — apunta, por el propio significado de "negocio" y por no solaparse con el espacio ya cubierto por Mi Trayectoria®/Observabilidad, a una perspectiva de plataforma, no de un solo profesional; conclusión reforzada por el hecho de que la propia investigación de Fase C ya había nombrado a Analítica, de forma independiente, como *"interpretación agregada de actividad de todos los usuarios, no de uno concreto."*

**Alcance estrictamente delimitado:** esta investigación **re-contrasta** las cuatro alternativas ya analizadas en `investigacion-ejecucion-en-segundo-plano.md` (Fase C, 2026-07-17) contra el estado actual de la arquitectura — verifica si siguen siendo el conjunto completo de opciones válidas. **No elige ningún mecanismo.** La selección, si procede, es una decisión posterior y distinta, de la Dirección.

### 2. Qué ha cambiado desde la investigación de Fase C (2026-07-17), verificado contra el estado real

1. **Telemetría y Observabilidad ya existen**, ambas construidas estrictamente sobre el modelo de sesión (`auth.uid() = profile_id`), sin ninguna excepción — refuerzan, no debilitan, que ese modelo sigue siendo el default de todo el proyecto salvo que se demuestre lo contrario.
2. **El Hallazgo 2 de la verificación de Analítica (2026-07-18) queda clasificado como ampliación normal de Repository Layer** — la futura persistencia de datos derivados de `ExecutionAudit` no introduce ninguna alternativa nueva de acceso; simplemente confirma que, sea cual sea el mecanismo elegido aquí, deberá poder escribir/leer a través de Repository Layer, como todo lo demás.
3. **Ningún nuevo precedente de infraestructura privilegiada se ha introducido en el proyecto** desde Fase C — el webhook de Stripe (`SUPABASE_SERVICE_ROLE_KEY`, `app/api/webhooks/stripe/route.ts`) sigue siendo el único caso real en el repositorio, y sigue descalificado como precedente válido por el mismo motivo ya establecido (viola simultáneamente la frontera única de persistencia y el modelo de sesión) — registrado como **P-014** en el Registro de Pendientes.
4. **Verificado ahora, no en Fase C:** el enum `tipo_perfil` (`supabase/migrations/20260708000000_baseline_schema.sql`) tiene 11 valores, todos roles humanos reales del ecosistema (`actor`, `director`, `dramaturgo`, `compania`, `productora`, `teatro`, `festival`, `escuela`, `institucion`, `profesional`, `publico`) — **ninguno representa una cuenta de sistema o servicio.** Dato relevante para valorar el coste real de la Alternativa B (ver Sección 3).

Ningún cambio invalida el marco de cuatro alternativas ya construido en Fase C; se incorpora como contexto adicional a cada una.

### 3. Re-contraste de las cuatro alternativas contra el estado actual

| Alternativa | Estado en Fase C | Reevaluación 2026-07-18 |
|---|---|---|
| **A — Clave de servicio encapsulada en Repository Layer** | Mayor riesgo de seguridad | Sin cambios en el análisis de riesgo. Nuevo dato: ya existe un precedente real de esta clase de clave en el repositorio (Stripe), pero **fuera** de Repository Layer y explícitamente descalificado como modelo a seguir (P-014) — no reduce el riesgo de introducirla *dentro* de Repository Layer, lo aumentaría si se hiciera sin gobernanza equivalente a la ya exigida en todo el Bloque III. |
| **B — Usuario de sistema con sesión propia y RLS dedicada** | "Mejor equilibrio" | Sigue siendo la de mejor equilibrio, con un coste adicional ahora verificado: `tipo_perfil` no contempla ningún rol de sistema/servicio — exigiría una decisión adicional (ampliar el enum, o reutilizar un valor existente como `publico`/`institucion` de forma no semánticamente limpia) antes de poder crear ese usuario. No descalifica la alternativa; añade un paso concreto a su coste ya conocido. |
| **C — Tokens de sesión delegados** | Mayor coste | Sin cambios — sigue siendo la de mayor coste de implementación y mantenimiento, sin nueva evidencia que lo revierta. |
| **D — Procesamiento diferido a la siguiente sesión real del propio usuario** | Elegida entonces para Procesos Asíncronos/Mi Trayectoria® | **Confirmado que no aplica a Analítica**, no por preferencia sino por estructura: D depende de que exista *una* sesión real de *un* profesional cuyos propios datos basten — Analítica necesita agregación entre profesionales, y ninguna sesión de un único usuario, por diferida que esté, puede leer legítimamente las filas de otro bajo el RLS ya congelado. Queda excluida del conjunto de opciones válidas para este consumidor específico — no se retira del catálogo general, sigue siendo válida para futuros consumidores de un solo profesional. |

### 4. Conclusión de esta investigación

**El conjunto de alternativas válidas para Analítica sigue siendo A, B y C** — ninguna alternativa nueva ha aparecido, y D queda formalmente excluida para este consumidor por razón estructural, no de preferencia. **No se elige ninguna de las tres.** La evidencia reunida (Sección 3) queda disponible para cuando la Dirección decida abrir la decisión de selección — previsiblemente mediante una Decisión Transversal formal (candidata a numeración **DT-004**, todavía sin asignar), dado que, a diferencia de la Alternativa D, ninguna de las tres opciones restantes se resuelve sin tocar infraestructura de autenticación compartida por todo el ecosistema.

### 5. Estado resultante

- Esta investigación **no bloquea** el resto del Plan Técnico de Analítica que no dependa del mecanismo de lectura multiusuario (misión, responsabilidades, no-responsabilidades, forma de los datos que consumirá) — sí bloquea cerrar el contrato de lectura agregada hasta que se decida el mecanismo.
- Ningún principio arquitectónico ya congelado se modifica. Ninguna reapertura de Actas ya cerradas.
- **DT-004 sigue sin abrirse formalmente** — esta Acta dispone la evidencia y el conjunto de opciones, no ejecuta la decisión.

### 6. Próximo paso

Queda a decisión de la Dirección: (a) abrir formalmente DT-004 y elegir entre A/B/C con el mismo procedimiento de análisis comparativo ya usado para DT-001/002/003 (ver `project_scenaia_modelo_arquitectura.md`), o (b) continuar el resto del Plan Técnico de Analítica dejando el mecanismo de lectura como vacío explícitamente diferido, cerrando el componente sin su capacidad de agregación hasta que DT-004 se resuelva — mismo tratamiento ya aceptado repetidamente en Bloque III para vacíos reales no bloqueantes.
