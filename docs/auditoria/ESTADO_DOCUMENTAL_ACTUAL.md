# ESTADO DOCUMENTAL ACTUAL — ObrasDeTeatro®

**Fecha de emisión:** 2026-06-19
**Elaborado por:** Revisión automática del repositorio documental
**Fuente:** `docs/auditoria/INVENTARIO_DOCUMENTAL.md` · `docs/arquitectura/` · `docs/roadmap/`

---

## 1. Documentos oficiales archivados

| # | Documento | Versión | Estado | Ubicación en repo | Hash MD5 | Tamaño |
|---|---|---|---|---|---|---|
| 1 | ARQUITECTURA_BD_SUPABASE_v1.2.docx | 1.2 | CONGELADO | `docs/arquitectura/` | `4B9295870794B487A29E6D9329EC3AC5` | 39,4 KB |
| 2 | ROADMAP_DESARROLLO_v1.1.docx | 1.1 | CONGELADO | `docs/roadmap/` | `EA8BDDBFDE9B418C3A6059C32FB492AB` | 23,1 KB |

Ambos documentos han sido verificados por integridad (hash origen = hash destino). Contenido no modificado respecto al original entregado.

---

## 2. Versiones vigentes

### ARQUITECTURA_BD_SUPABASE — versión oficial: **v1.2**

- Título completo: *Arquitectura de Base de Datos — Supabase v1.2 · Junio 2026*
- Empresa: CONECTA PLUS GLOBAL, S.L.U. · Team Show Producciones
- Alcance: Documento técnico de referencia para Cursor, Windsurf, Lovable y Bolt
- Párrafos totales: 1.580 · XML: 1.132.268 bytes

### ROADMAP_DESARROLLO — versión oficial: **v1.1**

- Título completo: *Roadmap de Desarrollo v1.1 · Junio 2026*
- Empresa: CONECTA PLUS GLOBAL, S.L.U. · Team Show Producciones
- Alcance: Documento ejecutable para Cursor · Windsurf · Lovable · Bolt · desarrolladores
- Fases cubiertas: 0 a 8 (Preparación → Lanzamiento público)
- Párrafos totales: 1.580 · Longitud texto plano: 19.870 chars

---

## 3. Documentos históricos detectados

| Documento | Versión | Localización | Observaciones |
|---|---|---|---|
| ARQUITECTURA_BD_SUPABASE_v1.0.docx | 1.0 | `Downloads/` (no archivado) | Versión inicial. Sustituida por v1.1 y v1.2. |
| ARQUITECTURA_BD_SUPABASE_v1.1.docx | 1.1 | `Downloads/` (no archivado) | Versión intermedia. Sustituida por v1.2. |
| ARQUITECTURA_BD_SUPABASE_v1.2_1.docx | 1.2 | `Downloads/` (duplicado) | Copia idéntica a la oficial. Hash MD5 idéntico. Prescindible. |
| ARQUITECTURA_BD_SUPABASE_v1.2_1 (1).docx | 1.2 | `Downloads/` (duplicado) | Ídem. Generado por descarga repetida de Windows. |
| ROADMAP_DESARROLLO_v1.0.docx | 1.0 | `Downloads/` (no archivado) | Versión anterior. Sustituida por v1.1 como referencia activa. |

> Ninguno de estos archivos ha sido copiado al repositorio. Permanecen en `Downloads` como historial local del autor.

---

## 4. Documentos pendientes de localizar

Los siguientes documentos están **referenciados en los archivos oficiales** pero aún no han sido entregados ni archivados en `/docs`:

| Documento referenciado | Referenciado en | Versión mencionada | Estado declarado |
|---|---|---|---|
| ARQUITECTURA_FUNCIONAL_OBRASDETEATRO | ROADMAP_DESARROLLO_v1.1 (cabecera) | v1.0 | ✅ Congelada (según el roadmap) |
| 8 documentos jurídicos especializados | ROADMAP_DESARROLLO_v1.1 (Fase 7) | — | Pendientes de publicación en `/legal/*` |

**Prioridad de localización:**
1. **ARQUITECTURA_FUNCIONAL_OBRASDETEATRO v1.0** — es documento de referencia activo citado en el roadmap vigente. Su ausencia del repositorio es el principal hueco documental.
2. **Documentos legales** — requeridos antes del lanzamiento de Beta (Fase 7).

---

## 5. Riesgos documentales actuales

| # | Riesgo | Severidad | Detalle |
|---|---|---|---|
| R1 | ARQUITECTURA_FUNCIONAL ausente | **Alta** | El ROADMAP_v1.1 la lista como "Congelada v1.0" pero no está archivada en el repositorio. Cualquier desarrollador que consulte `/docs` tendrá la arquitectura BD pero no la funcional. |
| R2 | Autoref incorrecta en ROADMAP v1.1 | Media | En la cabecera "Documentos de referencia", el propio documento se lista como `ROADMAP_DESARROLLO v1.0 ✅ Activo`. La versión archivada es v1.1, no v1.0. Inconsistencia menor heredada del origen. |
| R3 | Versiones históricas sin archivar | Baja | v1.0 y v1.1 de ARQUITECTURA_BD y v1.0 de ROADMAP permanecen únicamente en `Downloads`. Si el equipo formatea o pierde acceso al equipo, se pierde el historial de evolución. Valorar archivar en `docs/historico/`. |
| R4 | Documentos legales pendientes | Media | El roadmap exige 8 documentos jurídicos publicados en `/legal/*` como requisito de cierre de Fase 7 (Beta). La carpeta `docs/legal/` existe pero está vacía. |
| R5 | Sin fichero de formularios | Baja | La carpeta `docs/formularios/` existe pero no contiene ningún documento. Si el proyecto tiene formularios definidos (solicitud de derechos, eliminación de cuenta RGPD Art. 17), deberían estar aquí. |

---

## Resumen ejecutivo

```
Documentos oficiales archivados  : 2 / 2 entregados ✅
Integridad verificada             : 2 / 2 ✅
Documentos referenciados ausentes : 1 crítico (ARQUITECTURA_FUNCIONAL)
Documentos legales pendientes     : 8 (requeridos en Fase 7)
Versiones históricas sin archivar : 5 archivos en Downloads
Carpetas /docs creadas sin uso    : 2 (formularios, historico)
```

**Siguiente acción recomendada:** Localizar y archivar `ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v1.0.docx`.

---

*Documento generado automáticamente. No modificar manualmente — regenerar tras cada nueva incorporación documental.*
