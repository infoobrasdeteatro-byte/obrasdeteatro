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

/** URL del login que, al terminar, devuelve a `next` (si es una ruta interna válida). */
export function loginUrlWithNext(next: string): string {
  const destino = safeNextPath(next)
  return destino === null ? '/auth/login' : `/auth/login?next=${encodeURIComponent(destino)}`
}
