/**
 * HTML de un correo recibido: se guarda tal cual y solo se muestra saneado,
 * dentro de un iframe aislado. Dos capas:
 *
 * 1. sanearHtml(): quita scripts, formularios, marcos, objetos, metadatos,
 *    manejadores on…, enlaces javascript:/data: y la carga automática de
 *    imágenes externas (solo se dejan las incrustadas como data:image).
 * 2. documentoAislado(): lo envuelve con una política de seguridad que no
 *    deja cargar nada de fuera ni ejecutar nada, para el atributo srcdoc de un
 *    iframe con sandbox sin scripts, sin formularios y sin mismo origen.
 *
 * Aunque la primera capa fallara con un HTML retorcido, la segunda impide que
 * se ejecute o cargue algo. Nunca se inserta en la página.
 */

/** Elementos que se quitan con todo su contenido. */
const CON_CONTENIDO = ['script', 'noscript', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'template', 'svg', 'math', 'select', 'textarea', 'button']
/** Elementos de los que se quita solo la etiqueta (el texto de dentro se queda). */
const SOLO_ETIQUETA = ['form', 'input', 'option', 'optgroup', 'link', 'meta', 'base', 'html', 'head', 'body', 'title']

const ESQUEMA_PELIGROSO = /^\s*(javascript|vbscript|data|file):/i

function limpiarAtributos(etiqueta: string): string {
  return etiqueta
    // Manejadores de eventos (onclick, onload…), con o sin comillas.
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Atributos que cargan o envían algo.
    .replace(/\s+(srcset|formaction|action|ping|background|xlink:href|poster|lowsrc|dynsrc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Enlaces a esquemas peligrosos.
    .replace(/\s+href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, _v, d, s, n) =>
      ESQUEMA_PELIGROSO.test(d ?? s ?? n ?? '') ? '' : m)
    // Imágenes externas: no se cargan solas (rastreo); se deja constancia.
    .replace(/\s+src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, _v, d, s, n) =>
      /^\s*data:image\//i.test(d ?? s ?? n ?? '') ? m : ' data-imagen-externa="bloqueada"')
    // url(...) y expression(...) dentro de style="…".
    .replace(/\s+style\s*=\s*("([^"]*)"|'([^']*)')/gi, (_m, _v, d, s) => {
      const css = (d ?? s ?? '').replace(/url\s*\([^)]*\)/gi, 'none').replace(/expression\s*\([^)]*\)/gi, '')
      return ` style="${css.replace(/"/g, '&quot;')}"`
    })
}

export function sanearHtml(html: string | null | undefined): string {
  if (!html) return ''
  let s = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const t of CON_CONTENIDO) {
    s = s.replace(new RegExp(`<${t}\\b[\\s\\S]*?</${t}\\s*>`, 'gi'), '')
    s = s.replace(new RegExp(`<${t}\\b[^>]*>`, 'gi'), '') // sin cierre
  }
  for (const t of SOLO_ETIQUETA) s = s.replace(new RegExp(`</?${t}\\b[^>]*>`, 'gi'), '')
  // url() en bloques <style>.
  s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_m, a, css: string, b) =>
    a + css.replace(/url\s*\([^)]*\)/gi, 'none').replace(/@import[^;]*;?/gi, '') + b)
  // Atributos de todas las etiquetas que quedan.
  return s.replace(/<[a-z][a-z0-9-]*\b[^>]*>/gi, limpiarAtributos)
}

/** Política del documento del iframe: nada de fuera, nada ejecutable. */
export const CSP_CORREO = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'"

/** sandbox del iframe: sin scripts, formularios ni mismo origen; los enlaces abren pestaña nueva. */
export const SANDBOX_CORREO = 'allow-popups allow-popups-to-escape-sandbox'

export function documentoAislado(html: string | null | undefined): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP_CORREO}">`
    + '<base target="_blank"><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;font-size:14px;color:#1a1a1a;word-wrap:break-word}img{max-width:100%;height:auto}'
    + '[data-imagen-externa]{display:inline-block;min-width:16px;min-height:16px;background:#f4f4f4}</style></head><body>'
    + sanearHtml(html)
    + '</body></html>'
}
