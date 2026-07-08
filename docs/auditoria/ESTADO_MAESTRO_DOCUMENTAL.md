# ESTADO MAESTRO DOCUMENTAL — ObrasDeTeatro®

**Versión:** 2.0
**Fecha de emisión:** 2026-07-08
**Auditoría realizada por:** Claude Sonnet 4.6 — Auditoría Maestra 2026-07-08
**Alcance:** Inventario completo del repositorio documental — /docs, /ARCHIVO_MAESTRO_BIBLIOTECA, raíz, Downloads

> **Supersede a:** v1.0 (2026-06-19) — desactualizada desde sprints OA-1.4 → LI-002A

---

## 1. Documentos oficiales vigentes — /docs

| # | Documento | Versión | Estado | Ubicación | Hash/Fecha | Revisión necesaria |
|---|-----------|---------|--------|-----------|------------|--------------------|
| D1 | ARQUITECTURA_BD_SUPABASE_v1.2.docx | 1.2 | **CONGELADO** | `docs/arquitectura/` | MD5: 4B9295870794B487A29E6D9329EC3AC5 | No |
| D2 | ROADMAP_DESARROLLO_v1.1.docx | 1.1 | **CONGELADO** | `docs/roadmap/` | MD5: EA8BDDBFDE9B418C3A6059C32FB492AB | No |
| D3 | FASE_0_PLAN_EJECUCION_v1.1.docx | 1.1 | OFICIAL VIGENTE | `docs/ejecucion/` | MD5: 740BE2AE0E763E58CF34E612F71FF001 | No |
| D4 | ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v2.0.md | 2.0 | **CONGELADO** | `docs/arquitectura/` | 2026-06-19 | No |
| D5 | INVENTARIO_DOCUMENTAL.md | 1.0 | VIGENTE — desactualizado | `docs/auditoria/` | 2026-06-19 | Sí — incorporar nuevos docs |
| D6 | Este documento | 2.0 | OFICIAL VIGENTE | `docs/auditoria/` | 2026-07-08 | — |

---

## 2. Archivo Maestro de la Biblioteca — /ARCHIVO_MAESTRO_BIBLIOTECA

| # | Documento | Estado | Fecha | Completo |
|---|-----------|--------|-------|----------|
| B1 | LIBRO_DE_INCORPORACIONES.md | OFICIAL ACTIVO | 2026-06-29 | Sí — Incorporaciones 001, 002, Fase LI-002A |
| B2 | Informe_Lote_001_Calderon.md | CERRADO | 2026-06-28 | Sí |
| B3 | Informe_Lote_002_Lope.md | CERRADO | 2026-06-29 | Sí |
| B4 | Lote_001_Calderon.csv | ARCHIVO | 2026-06-28 | Sí — 5 obras, IDs Supabase |
| B5 | Lote_002_Lope.csv | ARCHIVO | 2026-06-29 | Sí — 5 obras, IDs Supabase |
| B6 | Pedro_Calderon_de_la_Barca.xlsx | ARCHIVO | 2026-06-28 | Sí |
| B7 | Coleccion_Fundacional.xlsx | DATASET ACTIVO | 2026-06-28 | Sí |
| B8–B11 | Plantillas (Autores, Importacion, Instituciones, Obras) | PLANTILLAS ACTIVAS | 2026-06-28 | Sí |
| B12 | README.md (Archivo Maestro) | VIGENTE | 2026-06-28 | Sí |

---

## 3. Documentos en raíz del proyecto

| # | Documento | Estado | Observaciones |
|---|-----------|--------|---------------|
| R1 | ESTADO_OFICIAL_DEL_PROYECTO.md | DESACTUALIZADO | 2026-06-29. Refleja OA-1.3 (5 obras). Estado real: LI-002A (10 obras). Sin trackear en git. |
| R2 | CLAUDE.md | VIGENTE | Referencia a AGENTS.md. No modificar. |
| R3 | AGENTS.md | VIGENTE | Reglas para agentes IA. No modificar. |
| R4 | README.md | GENÉRICO | Next.js boilerplate. Sin contenido del proyecto. |

---

## 4. Documentos históricos archivados

| # | Documento | Ubicación | Sustituido por |
|---|-----------|-----------|----------------|
| H1 | FASE_0_PLAN_EJECUCION_v1.0.docx | `docs/ejecucion/historico/` | D3 (v1.1) |
| H2 | ESTADO_DOCUMENTAL_ACTUAL.md | **ELIMINADO** 2026-07-08 | Este documento (v2.0) |
| H3 | DISENO_PAGINA_EDITORIAL_OA14.md | `docs/historico/sprints/` | Sprint OA-1.4 implementado y cerrado |
| H4 | INFORME_POST_BUILD.md | Eliminado 2026-07-08 | Sprint UI Visual (histórico) |
| H5 | INFORME_PRE_COMMIT_AVATAR_v1.0.md | Eliminado 2026-07-08 | Sprint P2.0-A (histórico) |
| H6 | INFORME_PRE_COMMIT_FASES_4_5.md | Eliminado 2026-07-08 | Sprint UI Visual Fases 4–5 (histórico) |
| H7 | INFORME_PRE_COMMIT_REFINAMIENTOS.md | Eliminado 2026-07-08 | Sprint Refinamientos (histórico) |
| H8 | auth-recovery-postmortem.md | `docs/` | Post-mortem sprint recovery — conservado como referencia |
| H9–H11 | ARQUITECTURA_BD v1.0, v1.1 · ROADMAP v1.0 | Downloads (no archivados) | D1 (v1.2), D2 (v1.1) |

---

## 5. Documentos pendientes de localizar / crear

| # | Documento | Estado | Bloquea | Prioridad |
|---|-----------|--------|---------|-----------|
| **P1** | **POLÍTICA EDITORIAL Y JURÍDICA DE LA BIBLIOTECA DIGITAL OBRASDETEATRO®** | **PENDIENTE INMEDIATO** | LI-003 | **CRÍTICA** |
| P2 | FASE_1_PLAN_EJECUCION_v1.0 | Sin crear (Fase 1 ejecutada sin documento) | — | Alta |
| P3 | FASE_2_PLAN_EJECUCION | Sin crear | Castings/Conv./Eventos | Alta |
| P4 | Arquitectura técnica de ScenaIA (prompts, modelo, latencia) | Sin crear | Fase 5 | Alta |
| P5 | Especificación de buscador/directorio (algoritmo, ponderación) | Sin crear | Fase 2 | Media |
| P6 | 8 documentos legales en /docs/legal/ | En Downloads — sin archivar | Fase 7 / Beta | Media |
| P7 | ObrasDeTeatro_Planes_Tabla_Definitiva_2.docx | En Downloads — sin archivar | Referencia activa | Alta |
| P8 | 16 formularios funcionales Nº1–16 | En Downloads — sin archivar | Referencia activa | Media |
| P9 | Lope_de_Vega.xlsx (ficha de autor) | Sin crear | Consistencia Archivo Maestro | Media |
| P10 | Sistema Editorial 2026.html | En Downloads — sin archivar | **Directiva permanente de diseño** | **Alta** |

---

## 6. Estado del sistema Supabase (verificado 2026-07-08)

| Elemento | Cantidad | Observaciones |
|----------|----------|---------------|
| Tablas (`public`) | 28 | RLS habilitado en todas |
| Filas en `works` | 10 | Colección Fundacional completa |
| Filas en `work_files` | 11 | 10 LI-002A + 1 piloto previo |
| Filas en `profiles` | 16 | Usuarios reales |
| Filas en `profile_roles` | **0** | ⚠️ ANOMALÍA — 16 perfiles sin rol asignado |
| Filas en `institutions` | 1 | Biblioteca Oficial ObrasDeTeatro® |
| Filas en `subscriptions` | 1 | 1 suscripción de pago activa |
| Tablas sin datos | 21 de 28 | Schema definido, sin uso aún |
| Vistas públicas | **0** | `public_profiles` y `published_works` referenciadas en D4 no existen en BD |
| Storage Buckets | 7 | Configurados. Solo `avatars` con uso activo. |
| Triggers | 18 | Activos y verificados |
| Funciones | 5 | Activas |
| Políticas RLS | 52 | Sin gaps de seguridad detectados |

---

## 7. Estado Git (2026-07-08)

| Rama | Commit | Descripción |
|------|--------|-------------|
| `main` | `372f8db` | UX-001 shimmer — producción actual |
| `develop` | `5c8aba4` | Limpieza post-auditoría 2026-07-08 |

**Commits en develop no mergeados a main:** 19 commits desde `372f8db`.

**Pendiente crítico:** Auditoría visual aprobada → merge develop → main.

---

## 8. Riesgos documentales activos

| # | Riesgo | Severidad | Acción |
|---|--------|-----------|--------|
| R1 | Política Editorial y Jurídica no existe — bloquea LI-003 | **CRÍTICA** | Redactar en próxima sesión autorizada |
| R2 | `profile_roles` con 0 filas — 16 usuarios sin rol | **Alta** | Investigar antes de implementar módulos de permisos |
| R3 | `ESTADO_OFICIAL_DEL_PROYECTO.md` desactualizado (raíz) | Alta | Actualizar o eliminar |
| R4 | Vistas `public_profiles` / `published_works` referenciadas en D4 pero no creadas | Media | Crear en migración antes de Fase 2 |
| R5 | Documentos legales, Tabla Definitiva Planes y Sistema Editorial en Downloads sin archivar | Media | Archivar en /docs antes de próxima fase |
| R6 | Sprint tipográfico pendiente — brecha DM Serif vs. Newsreader | Media | Autorizar o congelar explícitamente |
| R7 | 19 commits en develop sin merge a main — divergencia creciente | Alta | Auditoría visual + merge |
| R8 | Plan enforcement no implementado — límites por plan solo visuales | Media | Sprint enforcement antes de escalar usuarios |

---

## 9. Dependencias entre documentos (actualizado)

```
ARQUITECTURA_FUNCIONAL v2.0 (D4) ◄── CONGELADO
        │
        ▼
ARQUITECTURA_BD_SUPABASE v1.2 (D1) ──────────────────────────────┐
        │                                                          │
        ▼                                                          ▼
ROADMAP_DESARROLLO v1.1 (D2) ──────────► FASE_0_PLAN_EJECUCION v1.1 (D3)
        │                                    [ejecutado]
        │
        ├──► POLÍTICA EDITORIAL Y JURÍDICA (P1) [PENDIENTE INMEDIATO]
        │        └──► LI-003 bloqueado hasta aprobación
        │
        ├──► Fase 2 → FASE_2_PLAN_EJECUCION (P3) [pendiente]
        ├──► Fase 5 → Arquitectura ScenaIA (P4) [pendiente]
        └──► Fase 7 → docs/legal/* (P6) [en Downloads, sin archivar]
```

---

## Historial de versiones — este documento

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v2.0 | 2026-07-08 | Reescritura completa. Incorpora sprints OA-1.2 → LI-002A. Estado real Supabase. Limpieza post-auditoría. Anomalía profile_roles. |
| v1.0 | 2026-06-19 | Versión inicial — estado al cierre de Fase 0 |

---

*Este documento supersede a `ESTADO_DOCUMENTAL_ACTUAL.md` (eliminado 2026-07-08).*
*Regenerar ante cada nueva incorporación o cambio de estado documental significativo.*
