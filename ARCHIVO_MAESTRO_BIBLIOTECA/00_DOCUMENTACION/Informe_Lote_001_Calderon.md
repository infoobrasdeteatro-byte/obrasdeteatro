# Informe documental — Lote 001 · Pedro Calderón de la Barca

**Sprint:** ETS P2.2.5  
**Fecha:** 2026-06-28  
**Estado:** DOCUMENTADO — pendiente importación a Supabase

---

## Resumen del lote

| # | Obra | Año | Fuente | Estado |
|---|---|---|---|---|
| 1 | La vida es sueño | 1635 | Cervantes Virtual | YA IMPORTADA (piloto) |
| 2 | El alcalde de Zalamea | 1636 | Cervantes Virtual | Pendiente |
| 3 | El gran teatro del mundo | 1655 | Cervantes Virtual | Pendiente |
| 4 | La dama duende | 1629 | Cervantes Virtual | Pendiente |
| 5 | Casa con dos puertas mala es de guardar | 1629 | Cervantes Virtual | Pendiente |

---

## Fuente primaria utilizada

**Biblioteca Virtual Miguel de Cervantes**  
URL portal Calderón: https://www.cervantesvirtual.com/portales/calderon_de_la_barca/

Razón de selección: colección más completa y estructurada del teatro clásico español en lengua castellana. Todas las obras del Lote 001 están disponibles en el portal del autor. Las URLs individuales de cada edición deben verificarse antes de la importación de archivos PDF.

---

## Derechos

Todas las obras del Lote 001 pertenecen al dominio público.

Pedro Calderón de la Barca falleció en 1681. Aplicable la normativa de dominio público en todos los territorios de la UE (70 años post mortem). Las ediciones digitales de Cervantes Virtual y BNE son reproducciones de documentos históricos, sin derechos de edición propios según la jurisprudencia española vigente.

**rights_status para todas las obras del lote:** `public_domain`  
**access_type:** `public_download`

---

## Obras — ficha documental

### 1. La vida es sueño

- **Año:** 1635 (composición y primera impresión conocida)
- **Formato:** Comedia en tres jornadas
- **Personajes principales:** Segismundo, Rosaura, Basilio, Astolfo, Estrella, Clotaldo, Clarín
- **Estado Supabase:** IMPORTADA — ID `4bfbe073-a590-4974-8dca-95d26187d76a` (piloto P2.2.2B)
- **Dudas documentales:** Ninguna. Fecha bien establecida por la crítica.

### 2. El alcalde de Zalamea

- **Año usado:** 1636 (año de composición estimado por la crítica)
- **Formato:** Comedia en tres jornadas
- **Personajes principales:** Pedro Crespo, Isabel, Inés, Juan, El Capitán don Álvaro de Ataide, Don Lope de Figueroa, El Rey Felipe II, El Sargento, Rebolledo
- **Estado Supabase:** Pendiente de importación
- **Dudas documentales:** La fecha exacta de composición oscila entre 1636 y 1645 según las fuentes. Existe una versión atribuida a Lope de Vega (anterior); la canónica es la de Calderón. Se utiliza 1636 como año provisional. Verificar antes de importación definitiva. La primera edición conocida data de ca. 1651.

### 3. El gran teatro del mundo

- **Año usado:** 1655 (publicación en Parte Cuarta de autos sacramentales)
- **Formato:** Auto sacramental en una jornada
- **Personajes:** El Autor (Dios), El Mundo, El Rico, El Rey, La Hermosura, El Labrador, El Pobre, La Discreción, Un Niño
- **Estado Supabase:** Pendiente de importación
- **Dudas documentales:** La composición se sitúa entre 1633 y 1649 según diferentes estudios. Se usa 1655 como año de publicación verificada. Al ser auto sacramental, la duración estimada (~75 min) es inferior a las comedias de tres jornadas.

### 4. La dama duende

- **Año:** 1629 (composición y publicación en Parte Primera de Calderón)
- **Formato:** Comedia de capa y espada en tres jornadas
- **Personajes principales:** Doña Ángela, Don Manuel, Cosme, Don Luis, Don Juan, Doña Beatriz, Isabel (criada)
- **Estado Supabase:** Pendiente de importación
- **Dudas documentales:** Ninguna relevante. Año bien establecido.

### 5. Casa con dos puertas mala es de guardar

- **Año:** 1629 (composición; publicada también en Parte Primera)
- **Formato:** Comedia de capa y espada en tres jornadas
- **Personajes principales:** Félix, Marcela (hermana de Félix), Lisarda (prima de Marcela), Laura, Lisardo, Calabazas (gracioso)
- **Estado Supabase:** Pendiente de importación
- **Dudas documentales:** Título largo — slug asignado: `casa-con-dos-puertas-mala-es-de-guardar-calderon-de-la-barca`. Verificar que no supera límites de campo en Supabase (field type: text, sin límite).

---

## Incidencias técnicas

### work_files_file_type_check (detectado en P2.2.2B)

El constraint de la tabla `work_files` solo permite los tipos: `script | image | video | audio | document`.

Para archivos PDF de guiones, usar `file_type = 'script'`.  
No existe un tipo `pdf` o `script_pdf`. Evaluar si ampliar el constraint en el próximo sprint de arquitectura.

### Slugs largos

El slug de "Casa con dos puertas mala es de guardar" tiene 59 caracteres. No existe límite formal en el campo `slug` (tipo text), pero verificar que la URL resultante `/obras/casa-con-dos-puertas-mala-es-de-guardar-calderon-de-la-barca` no genere problemas de SEO o de navegación en el frontend.

### URLs individuales de edición

Las `source_url` registradas apuntan al portal general de Calderón en Cervantes Virtual. Antes de la importación definitiva y la descarga de PDFs, deben verificarse las URLs individuales de cada edición para garantizar trazabilidad exacta del documento.

---

## Estado del CSV de importación

**Archivo:** `05_IMPORTACIONES/Lote_001_Calderon.csv`

- Codificación: UTF-8
- 5 registros (incluyendo piloto ya importado)
- El campo `secondary_genres` usa separador `|` interno — debe convertirse a array PostgreSQL antes del comando COPY o de la llamada REST a Supabase.
- El campo `synopsis_short` incluye la sinopsis de importación. El `synopsis_full` se documenta en `04_DATASETS/Coleccion_Fundacional.xlsx`.

---

## Próximos pasos recomendados

1. Verificar URLs individuales de edición en Cervantes Virtual para cada obra.
2. Resolver la ambigüedad de fecha en El alcalde de Zalamea y El gran teatro del mundo.
3. Ejecutar importación de los 4 registros pendientes (La vida es sueño ya importada).
4. Asociar archivos PDF mediante `work_files` (file_type: 'script') tras localizar las descargas.
5. Evaluar ampliación del constraint `work_files_file_type_check` si se necesitan tipos adicionales.

---

*Informe generado automáticamente durante Sprint ETS P2.2.5*
