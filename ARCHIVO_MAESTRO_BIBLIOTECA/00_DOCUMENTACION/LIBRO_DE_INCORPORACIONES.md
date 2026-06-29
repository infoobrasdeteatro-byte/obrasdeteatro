# Libro de Incorporaciones — Biblioteca Oficial ObrasDeTeatro®

Este documento registra cronológicamente cada incorporación oficial de obras a la Biblioteca Oficial de ObrasDeTeatro®.

---

## Incorporación Nº 001

**Fecha de incorporación:** 2026-06-28

**Autor**

Pedro Calderón de la Barca  
*(Madrid, 1600 – Madrid, 1681)*

**Colección**

Colección Fundacional

**Lote**

Lote_001_Calderon

**Obras incorporadas**

| Obra | Año | Género | Supabase ID |
|---|---|---|---|
| La vida es sueño | 1635 | Teatro clásico | `4bfbe073-a590-4974-8dca-95d26187d76a` |
| El alcalde de Zalamea | 1636 | Drama de honor | `3a06cfdf-78cc-45de-a078-513a27b9b5a2` |
| El gran teatro del mundo | 1655 | Auto sacramental | `f531ebd7-14f5-46d3-b9a6-61a7068ef9c9` |
| La dama duende | 1629 | Comedia de enredo | `e580a304-184f-4b6c-8365-cb34c6a29229` |
| Casa con dos puertas mala es de guardar | 1629 | Comedia de enredo | `2f7a12a0-9a50-47e7-b87d-f1dd8ee7da33` |

**Fuente documental**

Biblioteca Virtual Miguel de Cervantes  
https://www.cervantesvirtual.com/portales/calderon_de_la_barca/

**Estado de derechos**

Dominio público — obras anteriores a 1900 con autor fallecido en 1681.

**Estado técnico**

Incorporadas oficialmente a la Biblioteca Oficial de ObrasDeTeatro®.

- institution_id: `d0a54895-ac1a-4dc4-9286-9ff84c9841ee` (Biblioteca Oficial ObrasDeTeatro®)
- profile_id: NULL (obras institucionales — Modelo de Propiedad Dual)
- is_library_work: true
- is_published: true
- rights_status: public_domain
- access_type: public_download

Validaciones completadas:
- ✅ 5 obras presentes en Supabase bajo la institución correcta
- ✅ Constraint `works_single_owner` activo — ninguna obra puede tener propietario ambiguo
- ✅ 0 regresiones sobre obras de usuario
- ✅ Fichas públicas `/obras/[slug]` renderizan sin errores
- ✅ TypeScript limpio — build correcto

**Observaciones**

Las siguientes incidencias documentales quedan registradas sin bloquear la incorporación:

1. *El alcalde de Zalamea* — Año de composición debatido (c. 1636-1645). Se usa 1636 como año provisional. Verificar frente a ediciones críticas antes de la próxima revisión del catálogo.

2. *El gran teatro del mundo* — Fecha de composición incierta (c. 1633-1649). Se registra 1655 como año de publicación verificada. Pendiente confirmación de año de composición.

3. URLs individuales de edición — Las `source_url` apuntan al portal general de Calderón en Cervantes Virtual. Localizar y registrar las URLs específicas de cada edición antes de la incorporación de archivos PDF.

4. `work_files_file_type_check` — El constraint de la tabla `work_files` solo permite cinco tipos (`script | image | video | audio | document`). Los guiones PDF deben importarse como `file_type = 'script'`. Evaluar ampliación del constraint si se necesitan tipos adicionales.

---

*Inauguración oficial de la Biblioteca Oficial ObrasDeTeatro®*  
*Sprint ETS P2.2.6 — 2026-06-28*

---

## Incorporación Nº 002

**Fecha de incorporación:** 2026-06-29

**Autor**

Lope de Vega  
*(Madrid, 1562 – Madrid, 1635)*

**Colección**

Colección Fundacional

**Lote**

Lote_002_Lope

**Obras incorporadas**

| Obra | Año | Género | Supabase ID |
|---|---|---|---|
| Fuente Ovejuna | 1614 | Drama de honor | `4ff1e163-30ea-4a05-b3ca-35b06823e3c9` |
| El perro del hortelano | 1613 | Comedia de enredo | `ea4abd51-2956-406a-a524-b56c7c5a3353` |
| La dama boba | 1613 | Comedia | `2f5de386-85e4-4659-8d69-151e92cf94b6` |
| El caballero de Olmedo | 1641 | Tragicomedia | `a47b87c4-3cf6-4eea-9c1f-2dd9f86932c8` |
| Peribáñez y el Comendador de Ocaña | 1610 | Drama de honor | `7bdcd0d5-7ea5-4976-a370-396e8729c1f7` |

**Fuente documental**

Biblioteca Virtual Miguel de Cervantes  
https://www.cervantesvirtual.com/portales/lope_de_vega/

**Estado de derechos**

Dominio público — obras anteriores a 1900 con autor fallecido en 1635.

**Estado técnico**

Incorporadas oficialmente a la Biblioteca Oficial de ObrasDeTeatro®.

- institution_id: `d0a54895-ac1a-4dc4-9286-9ff84c9841ee` (Biblioteca Oficial ObrasDeTeatro®)
- profile_id: NULL (obras institucionales — Modelo de Propiedad Dual)
- is_library_work: true
- is_published: true
- rights_status: public_domain
- access_type: public_download

Validaciones completadas:
- ✅ 5 obras presentes en Supabase bajo la institución correcta
- ✅ Catálogo total Biblioteca Oficial: 10 obras (5 Calderón + 5 Lope de Vega)
- ✅ Constraint `works_single_owner` activo — ninguna obra puede tener propietario ambiguo
- ✅ 0 regresiones sobre obras de usuario
- ✅ Fichas públicas `/obras/[slug]` disponibles para las 5 nuevas obras
- ✅ Contador del Catálogo en el Índice Editorial actualizado automáticamente: 5 → 10

**Observaciones**

Las siguientes incidencias documentales quedan registradas sin bloquear la incorporación:

1. *El caballero de Olmedo* — La fecha de composición se sitúa entre 1620 y 1625 según la crítica. Se registra 1641 como año de primera edición impresa verificada. Verificar frente a ediciones críticas antes de la próxima revisión del catálogo.

2. *Peribáñez y el Comendador de Ocaña* — Fecha de composición estimada (c. 1605-1612). Se usa 1610 como año más citado en la bibliografía académica. Pendiente confirmación de año exacto.

3. URLs individuales de edición — Las `source_url` apuntan al portal general de Lope de Vega en Cervantes Virtual. Localizar y registrar las URLs específicas de cada edición antes de la incorporación de archivos PDF.

---

*Segundo dramaturgo oficial de la Biblioteca Oficial ObrasDeTeatro®*  
*Sprint ETS LI-002 — 2026-06-29*
