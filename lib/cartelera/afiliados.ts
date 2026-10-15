/**
 * Enlaces de afiliado de las ticketeras.
 *
 * Mientras no haya alta en un programa, el enlace sale tal cual. Cuando la
 * haya, se configura SIN desplegar código, con la variable de entorno
 * CARTELERA_AFILIADOS (JSON), por proveedor:
 *
 *   {"tomaticket": {"parametros": {"aff": "12345"}},
 *    "entradas_com": {"plantilla": "https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued={url}"}}
 *
 * «parametros» añade parámetros al enlace; «plantilla» lo envuelve en el
 * enlace de la red de afiliación ({url} = enlace original codificado).
 */

type ReglaAfiliado = { parametros?: Record<string, string>; plantilla?: string }
export type ConfigAfiliados = Record<string, ReglaAfiliado>

export function leerConfigAfiliados(json: string | undefined): ConfigAfiliados {
  if (!json) return {}
  try {
    const c = JSON.parse(json)
    return c && typeof c === 'object' && !Array.isArray(c) ? c : {}
  } catch {
    return {}
  }
}

export function enlaceAfiliado(url: string, proveedor: string, config: ConfigAfiliados): string {
  const regla = config[proveedor]
  if (!regla) return url
  let destino: URL
  try { destino = new URL(url) } catch { return url }
  if (destino.protocol !== 'https:' && destino.protocol !== 'http:') return url
  if (regla.parametros) {
    for (const [k, v] of Object.entries(regla.parametros)) destino.searchParams.set(k, String(v))
  }
  const final = destino.toString()
  if (regla.plantilla && regla.plantilla.startsWith('https://') && regla.plantilla.includes('{url}')) {
    return regla.plantilla.replace('{url}', encodeURIComponent(final))
  }
  return final
}
