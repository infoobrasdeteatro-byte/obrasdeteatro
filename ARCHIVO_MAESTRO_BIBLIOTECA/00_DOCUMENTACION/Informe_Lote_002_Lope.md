# Informe documental — Lote 002 · Lope de Vega

**Sprint:** ETS LI-002  
**Fecha:** 2026-06-29  
**Estado:** IMPORTADO — todas las obras presentes en Supabase

---

## Resumen del lote

| # | Obra | Año | Fuente | Estado | Supabase ID |
|---|---|---|---|---|---|
| 1 | Fuente Ovejuna | 1614 | Cervantes Virtual | IMPORTADA | `4ff1e163-30ea-4a05-b3ca-35b06823e3c9` |
| 2 | El perro del hortelano | 1613 | Cervantes Virtual | IMPORTADA | `ea4abd51-2956-406a-a524-b56c7c5a3353` |
| 3 | La dama boba | 1613 | Cervantes Virtual | IMPORTADA | `2f5de386-85e4-4659-8d69-151e92cf94b6` |
| 4 | El caballero de Olmedo | 1641 | Cervantes Virtual | IMPORTADA | `a47b87c4-3cf6-4eea-9c1f-2dd9f86932c8` |
| 5 | Peribáñez y el Comendador de Ocaña | 1610 | Cervantes Virtual | IMPORTADA | `7bdcd0d5-7ea5-4976-a370-396e8729c1f7` |

---

## Fuente primaria utilizada

**Biblioteca Virtual Miguel de Cervantes**  
URL portal Lope de Vega: https://www.cervantesvirtual.com/portales/lope_de_vega/

Razón de selección: misma fuente institucional utilizada en el Lote 001 (Calderón). Portal del autor más completo y estructurado para el teatro del Siglo de Oro en lengua castellana. Las URLs individuales de cada edición deben verificarse antes de la importación de archivos PDF.

---

## Derechos

Todas las obras del Lote 002 pertenecen al dominio público.

Lope de Vega falleció en 1635. Aplicable la normativa de dominio público en todos los territorios de la UE (70 años post mortem). Las ediciones digitales de Cervantes Virtual son reproducciones de documentos históricos sin derechos de edición propios según la jurisprudencia española vigente.

**rights_status para todas las obras del lote:** `public_domain`  
**access_type:** `public_download`  
**rights_manager:** NULL

---

## Obras — ficha documental

### 1. Fuente Ovejuna

- **Año usado:** 1614 (estimación académica del período de composición c. 1612-1614)
- **Primera edición impresa:** 1619, Docena Parte de las Comedias de Lope de Vega Carpio
- **Formato:** Comedia en tres actos
- **Personajes principales:** Laurencia, Frondoso, Comendador Fernán Gómez de Guzmán, Esteban (alcalde), Jacinta, Mengo, Rey Fernando, Reina Isabel
- **Repartos:** 12-25 personajes (incluye numerosos vecinos del pueblo)
- **Edad mínima recomendada:** 14
- **Dudas documentales:** Ninguna sobre autoría o derechos. La fecha de composición oscila entre 1612 y 1614 según la crítica; se usa 1614 como estimación media. La primera impresión de 1619 es el documento verificado.

### 2. El perro del hortelano

- **Año usado:** 1613 (fecha del manuscrito autógrafo conservado)
- **Formato:** Comedia en tres actos
- **Personajes principales:** Diana (condesa de Belflor), Teodoro, Marcela, Tristán (gracioso), Otavio, Ricardo, Federico
- **Repartos:** 10-18 personajes
- **Edad mínima recomendada:** 12
- **Dudas documentales:** Ninguna. La fecha 1613 procede del manuscrito autógrafo, fuente directa y verificada.

### 3. La dama boba

- **Año usado:** 1613 (autógrafo en Biblioteca Nacional de España, fechado el 28 de abril de 1613)
- **Formato:** Comedia en tres actos
- **Personajes principales:** Finea, Nise, Laurencio, Liseo, Miseno (padre), Pedro (criado de Laurencio), Clara, Celia
- **Repartos:** 10-16 personajes
- **Edad mínima recomendada:** 12
- **Dudas documentales:** Ninguna. El autógrafo en BNE es la fuente más directa posible. Fecha verificada.

### 4. El caballero de Olmedo

- **Año usado:** 1641 (primera edición impresa verificada: Veinte y una parte verdadera de las Comedias del Fénix)
- **Período de composición:** c. 1620-1625 según la crítica especializada
- **Formato:** Comedia (de tono crecientemente trágico) en tres actos
- **Personajes principales:** Don Alonso (el caballero), Inés, Don Rodrigo, Don Fernando, Fabia, Tello (gracioso), Don Pedro (padre de Inés), La Sombra
- **Repartos:** 10-18 personajes
- **Edad mínima recomendada:** 14
- **Dudas documentales:** La fecha de composición se sitúa entre 1620 y 1625; hay quien la anticipa a 1615. Se usa 1641 como año de primera edición impresa verificada. Verificar frente a ediciones críticas antes de la próxima revisión del catálogo.

### 5. Peribáñez y el Comendador de Ocaña

- **Año usado:** 1610 (estimación académica más citada; composición c. 1605-1612)
- **Primera edición:** incluida en Parte Cuarta de las Comedias de Lope de Vega (1614)
- **Formato:** Comedia en tres actos
- **Personajes principales:** Peribáñez, Casilda, El Comendador de Ocaña, Inés (prima de Casilda), Luján, Leonardo, El Condestable, El Rey Enrique III
- **Repartos:** 12-20 personajes
- **Edad mínima recomendada:** 14
- **Dudas documentales:** Fecha de composición no definitivamente establecida. El año 1610 es el más citado en la bibliografía académica pero la composición puede situarse entre 1605 y 1612. Verificar en edición crítica de referencia.

---

## Campos adicionales importados via SQL

Los siguientes campos se importaron directamente mediante sentencia SQL y no figuran en el CSV de archivo (por compatibilidad de formato con Lote 001):

| Campo | Valor por obra |
|---|---|
| `min_age` | 14 (obras 1, 4, 5) / 12 (obras 2, 3) |
| `synopsis_full` | Sinopsis extendida (párrafo académico por obra) |
| `view_count` | 0 |

---

## Incidencias técnicas

### URLs individuales de edición

Las `source_url` apuntan al portal general de Lope de Vega en Cervantes Virtual. Pendiente localización y registro de URLs específicas de cada edición digital antes de la incorporación de archivos PDF (work_files).

### Slug con caracteres normalizados

El slug de "Peribáñez y el Comendador de Ocaña" normaliza los caracteres especiales: `peribanez-y-el-comendador-de-ocana-lope-de-vega`. La URL resultante es válida y no genera problemas de navegación.

### Fechas pendientes de verificación crítica

El caballero de Olmedo (1641) y Peribáñez (1610) tienen fechas académicamente establecidas pero con márgenes de debate. Verificar en ediciones críticas de la RAE o el GRISO antes de la próxima auditoría del catálogo.

---

## Estado de la Biblioteca tras el Lote 002

| Dramaturgo | Obras | Período |
|---|---|---|
| Pedro Calderón de la Barca | 5 | 1629–1655 |
| Lope de Vega | 5 | 1610–1641 |
| **Total Biblioteca Oficial** | **10** | — |

---

## Próximos pasos recomendados

1. Verificar URLs individuales de edición en Cervantes Virtual para cada obra.
2. Resolver ambigüedad de fechas en El caballero de Olmedo y Peribáñez frente a ediciones críticas.
3. Asociar archivos PDF mediante `work_files` (file_type: 'script') cuando se localicen las descargas.
4. Proponer el tercer dramaturgo de la Colección Fundacional siguiendo el mismo estándar editorial.

---

*Informe generado durante Sprint ETS LI-002*  
*Segundo dramaturgo oficial de la Biblioteca Oficial ObrasDeTeatro®*
