/**
 * Títulos, descripciones y datos estructurados de las fichas públicas, para
 * los resultados de los buscadores. Funciones puras: reciben los datos ya
 * leídos y devuelven texto.
 *
 * Criterios:
 * - El título identifica la página por sí solo (no «Convocatoria» a secas) y
 *   termina con la marca, «ObrasDeTeatro®», si cabe en lo que Google muestra.
 * - La descripción dice qué hay en la página con sus datos reales. No promete
 *   nada que la ficha no tenga.
 */
export const MARCA = 'ObrasDeTeatro®'
/** Lo que un buscador suele mostrar sin cortar. */
export const MAX_TITULO = 65
export const MAX_DESCRIPCION = 160

/** Corta por palabra y añade «…» si no cabe. */
export function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= max) return limpio
  const corte = limpio.slice(0, max - 1)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,;:.·—-]+$/, '')}…`
}

/** Añade la marca solo si el título completo cabe. */
export function conMarca(titulo: string, seccion?: string): string {
  const largo = seccion ? `${titulo} | ${seccion} · ${MARCA}` : `${titulo} | ${MARCA}`
  if (largo.length <= MAX_TITULO) return largo
  const corto = `${titulo} | ${MARCA}`
  return corto.length <= MAX_TITULO ? corto : recortar(titulo, MAX_TITULO)
}

// ── Biblioteca ──────────────────────────────────────────────────────────────

export type ObraSeo = {
  title: string
  author: string | null
  genre: string | null
  year: number | null
  rights_status: string | null
  sinopsis: string | null
}

export const esAnonimo = (autor: string | null) => !autor?.trim() || /^an[oó]nim[oa]/i.test(autor.trim())

export function tituloObra(o: Pick<ObraSeo, 'title' | 'author'>): string {
  const base = esAnonimo(o.author) ? `${o.title} (anónimo)` : `${o.title} · ${o.author!.trim()}`
  const completo = `${base} | ${MARCA}`
  if (completo.length <= MAX_TITULO) return completo
  return base.length <= MAX_TITULO ? base : recortar(base, MAX_TITULO)
}

/** «Teatro» es el género genérico del catálogo: se dice «obra de teatro». */
function tipoDeObra(genero: string | null): string {
  const g = genero?.trim()
  return !g || g.toLowerCase() === 'teatro' ? 'obra de teatro' : g.toLowerCase()
}

export function descripcionObra(o: ObraSeo): string {
  if (o.sinopsis?.trim()) return recortar(o.sinopsis, MAX_DESCRIPCION)
  const autoria = esAnonimo(o.author) ? 'de autor anónimo' : `de ${o.author!.trim()}`
  const anio = o.year ? ` (${o.year})` : ''
  const acceso = o.rights_status === 'public_domain'
    ? 'Texto completo de libre acceso, en dominio público, en'
    : 'Ficha, datos y derechos en'
  // El título va al principio y es lo único que se recorta si no cabe.
  const resto = `: ${tipoDeObra(o.genre)} ${autoria}${anio}. ${acceso} la biblioteca de ${MARCA}.`
  return `«${recortar(o.title, Math.max(20, MAX_DESCRIPCION - resto.length - 2))}»${resto}`
}

/** schema.org/Play. Sin autor cuando es anónima: no se inventa una persona. */
export function jsonLdObra(
  o: ObraSeo & { slug: string; idioma?: string | null },
  sitio: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Play',
    name: o.title,
    url: `${sitio}/obras/${encodeURIComponent(o.slug)}`,
    ...(esAnonimo(o.author) ? {} : { author: { '@type': 'Person', name: o.author!.trim() } }),
    ...(o.genre ? { genre: o.genre } : {}),
    ...(o.idioma ? { inLanguage: o.idioma } : {}),
    ...(o.year ? { datePublished: String(o.year) } : {}),
    ...(o.sinopsis?.trim() ? { description: recortar(o.sinopsis, 300) } : {}),
    ...(o.rights_status === 'public_domain' ? { isAccessibleForFree: true } : {}),
  }
}

// ── Convocatorias ───────────────────────────────────────────────────────────

export type ConvocatoriaSeo = {
  title: string
  categoria: string | null
  entidad: string | null
  lugar: string | null
  /** Fecha límite ya formateada («23 nov 2026») o null. */
  plazo: string | null
  dotacion: string | null
}

export const tituloConvocatoria = (c: Pick<ConvocatoriaSeo, 'title'>) => conMarca(c.title, 'Convocatorias')

export function descripcionConvocatoria(c: ConvocatoriaSeo): string {
  const tipo = c.categoria ? `${c.categoria}` : 'Convocatoria'
  const partes = [
    `${tipo}.`,
    // «Convoca:» evita concordar el género con cada tipo (beca, premio, ayuda…).
    c.entidad ? `Convoca: ${c.entidad}${c.lugar ? ` (${c.lugar})` : ''}.` : c.lugar ? `${c.lugar}.` : null,
    c.plazo ? `Plazo hasta el ${c.plazo}.` : null,
    c.dotacion ? `Dotación: ${c.dotacion}.` : null,
    'Bases y enlace oficial.',
  ].filter(Boolean)
  return recortar(partes.join(' '), MAX_DESCRIPCION)
}

// ── Portada ─────────────────────────────────────────────────────────────────

export function jsonLdSitio(sitio: string, redes: string[]): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: MARCA,
      alternateName: 'obrasdeteatro.com',
      url: sitio,
      logo: `${sitio}/icons/app-512.png`,
      ...(redes.length ? { sameAs: redes } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: MARCA,
      url: sitio,
      inLanguage: 'es',
    },
  ]
}
