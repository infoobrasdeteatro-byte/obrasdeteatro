/**
 * Parámetro `next` del login: a dónde volver después de iniciar sesión.
 *
 * Solo se aceptan rutas internas ("/precios", "/precios?plan=premium"). Un
 * `next` que apunte fuera del sitio convertiría el login en una redirección
 * abierta: un enlace de obrasdeteatro.com que, tras iniciar sesión, llevara a
 * otra web. Por eso se rechazan las URL absolutas y las que el navegador
 * interpretaría como otro dominio ("//otro.com", "/\otro.com").
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  if (tieneCaracteresDeControl(value)) return null
  return value
}

/**
 * Caracteres de control (códigos 0-31 y 127), incluidos tabuladores y saltos
 * de línea, que el navegador elimina al resolver una URL y que permitirían
 * disfrazar "//otro.com" como ruta interna.
 */
function tieneCaracteresDeControl(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const codigo = value.charCodeAt(i)
    if (codigo < 32 || codigo === 127) return true
  }
  return false
}

/** `path` con `?next=` añadido, solo si `next` es una ruta interna válida; si no, `path` tal cual. */
export function withNext(path: string, next: string | null | undefined): string {
  const destino = safeNextPath(next)
  return destino === null ? path : `${path}?next=${encodeURIComponent(destino)}`
}

/** URL del login que, al terminar, devuelve a `next` (si es una ruta interna válida). */
export function loginUrlWithNext(next: string): string {
  return withNext('/auth/login', next)
}

/**
 * Vuelta tras el REGISTRO. El registro no termina en el formulario sino al
 * confirmar el email, en /auth/callback, así que el `next` se guarda en una
 * cookie al registrarse y el callback la lee y la borra. No viaja en
 * `emailRedirectTo`: si la lista de URL permitidas de Supabase Auth no
 * admitiera parámetros, la confirmación del email dejaría de funcionar.
 * Si se confirma en otro navegador, no hay cookie y se usa el destino de
 * siempre.
 */
export const NEXT_TRAS_REGISTRO_COOKIE = 'odt_next_registro'
/** 24 h: lo que dura por defecto el enlace de confirmación de Supabase. */
export const NEXT_TRAS_REGISTRO_MAX_AGE_S = 60 * 60 * 24
