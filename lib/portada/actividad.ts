import { COUNTRIES } from '@/lib/geo/countries'

/**
 * Actividad por país del mapa de la portada: lo que devuelve la rpc
 * actividad_por_pais, ordenado en los 20 países (todos, con ceros) y con el
 * enlace al listado filtrado de cada cosa. Sin dependencias de servidor: lo
 * usa también el componente de cliente del mapa.
 */

export const TIPOS_ACTIVIDAD = ['profesionales', 'castings', 'convocatorias', 'espacios', 'noticias'] as const
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number]

export type ActividadPais = { code: string; nombre: string; total: number } & Record<TipoActividad, number>

export const ETIQUETAS_ACTIVIDAD: Record<TipoActividad, string> = {
  profesionales: 'Profesionales',
  castings: 'Castings abiertos',
  convocatorias: 'Convocatorias abiertas',
  espacios: 'Espacios escénicos',
  noticias: 'Noticias (últimos 30 días)',
}

const CODIGO_DE_NOMBRE = new Map(COUNTRIES.map(c => [c.name, c.code]))

/** De las filas de la rpc (castings llega por nombre de país; el resto, por código) a los 20 países. */
export function agregarActividad(filas: { tipo: string; pais: string; total: number }[]): ActividadPais[] {
  const porPais = new Map<string, ActividadPais>(COUNTRIES.map(c => [c.code, {
    code: c.code, nombre: c.name, total: 0, profesionales: 0, castings: 0, convocatorias: 0, espacios: 0, noticias: 0,
  }]))
  for (const f of filas) {
    if (!(TIPOS_ACTIVIDAD as readonly string[]).includes(f.tipo)) continue
    const code = porPais.has(f.pais) ? f.pais : CODIGO_DE_NOMBRE.get(f.pais)
    const p = code ? porPais.get(code) : undefined
    if (!p) continue
    const n = Number(f.total) || 0
    p[f.tipo as TipoActividad] += n
    p.total += n
  }
  return [...porPais.values()]
}

/** Enlace al listado público de `tipo` filtrado por el país. */
export function enlaceActividad(tipo: TipoActividad, pais: { code: string; nombre: string }): string {
  switch (tipo) {
    case 'profesionales': return `/directorio?pais=${pais.code}`
    // El filtro de castings compara con el nombre guardado en castings.pais.
    case 'castings': return `/castings?pais=${encodeURIComponent(pais.nombre)}`
    case 'convocatorias': return `/convocatoria?pais=${pais.code}`
    case 'espacios': return `/espacios?pais=${pais.code}`
    case 'noticias': return `/noticias?pais=${pais.code}`
  }
}

/** País que se enseña al cargar: el de más actividad (España si no hay datos). */
export function paisInicial(lista: ActividadPais[] | null): string {
  if (!lista?.length) return 'ES'
  return lista.reduce((a, b) => (b.total > a.total ? b : a)).code
}
