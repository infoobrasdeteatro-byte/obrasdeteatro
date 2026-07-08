# ETS OA-1.4 — Diseño de la Página Editorial de Obra
## ObrasDeTeatro® — Propuesta funcional para auditoría y aprobación
**Fecha:** 2026-06-29
**Sprint de referencia:** OA-1.4 (sin implementar)
**Estado:** Propuesta — pendiente de aprobación

---

## Nota preliminar

La ficha actual (`/obras/[slug]/page.tsx`) es una implementación provisional
que usa clases Tailwind utilitarias directas, una nav propia desconectada del
`TopNav` del sistema, y un único bloque de datos sin jerarquía editorial.

Este documento propone su sustitución completa por una **Página Editorial de Obra**
coherente con el sistema visual, la arquitectura de datos y el modelo de suscripciones
de ObrasDeTeatro®. No se implementa nada aquí.

---

## 1. Cabecera

### Zona de identificación principal

La cabecera ocupa la parte superior de la página con fondo blanco y separación
visual clara del cuerpo. Contiene los datos de identidad primaria de la obra.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [TopNav del sistema — idéntico al resto de la plataforma]           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ← Biblioteca de Obras  /  Teatro clásico                            │  ← Breadcrumb
│                                                                      │
│  TEATRO CLÁSICO · SIGLO DE ORO                                       │  ← Eyebrow (género + contexto)
│                                                                      │
│  La vida es sueño                                                    │  ← Título h1, serif grande
│  Auto filosófico en tres jornadas                                    │  ← Subtítulo (si existe)
│                                                                      │
│  Pedro Calderón de la Barca   ·   1635   ·   España                │  ← Autor · Año · País
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- **Breadcrumb:** `← Biblioteca de Obras / [Género]` — navegación hacia atrás
- **Eyebrow:** género principal + contexto histórico (ej. "Teatro clásico · Siglo de Oro"). Texto en rojo institucional (`var(--red)`), versalitas, sin mayúsculas forzadas
- **Título (`h1`):** tipografía serif, tamaño grande (`clamp(32px, 5vw, 56px)`), sin negrita, tracking negativo. Es el elemento dominante de la página
- **Subtítulo:** si existe `subtitle` en la obra, aparece bajo el título en cuerpo menor, tono muted. Si no existe, el espacio se elimina.
- **Línea de identidad:** `[Autor] · [Año] · [País]` — tipografía sans, tamaño 14px, color muted. El nombre del autor irá enlazado a la ficha del autor cuando exista tabla de autores.

**Notas de diseño:**
- La cabecera no tiene fondo oscuro. Es blanca, austera, editorial.
- No hay imagen de portada en la cabecera — si existe, aparece en el cuerpo.
- El `TopNav` es el estándar del sistema, no una nav propia.

---

## 2. Información Principal

### Estructura de dos columnas (desktop)

El cuerpo de la página se divide en dos columnas:
- **Columna principal** (65%): sinopsis, imagen, bloques editoriales
- **Columna lateral** (35%): datos técnicos, recursos, derechos

```
┌─────────────────────────────────┬─────────────────────┐
│                                 │                     │
│  SINOPSIS                       │  DATOS TÉCNICOS     │
│  ─────────                      │  ──────────────     │
│  [Texto de sinopsis corta]      │  Duración   120 min │
│                                 │  Personajes   3–8   │
│  [Botón: Leer sinopsis completa]│  Idioma    Español  │
│  (requiere registro)            │  País        España │
│                                 │  Edad mín.    +12   │
│  [Imagen de portada]            │                     │
│  (si existe cover_image_url)    │  DERECHOS           │
│                                 │  ──────────────     │
│                                 │  ● Dominio público  │
│                                 │  Biblioteca Oficial │
│                                 │                     │
│                                 │  RECURSOS           │
│                                 │  ──────────────     │
│                                 │  [↓ Descargar PDF]  │
│                                 │  [Fuente documental]│
│                                 │                     │
└─────────────────────────────────┴─────────────────────┘
```

### 2.1 Sinopsis

Hay dos niveles de sinopsis en el schema: `synopsis_short` y `synopsis_full`.

- **Sinopsis corta** (`synopsis_short`): visible para todos sin registro. Máximo 3 líneas visibles. Texto sans, 15px, leading relajado.
- **Sinopsis completa** (`synopsis_full`): requiere registro gratuito. Si el usuario no está autenticado, el texto se corta con un degradado y aparece un CTA "Iniciar sesión para leer más".
- **Campo `synopsis` legacy:** el campo antiguo se usa como fallback cuando no existe `synopsis_short`. Este comportamiento debe documentarse en el sprint de implementación.

### 2.2 Imagen de portada

Si existe `cover_image_url`:
- La imagen aparece en la columna principal, bajo la sinopsis, con relación de aspecto `4:3` o `3:2`
- Pie de foto: crédito de la imagen o fuente (campo libre — a definir en sprint)
- Si no existe: el espacio se omite sin dejar hueco visual

### 2.3 Datos técnicos (sidebar)

Bloque compacto en la columna lateral. Siempre visible. No requiere autenticación.

| Etiqueta | Campo en Supabase | Formato visible |
|----------|------------------|-----------------|
| Duración | `duration_minutes` | "120 min" / "2 h" |
| Personajes | `cast_size_min` + `cast_size_max` | "3–8 personajes" / "8 personajes" / "Desde 3" |
| Idioma | `language` | "Español" (usando `IDIOMA_LABEL`) |
| País | `country_code` | "España" (usando `COUNTRIES`) |
| Edad mínima | `min_age` | "+12 años" / omitido si null |
| Género | `genre` | Texto directo |
| Subgéneros | `secondary_genres` | Tags separados (array PostgreSQL) |

### 2.4 Estado de derechos (sidebar)

Bloque visual con indicador de estado prominente.

```
DERECHOS
─────────────────
●  Dominio público
   Obra compuesta antes de 1900.
   Autor fallecido en 1681.

   Gestionado por:
   Biblioteca Oficial ObrasDeTeatro®
```

Mapeo `rights_status` → indicador visual:
- `public_domain` → círculo verde, texto "Dominio público"
- `managed` → círculo amarillo, texto "Derechos gestionados"
- `restricted` → círculo rojo, texto "Derechos reservados"
- `unknown` → círculo gris, texto "Estado desconocido"

El campo `rights_manager` aparece bajo el indicador como "Gestionado por: [nombre]".
Si `institution_id` está presente, la institución aparece como responsable.

---

## 3. Contenido Editorial

### Bloques adicionales (no todos obligatorios)

Los bloques editoriales aparecen en la columna principal, bajo la sinopsis,
en orden jerárquico. No todos los campos existen en el schema actual — su
implementación requerirá campos adicionales o un sistema de contenido estructurado.
Esta sección define qué bloques **deben existir en el futuro**.

Los bloques que tienen soporte en el schema actual se marcan con ✅.
Los que requieren nuevos campos se marcan con 🔲.

---

**Bloque A — Contexto histórico** 🔲
> *Campo requerido: `historical_context` (text, nullable)*

Párrafo o serie de párrafos que sitúan la obra en su época.
Para obras de la Biblioteca Oficial: redacción editorial.
Para obras de usuario: campo opcional que el autor puede rellenar.

Ejemplo para *La vida es sueño*:
> *"Escrita en torno a 1635, en pleno apogeo del teatro barroco español, La vida es sueño representa la cúspide del teatro filosófico del Siglo de Oro. Calderón compuso la obra en un período de intensa reflexión sobre el libre albedrío y el predestinacionismo..."*

---

**Bloque B — Sinopsis completa** ✅
> *Campo: `synopsis_full` (ya existe en schema)*

Si existe `synopsis_full`, se muestra aquí como bloque expandido.
Requiere registro gratuito para acceder (ver sección 6 — Suscripciones).

---

**Bloque C — Estructura de la obra** 🔲
> *Campo requerido: `structure_notes` (text, nullable)*

Número de actos/jornadas, escenas, prólogo, epílogo.
Relevante para profesionales que evalúan la obra para montaje.

Ejemplo: *"Tres jornadas. Sin escenas formalizadas. Estructura dramática de libre resolución."*

---

**Bloque D — Notas editoriales** 🔲
> *Campo requerido: `editorial_notes` (text, nullable)*

Observaciones sobre la edición utilizada como fuente, variantes textuales,
problemas de datación, discrepancias entre manuscritos.
Solo aparece en obras de la Biblioteca Oficial.

---

**Bloque E — Ediciones de referencia** 🔲
> *Campo requerido: tabla `work_editions` (id, work_id, editor, year, publisher, url, notes)*

Lista de ediciones críticas conocidas de la obra.
Cada entrada: editor, año, editorial, enlace.
Solo para obras de Biblioteca — no aplica a obras de usuario.

---

**Bloque F — Representaciones destacadas** 🔲
> *Campo requerido: tabla `work_productions` (id, work_id, company, director, year, country, notes)*

Montajes históricos o actuales de referencia.
Información editorial curada — no conectada al módulo de espectáculos de usuario.

---

**Bloque G — Adaptaciones** 🔲
> *Campo requerido: `adaptations` (jsonb, nullable)*

Adaptaciones conocidas a otros medios: cine, televisión, ópera, novela gráfica.

---

**Bloque H — Curiosidades** 🔲
> *Campo requerido: `curiosities` (text, nullable)*

Datos de interés editorial. Tono divulgativo, no académico.

---

**Bloque I — Premios y reconocimientos** 🔲
> *Campo requerido: tabla `work_awards` (id, work_id, award_name, year, category)*

Solo obras contemporáneas con historial de premios.
Irrelevante para el Lote 001 (Calderón, siglo XVII).

---

**Orden de aparición recomendado en la página:**

1. Sinopsis corta (pública)
2. Sinopsis completa (registro)
3. Contexto histórico (registro)
4. Estructura de la obra (registro)
5. Notas editoriales (premium)
6. Ediciones de referencia (premium)
7. Representaciones destacadas (premium)
8. Adaptaciones (premium)
9. Curiosidades (registro)
10. Premios (público)

---

## 4. Recursos

### Zona de acceso a materiales

Los recursos están en la **columna lateral** (sidebar), siempre visibles,
pero con estado de disponibilidad según `access_type` y plan del usuario.

```
RECURSOS
──────────────────────────────

  [↓ Descargar guión]          ← Botón primario (rojo si disponible)
     Formato PDF · Español
     Libre descarga — Dominio público

  [→ Fuente documental]        ← Enlace externo
     Biblioteca Virtual Miguel de Cervantes
     cervantesvirtual.com

  [✉ Solicitar derechos]       ← Solo visible si access_type lo requiere
     Aplicable a obras con derechos gestionados

──────────────────────────────
  Incorporada el 28 jun. 2026
  Biblioteca Oficial ObrasDeTeatro®
```

### 4.1 Botón de descarga PDF

El botón se adapta al `access_type` de la obra:

| access_type | Estado del botón | Texto |
|-------------|-----------------|-------|
| `public_download` | Activo, sin restricción | "Descargar guión" |
| `premium_download` | Visible, requiere Premium | "Descargar (Premium)" |
| `rights_request` | Oculto; aparece "Solicitar" | — |
| `author_contact` | Oculto; aparece "Contactar autor" | — |
| `editorial_sale` | Oculto; aparece "Adquirir" | — |
| `private` | No aparece el recurso | — |

Si no existe ningún archivo en `work_files` para esta obra, el botón **no aparece**,
independientemente del `access_type`. No se muestra un botón deshabilitado.

### 4.2 Fuente documental

Siempre visible (pública). Enlace externo a `source_url` con `source_name` como texto.
Icono de enlace externo. Se abre en nueva pestaña.
Si `source_url` no existe, el bloque no aparece.

### 4.3 Solicitud de derechos

Solo visible cuando `access_type` es `rights_request` o `author_contact`.
Lleva al módulo de solicitud de derechos (tabla `work_rights_requests`).
Para obras con `profile_id`: mensaje directo al autor.
Para obras institucionales: formulario hacia `rights_manager`.

### 4.4 Información de incorporación

Pie del sidebar:
- Fecha de incorporación (campo `created_at` formateado: "Incorporada el 28 jun. 2026")
- Institución responsable (nombre de `institutions` o perfil del creador)
- Sprint de incorporación (campo editorial — solo para Biblioteca Oficial, no visible en fichas de usuario)

---

## 5. Navegación contextual

### Zona de descubrimiento de catálogo

Aparece debajo del cuerpo principal, a ancho completo.
Tres bloques en retícula horizontal.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Más obras de Calderón de la Barca                            │  ← Bloque 1
│  ─────────────────────────────────                            │
│  [El alcalde de Zalamea] [La dama duende] [El gran teatro...] │
│                                                               │
│  Teatro clásico — Otras obras del género                      │  ← Bloque 2
│  ─────────────────────────────────                            │
│  [obras del mismo género]                                     │
│                                                               │
│  Últimas incorporaciones a la Biblioteca                      │  ← Bloque 3
│  ─────────────────────────────────                            │
│  [últimas 3 obras incorporadas]                               │
│                                                               │
└────────────────────────────────────────────────────────────────┘
```

### 5.1 Más obras del autor

Query: `works WHERE author = obra.author AND id != obra.id AND is_published = true`
Límite: 3 tarjetas.
Si no hay más obras del mismo autor: el bloque no aparece.
Cuando exista tabla de autores, la query usará `author_id` en lugar de texto.

### 5.2 Obras del mismo género

Query: `works WHERE genre = obra.genre AND id != obra.id AND is_published = true`
Límite: 3 tarjetas.
Excluye la obra actual.
Si no hay obras del mismo género: el bloque no aparece.

### 5.3 Últimas incorporaciones

Query: `works WHERE is_published = true AND id != obra.id ORDER BY created_at DESC LIMIT 3`
Siempre visible si hay al menos 1 obra más en la Biblioteca.
Título: "Últimas incorporaciones a la Biblioteca" (solo si `is_library_work = true`).
Para obras de usuario: "Otras obras publicadas".

### Tarjeta de navegación

Cada bloque usa una versión compacta de la tarjeta `bib-card`:

```
┌──────────────────────┐
│ Teatro clásico       │  ← género en rojo
│ La dama duende       │  ← título en serif
│ Calderón · 1629      │  ← autor y año en muted
│              →       │  ← flecha
└──────────────────────┘
```

---

## 6. Suscripciones — Mapa de acceso por plan

La siguiente tabla define qué contenido es accesible según el nivel de suscripción.
**Esta sección es únicamente una definición funcional** — no se implementan restricciones todavía.

| Contenido | Sin registro | Gratuito | Premium | Destacado | Empresas |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Cabecera completa (título, autor, año, género) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sinopsis corta (`synopsis_short`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Datos técnicos (duración, personajes, idioma, país) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Estado de derechos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fuente documental | ✅ | ✅ | ✅ | ✅ | ✅ |
| Navegación contextual (relacionadas) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Premios y reconocimientos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sinopsis completa (`synopsis_full`) | — | ✅ | ✅ | ✅ | ✅ |
| Contexto histórico | — | ✅ | ✅ | ✅ | ✅ |
| Curiosidades | — | ✅ | ✅ | ✅ | ✅ |
| Estructura de la obra | — | ✅ | ✅ | ✅ | ✅ |
| Descarga PDF (`public_download`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Descarga PDF (`premium_download`) | — | — | ✅ | ✅ | ✅ |
| Notas editoriales | — | — | ✅ | ✅ | ✅ |
| Ediciones de referencia | — | — | ✅ | ✅ | ✅ |
| Representaciones destacadas | — | — | ✅ | ✅ | ✅ |
| Adaptaciones | — | — | ✅ | ✅ | ✅ |
| Solicitud de derechos de representación | — | — | — | ✅ | ✅ |
| Contacto directo con gestor de derechos | — | — | — | ✅ | ✅ |
| Descarga materiales de producción | — | — | — | — | ✅ |

**Excepciones importantes:**
- Las obras con `access_type = 'public_download'` y `rights_status = 'public_domain'` permiten descarga sin registro bajo ningún concepto, independientemente del plan. Es un compromiso editorial con el dominio público.
- El contenido editorial (bloques C–I) solo aplica a obras de la Biblioteca Oficial. Las obras de usuario no tienen estos bloques en la ficha pública.

---

## 7. Responsive

### Desktop (≥ 1024px) — diseño principal

```
[TopNav]
────────────────────────────────────────────────────────────
Breadcrumb

Eyebrow
Título h1 grande
Subtítulo
Autor · Año · País
────────────────────────────────────────────────────────────
│  Columna principal (65%)     │  Sidebar (35%, sticky top)  │
│                              │                              │
│  Sinopsis corta              │  ┌──────────────────────┐   │
│  [Leer más →]                │  │  DATOS TÉCNICOS      │   │
│                              │  │  Duración    120 min │   │
│  [Imagen de portada]         │  │  Personajes    3–8   │   │
│                              │  │  Idioma    Español   │   │
│  Contexto histórico          │  │  País        España  │   │
│  Sinopsis completa           │  └──────────────────────┘   │
│  Notas editoriales           │                              │
│  Ediciones de referencia     │  ┌──────────────────────┐   │
│  Representaciones            │  │  DERECHOS            │   │
│  Adaptaciones                │  │  ● Dominio público   │   │
│  Curiosidades                │  │  Biblioteca Oficial  │   │
│                              │  └──────────────────────┘   │
│                              │                              │
│                              │  ┌──────────────────────┐   │
│                              │  │  RECURSOS            │   │
│                              │  │  [↓ Descargar PDF]   │   │
│                              │  │  [→ Fuente]          │   │
│                              │  └──────────────────────┘   │
│                              │                              │
────────────────────────────────────────────────────────────
Más obras del autor    (3 tarjetas)
Obras del mismo género (3 tarjetas)
Últimas incorporaciones (3 tarjetas)
────────────────────────────────────────────────────────────
[Footer]
```

El sidebar es **`position: sticky; top: 24px`** en desktop.
La columna principal hace scroll; el sidebar permanece visible.

---

### Tablet (768px – 1023px)

- Cabecera: igual que desktop, full-width
- Cuerpo: **una sola columna**
  - Sinopsis primero
  - Datos técnicos (grid 2×2) inmediatamente después
  - Bloque de derechos
  - Bloque de recursos
  - Bloques editoriales
- Navegación contextual: grid de 2 columnas (se omite la tercera tarjeta si no hay espacio)
- El sidebar sticky desaparece; todo el contenido se apila en orden lógico

---

### Móvil (< 768px)

- **Cabecera:** título en cuerpo reducido (`clamp(26px, 8vw, 36px)`). Autor y año en una línea compacta.
- **Sinopsis corta:** 4 líneas visibles, expandible con "Leer más".
- **Datos técnicos:** grid `2×2` compacto.
- **Recursos:** botón de descarga a ancho completo. Fuente como enlace de texto.
- **Derechos:** indicador y texto en una línea.
- **Bloques editoriales:** acordeón opcional (expandir/contraer por bloque) para no saturar la pantalla.
- **Navegación:** scroll horizontal (`overflow-x: auto`) para las tarjetas de obras relacionadas.
- **No hay sidebar** — todo el contenido se apila en columna única.

---

## Resumen de campos del schema por zona

| Zona | Campos utilizados |
|------|------------------|
| Cabecera | `title`, `subtitle`, `author`, `year`, `country_code`, `genre` |
| Sinopsis | `synopsis_short`, `synopsis_full`, `synopsis` (legacy fallback) |
| Datos técnicos | `duration_minutes`, `cast_size_min`, `cast_size_max`, `min_age`, `language`, `genre`, `secondary_genres` |
| Derechos | `rights_status`, `rights_manager`, `institution_id → institutions.name` |
| Recursos | `work_files`, `access_type`, `source_name`, `source_url` |
| Navegación | `author`, `genre`, `created_at`, `slug` |
| Metadata | `created_at`, `institution_id`, `profile_id` |

**Campos en schema pero no usados en la ficha actual** (a incorporar en OA-1.4):
`subtitle`, `synopsis_short`, `synopsis_full`, `secondary_genres`, `country_code`, `rights_status`, `rights_manager`, `cover_image_url`, `source_name`, `source_url`

**Campos que requieren nuevas tablas o columnas** (para bloques editoriales futuros):
`historical_context`, `structure_notes`, `editorial_notes`, tabla `work_editions`, tabla `work_productions`, tabla `work_awards`, `adaptations`, `curiosities`

---

## Diferencias entre ficha de Biblioteca y ficha de Usuario

La misma ruta `/obras/[slug]` sirve ambos tipos de obra. La ficha se adapta:

| Elemento | Obra Biblioteca (`is_library_work = true`) | Obra de Usuario |
|----------|-------------------------------------------|----------------|
| Eyebrow | Género + contexto histórico | Solo género |
| Autor | Texto plano (futuro: enlace a ficha de autor) | Enlace a `/perfil/[slug]` si existe |
| Pie "creada por" | "Biblioteca Oficial ObrasDeTeatro®" | Nombre del autor registrado |
| Bloques editoriales | Contexto, notas, ediciones, representaciones | No aparecen |
| Estado de derechos | Visible y detallado | Simplificado o no visible |
| Fecha | Año histórico de la obra | Fecha de subida a la plataforma |
| Recursos | PDF de dominio público / fuente | PDF del autor (si lo sube) |

---

## Pendiente de decisión antes de implementar

Los siguientes puntos requieren resolución editorial o técnica antes de iniciar OA-1.4:

1. **¿Se añaden los bloques editoriales (C–I) como nuevas columnas en `works`?**
   Alternativa: tabla separada `work_editorial_content` con tipo de bloque y contenido (más flexible).

2. **¿Qué campos del schema son obligatorios para publicar una obra en la Biblioteca?**
   Actualmente solo `title`, `slug`, `is_published`. Propuesta: requerir también `synopsis_short`, `genre`, `year`, `rights_status`.

3. **¿Se implementa el acordeón en bloques editoriales móviles?**
   Implica un Client Component mínimo en lo que es actualmente un Server Component puro.

4. **¿La imagen de portada viene de Storage de Supabase o de URL externa?**
   El campo `cover_image_url` es un `text` libre, pero la Biblioteca debería usar Supabase Storage para control editorial.

5. **¿El buscador desde la ficha (filtrar por mismo autor o género) es una navegación simple o una búsqueda con parámetros URL?**
   Definir antes de implementar el bloque de navegación contextual.

---

*Diseño funcional aprobable — sin implementación.*
*Siguiente paso: aprobación de esta propuesta y autorización de Sprint OA-1.4.*
