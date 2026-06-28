# Archivo Maestro de la Biblioteca — ObrasDeTeatro®

## Propósito

Este directorio constituye la **fuente documental oficial** de la Biblioteca Oficial de ObrasDeTeatro®.

Toda obra, autor, fuente o institución que forme parte del patrimonio bibliográfico de la plataforma debe estar documentada aquí antes de ser importada a producción.

---

## Principio fundamental

**Supabase es la base de datos de producción. Este Archivo Maestro es la fuente documental.**

Son dos sistemas con funciones distintas e igualmente necesarias:

| Archivo Maestro | Supabase |
|---|---|
| Fuente de verdad documental | Base de datos operativa |
| Control editorial humano | Motor de consultas de la plataforma |
| Historial permanente | Estado actual del catálogo |
| Verificación antes de importar | Resultado de la importación |

---

## Flujo de trabajo obligatorio

```
Investigación → Archivo Maestro → Revisión editorial → Importación → Supabase
```

Ninguna obra debe importarse directamente a Supabase sin haber pasado primero por este archivo.

---

## Estructura

```
ARCHIVO_MAESTRO_BIBLIOTECA/
│
├── 00_DOCUMENTACION/     — Criterios editoriales, normas de catalogación,
│                           procedimientos de importación
│
├── 01_FUENTES/           — Registro de fuentes oficiales documentadas
│                           (BNE, Cervantes Virtual, Gutenberg, Wikisource…)
│
├── 02_AUTORES/           — Archivos individuales por dramaturgo
│                           (Pedro_Calderon_de_la_Barca.xlsx, Lope_de_Vega.xlsx…)
│
├── 03_OBRAS/             — Documentación individual de obras
│                           (guiones, fichas, referencias)
│
├── 04_DATASETS/          — Datasets de importación
│                           Coleccion_Fundacional.xlsx — catálogo maestro
│
├── 05_IMPORTACIONES/     — Archivo histórico de lotes importados a Supabase
│                           (Lote_001_Calderon.csv, Lote_002_Lope.csv…)
│
└── 06_PLANTILLAS/        — Plantillas vacías para autores, obras,
                            instituciones e importaciones
```

---

## Datasets

### `04_DATASETS/Coleccion_Fundacional.xlsx`

Archivo maestro de la colección fundacional. Contiene cuatro pestañas:

| Pestaña | Contenido |
|---|---|
| OBRAS | Catálogo completo de obras a importar |
| AUTORES | Registro de dramaturgos documentados |
| FUENTES | Fuentes oficiales y su licencia |
| LOG_IMPORTACION | Historial de todas las importaciones realizadas |

Los campos de la pestaña OBRAS corresponden exactamente a los campos de la tabla `works` en Supabase.

---

## Plantillas

Las plantillas en `06_PLANTILLAS/` contienen los encabezados de columna estandarizados para cada tipo de entidad:

- `Plantilla_Obras.xlsx` — campos de la tabla `works`
- `Plantilla_Autores.xlsx` — datos biográficos de dramaturgos
- `Plantilla_Instituciones.xlsx` — campos de la tabla `institutions`
- `Plantilla_Importacion.xlsx` — registro de lotes de importación

---

## Normas editoriales

1. **Nombres de archivo:** usar guión bajo, sin tildes, sin espacios.
   Ejemplo: `Pedro_Calderon_de_la_Barca.xlsx`

2. **Fuentes:** toda obra debe documentar su fuente (`source_name`, `source_url`) antes de importarse.

3. **Derechos:** verificar `rights_status` antes de asignar `access_type`.
   Solo obras en dominio público pueden llevar `public_download`.

4. **Slugs:** únicos, en minúsculas, con guiones, sin tildes.
   Ejemplo: `la-vida-es-sueno-calderon-de-la-barca`

5. **Lotes de importación:** cada importación a Supabase genera un archivo en `05_IMPORTACIONES/`
   con el registro de lo importado y el resultado.

---

## Estado actual

| Elemento | Estado |
|---|---|
| Coleccion_Fundacional.xlsx | Estructura creada — pendiente de contenido |
| Primer autor a documentar | Pedro Calderón de la Barca |
| Obra piloto en Supabase | La vida es sueño (`52797f1`) |
| Siguiente paso | Completar OBRAS y AUTORES antes de la primera importación masiva |

---

*Archivo Maestro inicializado: 2026-06-28*
*Sprint: ETS P2.2.4*
