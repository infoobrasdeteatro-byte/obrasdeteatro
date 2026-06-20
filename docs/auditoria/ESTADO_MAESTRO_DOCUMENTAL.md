# ESTADO MAESTRO DOCUMENTAL — ObrasDeTeatro®

**Versión:** 1.0
**Fecha de emisión:** 2026-06-19
**Alcance:** Auditoría completa del repositorio documental `/docs`
**Documentos analizados:** 4 (3 técnicos + 1 inventario)

---

## 1. Documentos oficiales vigentes

| # | Documento | Versión | Estado | Ubicación | Hash MD5 | Tamaño |
|---|---|---|---|---|---|---|
| D1 | ARQUITECTURA_BD_SUPABASE_v1.2.docx | 1.2 | CONGELADO | `docs/arquitectura/` | `4B9295870794B487A29E6D9329EC3AC5` | 39,4 KB |
| D2 | ROADMAP_DESARROLLO_v1.1.docx | 1.1 | CONGELADO | `docs/roadmap/` | `EA8BDDBFDE9B418C3A6059C32FB492AB` | 23,1 KB |
| D3 | FASE_0_PLAN_EJECUCION_v1.1.docx | 1.1 | OFICIAL VIGENTE | `docs/ejecucion/` | `740BE2AE0E763E58CF34E612F71FF001` | 35,2 KB |

### Contenido sintetizado

**D1 — ARQUITECTURA_BD_SUPABASE v1.2**
Esquema completo de base de datos para Supabase. Define 19 tablas, tipología de campos, relaciones FK, constraints y decisiones de diseño. Es el documento de referencia estructural para cualquier migración SQL. Incluye el historial de cambios v1.0 → v1.1 → v1.2.

**D2 — ROADMAP_DESARROLLO v1.1**
Hoja de ruta ejecutable con 9 fases (0–8) desde la preparación del entorno hasta el lanzamiento público. Define prioridades MVP, tablas implicadas por fase, rutas Next.js, lógica de negocio y checklists de cierre. Orden de fases vigente: 0-Preparación → 1-Auth → 2-Contenido → 3-Stripe → 4-Mensajería → 5-ScenaIA → 6-Admin → 7-Beta → 8-Lanzamiento.

**D3 — FASE_0_PLAN_EJECUCION v1.1**
Manual operativo paso a paso para ejecutar la Fase 0. Contiene los 4 scripts SQL de migración completos (001_tables, 002_triggers, 003_indexes_views, 004_rls), configuración de Auth, 7 buckets Storage, Stripe, Vercel y smoke test de 12 criterios de aceptación. La v1.1 incorpora 5 correcciones de auditoría sobre la v1.0.

---

## 2. Documentos históricos

| # | Documento | Versión | Estado | Ubicación | Sustituido por |
|---|---|---|---|---|---|
| H1 | FASE_0_PLAN_EJECUCION_v1.0.docx | 1.0 | HISTÓRICO | `docs/ejecucion/historico/` | D3 (v1.1) |
| H2 | ROADMAP_DESARROLLO_v1.0.docx | 1.0 | HISTÓRICO | `Downloads/` (no archivado) | D2 (v1.1) |
| H3 | ARQUITECTURA_BD_SUPABASE_v1.1.docx | 1.1 | HISTÓRICO | `Downloads/` (no archivado) | D1 (v1.2) |
| H4 | ARQUITECTURA_BD_SUPABASE_v1.0.docx | 1.0 | HISTÓRICO | `Downloads/` (no archivado) | D1 (v1.2) |

> H1 es el único histórico formalmente archivado en el repositorio. H2–H4 permanecen en `Downloads` sin incorporar a `/docs`.

---

## 3. Documentos pendientes de localizar

| # | Documento | Referenciado en | Versión esperada | Criticidad | Motivo |
|---|---|---|---|---|---|
| P1 | ARQUITECTURA_FUNCIONAL_OBRASDETEATRO | D2 (ROADMAP cabecera) | v1.0 | **CRÍTICA** | Citado como "Congelada" junto a D1. Define flujos funcionales de la plataforma. Sin él, falta la capa de comportamiento entre la BD (D1) y las pantallas (D2). |
| P2 | FASE_1_PLAN_EJECUCION | D2 (Fase 1 — Auth) | — | Alta | La Fase 1 es el siguiente paso del roadmap. No existe ningún plan de ejecución técnica para ella. |
| P3 | FASE_2_PLAN_EJECUCION | D2 (Fase 2 — Contenido) | — | Media | Requerido antes de iniciar la fase. |
| P4 | 8 documentos jurídicos especializados | D2 (Fase 7, checklist RGPD) | — | Media | Requisito de cierre de Fase 7 (Beta). Carpeta `docs/legal/` existe pero está vacía. |
| P5 | Política de datos / DPA | D2 (Fase 7, RGPD) | — | Media | Requerido para cumplimiento RGPD Art. 17 y Art. 20. |

---

## 4. Dependencias entre documentos

```
ARQUITECTURA_FUNCIONAL_OBRASDETEATRO (P1) ←── [no localizado]
        │
        ▼
ARQUITECTURA_BD_SUPABASE_v1.2 (D1) ──────────────────────────────┐
        │                                                          │
        ▼                                                          ▼
ROADMAP_DESARROLLO_v1.1 (D2) ──────────► FASE_0_PLAN_EJECUCION_v1.1 (D3)
        │                                    (implementa D1 como SQL)
        │
        ├──► Fase 1 → FASE_1_PLAN_EJECUCION (P2) [pendiente]
        ├──► Fase 2 → FASE_2_PLAN_EJECUCION (P3) [pendiente]
        ├──► Fase 3 → FASE_3_PLAN_EJECUCION [pendiente]
        ├──► ...
        └──► Fase 7 → docs/legal/* (P4, P5) [pendiente]
```

**Relaciones críticas detectadas:**

| Relación | Tipo | Estado |
|---|---|---|
| D3 implementa el SQL de D1 | Derivación directa | ✅ Consistente — D3 v1.1 corrige bugs sobre D1 v1.2 |
| D2 referencia D1 como "Congelada" | Cita explícita | ✅ Consistente |
| D2 referencia P1 como "Congelada" | Cita explícita | ⚠️ P1 no localizado — referencia huérfana |
| D2 se auto-referencia como v1.0 | Auto-cita | ⚠️ Inconsistencia menor — el archivo archivado es v1.1 |
| D2 exige P4+P5 en Fase 7 | Requisito de cierre | ⏳ Pendiente — Fase 7 no iniciada |

---

## 5. Riesgos documentales

| # | Riesgo | Severidad | Impacto | Acción recomendada |
|---|---|---|---|---|
| R1 | P1 (ARQUITECTURA_FUNCIONAL) no localizada | **Crítica** | Falta la especificación de flujos funcionales. Desarrolladores deben inferir comportamiento de D2 sin documento de referencia funcional. | Localizar o reconstruir como prioridad inmediata |
| R2 | Sin planes de ejecución para Fases 1–8 | **Alta** | Solo Fase 0 tiene plan operativo. Las siguientes fases carecen del equivalente a D3. El equipo podría ejecutar sin guía técnica detallada. | Crear FASE_1_PLAN_EJECUCION antes de iniciar Fase 1 |
| R3 | H2–H4 sin archivar en repositorio | Media | Si el equipo pierde acceso al equipo local, se pierde el historial de evolución de los documentos fundacionales. | Mover a `docs/ejecucion/historico/` o `docs/historico/` |
| R4 | Auto-referencia incorrecta en D2 | Baja | D2 se lista como v1.0 en su propia tabla de referencias. Puede confundir a un desarrollador que consulte el documento. | Aceptar como heredado o solicitar corrección del original |
| R5 | `docs/legal/` vacía | Media | El roadmap exige 8 documentos jurídicos para Fase 7. La carpeta existe pero sin contenido. Riesgo de llegar a Beta sin documentación legal. | Iniciar redacción/localización antes de Fase 6 |
| R6 | ESTADO_DOCUMENTAL_ACTUAL.md desactualizado | Baja | Fue generado antes de archivar D3. Refleja un estado anterior al actual. | Queda supersedido por este documento. Puede archivarse en `docs/historico/`. |

---

## 6. Recomendación de siguiente paso

### Contexto del proyecto
- **Fase 0** (preparación de infraestructura): documentada y ejecutable con D3.
- **Fase 1** (Auth y Perfiles): definida en D2, pero sin plan de ejecución técnica.
- El ciclo Auth está técnicamente completado según el historial del repositorio (commit `28813ab` y anteriores).

### Recomendación inmediata: crear FASE_1_PLAN_EJECUCION

La cadena documental para cada fase debe seguir el patrón establecido:

```
ROADMAP (qué y en qué orden)
    └── PLAN_EJECUCION_FASE_N (cómo, paso a paso, con código)
```

D3 establece el modelo. El siguiente documento a crear es `FASE_1_PLAN_EJECUCION_v1.0.docx`, que debe cubrir:
- Rutas Next.js de Auth: `/registro`, `/login`, `/recuperar-contrasena`, `/verificar-email`, `/perfil/[slug]`, `/perfil/editar`
- Integración con `profiles` y `profile_roles` (triggers ya definidos en D3)
- Middleware de protección de rutas `/dashboard/*`
- Upload de avatar al bucket `avatars`
- Smoke test de cierre de Fase 1 (9 criterios definidos en D2)

### Recomendación secundaria: localizar P1

Antes de avanzar a Fase 2 (Contenido), la `ARQUITECTURA_FUNCIONAL_OBRASDETEATRO v1.0` debería estar incorporada al repositorio. Define el comportamiento de la plataforma que D1 y D2 no cubren: flujos de usuario, estados de las entidades, reglas de negocio funcionales.

### Orden de prioridades documentales

```
1. [INMEDIATO]  Crear FASE_1_PLAN_EJECUCION_v1.0
2. [INMEDIATO]  Localizar ARQUITECTURA_FUNCIONAL_OBRASDETEATRO v1.0
3. [ANTES FASE 3] Crear FASE_2_PLAN_EJECUCION_v1.0
4. [ANTES FASE 7] Redactar/archivar 8 documentos legales en docs/legal/
5. [OPCIONAL]   Archivar H2–H4 en docs/historico/
```

---

## Resumen ejecutivo

```
Documentos oficiales vigentes          : 3
Documentos históricos archivados       : 1 (en repo) + 3 (en Downloads)
Documentos referenciados no localizados: 5 (1 crítico, 4 pendientes de fase)
Dependencias entre documentos          : 4 verificadas, 1 huérfana (P1)
Riesgos activos                        : 6 (1 crítico, 2 altos, 3 bajos/medios)
Cobertura documental del roadmap       : Fase 0 ✅ · Fases 1–8 ⚠️ sin plan operativo
```

---

*Este documento supersede a `ESTADO_DOCUMENTAL_ACTUAL.md` (generado 2026-06-19, pre-D3).*
*Regenerar tras cada nueva incorporación o cambio de estado documental.*
