# AUDITORÍA DE ESTADO — 02-10-2026

**Proyecto:** ObrasDeTeatro®
**Fecha de la auditoría:** 2026-10-02
**Estado de `main` al auditar:** `cdde204` (igual que `origin/main`), más el commit de este documento
**Alcance:** comprobación del estado de obrasdeteatro.com antes de pasar a otra fase: git, build y tests, despliegue, variables de entorno, pendientes técnicos y herramientas. Recoge también lo ejecutado hoy (PR #50, #51 y #52). Documento de constancia: no autoriza nada ni sustituye a ninguna acta.

Las horas son las de los commits en `main` (hora de Europa/Londres, UTC+1).

---

## 1. Resumen

| # | Punto | Estado |
|---|---|---|
| 1 | Git | Correcto, con dos observaciones: un `stash` de julio y 43 ramas locales históricas (§3) |
| 2 | Build y tests | Correcto |
| 3 | Despliegue en producción | Correcto: refleja `cdde204` y los tres arreglos de hoy |
| 4 | Variables de entorno | Correcto: no falta ninguna obligatoria |
| 5 | Pendientes técnicos | Siete abiertos, ninguno urgente (§8) |
| 6 | Herramientas y accesos | Correcto: `gh` con sesión, Vercel CLI sin sesión |

## 2. PR fusionados hoy

Los tres se fusionaron por squash desde GitHub web, sin acta (cambios visuales menores). Solo tocan `app/globals.css`.

| PR | Commit en `main` | Hora | Qué | Estado final |
|---|---|---|---|---|
| #50 | `079eea2` | 12:31 | Desborde de la barra de navegación entre 769 y ~1281px | En producción |
| #51 | `37ca2c8` | 13:01 | Rediseño de la rejilla de indicadores del hero en móvil | En producción |
| #52 | `cdde204` | 13:28 | Contraste AA en las etiquetas de los indicadores móviles | En producción |

Las ramas `fix/navbar-overflow-769`, `fix/indicadores-movil-diseno` y `fix/contraste-indicadores-movil` están borradas en GitHub y en local.

- **#50.** La barra de escritorio, un masthead de dos filas con alto fijo de 112px, se activaba desde 769px, pero su segunda fila necesitaba ~1282px. Por debajo de ese ancho, los botones de sesión caían a una tercera fila fuera de la barra; entre 769 y 1031px, además, los enlaces desbordaban la página. Solución:
  - los botones de sesión suben a la fila del logotipo;
  - la barra completa se activa desde 1100px;
  - por debajo, se usa la hamburguesa (`max-width: 1099px`).
- **#51.** La rejilla 2×2 estaba descentrada (15, 23 y 43px a 375, 390 y 430px) y mezclaba valores en rojo y en blanco. Se eligió, entre tres opciones maquetadas, la rejilla centrada con filetes en cruz y los valores en blanco a 22px. Además:
  - en móvil se oculta la línea de microcopy, redundante con las etiquetas;
  - se elimina la regla de 480px que anulaba el tamaño de los valores.
- **#52.** Las etiquetas pasan del 55% al 65% de opacidad. El peor píxel medido bajo una etiqueta sube de 4,20:1 a 5,16:1, y en la zona completa de la rejilla queda en ≥4,95:1 en 7 tamaños de móvil.

## 3. Git

- `main` está en `cdde204`, igual que `origin/main`, sin cambios sin confirmar.
- Worktrees: el principal en `main`, más `_aec003-fase5` (`547c0cc`) y `_scenaia-003-replay` (`345d89e`), ambos en detached HEAD y de otros trabajos. No se tocan.
- **`stash@{0}`, del 19-07-2026 (17:14):** *«snapshot completo (Conjunto A + B/C) antes de preparar rama de despliegue scenaia-bloque-3»*. Son 5 archivos y +246 líneas, entre ellos `types/supabase.ts` y `lib/repository-layer/index.ts`. Coincide con la fecha del incidente de trazabilidad de ScenaIA. **Pendiente de revisión por Dirección; sin acción por ahora.** No se aplica ni se borra.
- **43 ramas locales además de `main`**, todas de trabajos anteriores (ScenaIA, Stripe, castings). Ninguna tiene commits sin subir. La única que solo existía en local, `backup/scenaia-bloque-3-pre-reconciliacion` (`a1ad1d2`, 12-09-2026), **se ha subido hoy a GitHub como respaldo remoto**, sin otros cambios. La limpieza de ramas queda para una tarea aparte.

## 4. Build y tests

Sobre `cdde204`:

| Comprobación | Resultado |
|---|---|
| `vitest run` | 153 archivos, 2104/2104 tests correctos |
| `tsc --noEmit` | 0 errores |
| `next lint` | 0 errores; 29 avisos, todos previos (variables sin usar) |
| `next build` | Correcto |

## 5. Despliegue en producción

- El último despliegue de Production registrado en GitHub es `cdde204`, creado a las 13:29 en estado *success*. Los anteriores son los de `37ca2c8` y `079eea2`.
- Comprobado en el CSS público que sirve www.obrasdeteatro.com:
  - **#50:** existen las reglas `min-width: 1100px` y `max-width: 1099px`, y ya no queda ninguna regla `min-width: 769px`.
  - **#51:** `.hero-microcopy { display: none }` en móvil y la rejilla con `max-width: 320px; margin: 0 auto`.
  - **#52:** la etiqueta móvil va en `#ffffffa6` (0,65). La de escritorio sigue en `#ffffff6b` (0,42): ver §8.1.
- `obrasdeteatro.com` redirige a `www.obrasdeteatro.com`.

## 6. Variables de entorno

Nombres y entornos listados con `vercel env ls`, sin descifrar ningún valor.

| Variable | Production | Preview | Nota |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | |
| `NEXT_PUBLIC_APP_URL` | ✓ | ✓ | |
| `STRIPE_SECRET_KEY` | ✓ | ✓ | |
| `STRIPE_WEBHOOK_SECRET` | ✓ | ✓ | |
| `STRIPE_PRICE_PREMIUM_ID` | ✓ | ✓ | Una entrada por entorno |
| `STRIPE_PRICE_EMPRESAS_ID` | ✓ | ✓ | Una entrada por entorno |
| `STRIPE_PRICE_DESTACADO_ID` | ✓ | ✓ | Una entrada por entorno |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✓ | ✓ | La clave real (24 caracteres, `0x4…`) va en el JS público de `/auth/registro` |
| `TURNSTILE_SECRET_KEY` | ✓ | ✓ | |
| `OPENAI_API_KEY` | ✓ | ✓ | |
| `RESEND_API_KEY` | ✓ | ✓ | |
| `SCENAIA_PAGINACION_ENABLED` | ✓ | — | Interruptor; apagado si no existe |
| `SCENAIA_GENERO_SQL_ENABLED` | ✓ | — | Interruptor; apagado si no existe |
| `SCENAIA_EPOCA_ENABLED` | ✓ | — | Interruptor; apagado si no existe |
| `SCENAIA_STREAMING` | — | — | Interruptor; sin la variable, el streaming está apagado |
| `STRIPE_PORTAL_ENABLED` | — | — | Interruptor; sin la variable, el portal de cliente está apagado |
| `STRIPE_PORTAL_CONFIGURATION_ID` | — | — | Solo se usa con el portal encendido |
| `OPENAI_MODEL` | — | — | Opcional; tiene modelo por defecto en el código |

Conclusión: las 13 variables obligatorias existen en Production y en Preview, incluidas las dos de Turnstile. Queda resuelto así el pendiente de SEC-001 sobre Turnstile en Preview. Las otras 7 son interruptores u opcionales.

Observaciones, sin acción:

- Los tres interruptores de ScenaIA están solo en Production. En Preview esas funciones van apagadas, así que ScenaIA no se comporta igual en un preview que en producción.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está definida en Vercel pero el código actual no la usa. No es un problema.

## 7. Herramientas y accesos

- **GitHub CLI** (`gh` 2.102.0), instalado hoy con winget desde el MSI oficial, con el hash verificado. Tiene sesión iniciada como `infoobrasdeteatro-byte`, con el token en el almacén de credenciales de Windows y los permisos `repo`, `read:org` y `gist`. Su permiso sobre el repositorio es ADMIN. A partir de ahora los PR se pueden crear con `gh pr create`.
- **Vercel CLI: sin sesión.** Se inició sesión de forma puntual para cada preview y para listar las variables de esta auditoría, y se cerró cada vez con `vercel logout`, verificado con `vercel whoami`.
- **`.env.local`:** se añadieron las claves de prueba públicas de Cloudflare Turnstile (`1x0…AA`), que siempre validan y solo sirven para desarrollo local. `/auth/registro` ya funciona en local sin variables extra. Las claves reales siguen solo en Vercel.

## 8. Pendientes técnicos

No abordados; solo se deja constancia.

1. **Contraste de las etiquetas de los indicadores en escritorio.** Siguen en blanco al 42% (~4:1, por debajo de AA 4,5:1). El #52 solo corrigió móvil.
2. **Fuentes alojadas en el repositorio** (`next/font/local`), para que el build no dependa de la disponibilidad de Google Fonts (ver el §4 del cierre del 01-10-2026).
3. **Scroll horizontal a ~769px en `/precios` y en `/obras`.** `.precios-card` se sale 9px y `.bib-contenido`, 28px. Ya existía; quedó al descubierto con el #50 cuando desapareció el desborde de la barra.
4. **Zona clicable del logotipo en escritorio.** Con el `flex: 1` del #50, todo el hueco vacío de la primera fila lleva a la portada. Se arregla quitando `flex: 1`, sin cambio visual, porque `.nav-right` ya tiene `margin-left: auto`.
5. **Isotipo de la cabecera a 28px.** Con `translateY(-0.12em)` queda 0,5px por encima del centro de la tinta; lo exacto sería `-0.10em`. A 15px (móvil) es correcto.
6. **`STRIPE_WEBHOOK_SECRET` duplicada en `.env.local`.** Solo afecta a local.
7. **Verificaciones pendientes:**
   - capturas de `update-password` y `verificacion` (#48), que necesitan una sesión real;
   - la barra con una sesión iniciada real (#50), que se validó solo con una simulación en el DOM.

Resueltos hoy del cierre del 01-10-2026:

- el pulido de los indicadores móviles (#51 y #52);
- el desborde de la barra (#50);
- la instalación de `gh`;
- el cierre de la sesión de Vercel CLI;
- la clave de Turnstile en local.
