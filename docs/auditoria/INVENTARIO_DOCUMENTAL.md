# INVENTARIO DOCUMENTAL — ObrasDeTeatro®

Fuente única de verdad sobre documentos oficiales archivados en `/docs`.

---

## Documentos oficiales vigentes

| # | Nombre | Versión | Estado | Fecha | Ubicación |
|---|---|---|---|---|---|
| 1 | ARQUITECTURA_BD_SUPABASE_v1.2.docx | 1.2 | CONGELADO | Junio 2026 | docs/arquitectura/ |
| 2 | ROADMAP_DESARROLLO_v1.1.docx | 1.1 | CONGELADO | Junio 2026 | docs/roadmap/ |
| 3 | FASE_0_PLAN_EJECUCION_v1.1.docx | 1.1 | OFICIAL VIGENTE | Junio 2026 | docs/ejecucion/ |
| 4 | ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v2.0.md | 2.0 | **CONGELADO** | 2026-06-19 | docs/arquitectura/ |

---

## Documentos históricos archivados

| # | Nombre | Versión | Estado | Ubicación | Sustituido por |
|---|---|---|---|---|---|
| H1 | FASE_0_PLAN_EJECUCION_v1.0.docx | 1.0 | HISTÓRICO | docs/ejecucion/historico/ | FASE_0_PLAN_EJECUCION_v1.1.docx |

---

## Historial de versiones

### ARQUITECTURA_BD_SUPABASE

| Versión | Estado | Notas |
|---|---|---|
| v1.2 | **OFICIAL VIGENTE** | Versión congelada de referencia |
| v1.1 | Histórico (Downloads) | Versión intermedia, no archivada en repo |
| v1.0 | Histórico (Downloads) | Versión inicial, no archivada en repo |

### ROADMAP_DESARROLLO

| Versión | Estado | Notas |
|---|---|---|
| v1.1 | **OFICIAL VIGENTE** | Sustituye a v1.0 como referencia de desarrollo |
| v1.0 | Histórico (Downloads) | Versión anterior. No usar como referencia activa. |

**Diferencias clave v1.0 → v1.1:**
- Stripe adelantado a Fase 3 (antes Fase 4); Mensajería pasa a Fase 4
- Eventos (publicar) promovido a MVP de Fase 2
- Corrección de bug: acceso admin usa `profile_roles.role` en lugar de `profiles.plan`
- Métrica Beta elevada de 3 a 10 suscripciones de pago

### FASE_0_PLAN_EJECUCION

| Versión | Estado | Ubicación | Notas |
|---|---|---|---|
| v1.1 | **OFICIAL VIGENTE** | docs/ejecucion/ | Contiene correcciones de auditoría aplicadas. Sustituye a v1.0. |
| v1.0 | HISTÓRICO | docs/ejecucion/historico/ | Conservado únicamente como referencia histórica. No usar para ejecutar. |

**Correcciones aplicadas en v1.1 (5 incidencias):**
1. `auto_slug` usaba tabla `works` hardcodeada — corregido con `TG_TABLE_NAME` dinámico
2. Campos `status` sin `CHECK` constraint en 5 tablas — corregido con valores explícitos
3. `handle_new_user` generaba colisiones de `username`/`slug` — corregido con sufijo incremental
4. `conversations` sin `CHECK participant_a <> participant_b` — corregido
5. Trigger de tickets no decrementaba `sold` en reembolsos — corregido

---

## Documentos pendientes de archivar

| Documento | Ubicación actual | Destino | Prioridad |
|---|---|---|---|
| Política de Privacidad.docx (+ variante) | Downloads | docs/legal/ | Alta |
| Política de Cookies.docx (+ variante) | Downloads | docs/legal/ | Alta |
| Aviso Legal ObrasDeTeatro.docx (+ variante) | Downloads | docs/legal/ | Alta |
| Términos y Condiciones de Uso.docx (+ variante) | Downloads | docs/legal/ | Alta |
| Política de Propiedad Intelectual.docx | Downloads | docs/legal/ | Alta |
| Normas de la Comunidad ObrasDeTeatro.docx | Downloads | docs/legal/ | Media |
| Política de Verificación de Perfiles.docx | Downloads | docs/legal/ | Media |
| Política de Uso de ScenaIA.docx | Downloads | docs/legal/ | Media |
| Condiciones de Suscripción ObrasDeTeatro.docx | Downloads | docs/legal/ | Media |
| Solicitud de Derechos de Representación.docx | Downloads | docs/legal/ | Media |
| Política de Venta de Entradas.docx | Downloads | docs/legal/ | Baja |
| Política de Reembolsos.docx | Downloads | docs/legal/ | Baja |
| ObrasDeTeatro_Planes_Tabla_Definitiva_2.docx | Downloads | docs/negocio/ | Alta |
| Formularios funcionales Nº1–16 (16 archivos) | Downloads | docs/formularios/ | Media |

---

---

## Historial de versiones — ARQUITECTURA_FUNCIONAL_OBRASDETEATRO

| Versión | Estado | Notas |
|---|---|---|
| v2.0 | **OFICIAL VIGENTE** | Reconstruida desde fuentes Nivel 0–4 el 2026-06-19. Supersede al Informe_Auditoria_Funcional. |
| v1.0 | Histórico (no localizado) | Citada como "Congelada" en ROADMAP_DESARROLLO_v1.1. No encontrada en el equipo. |

---

*Última actualización: 2026-06-19*
