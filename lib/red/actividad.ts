/**
 * «Última actividad» en la ficha. La base solo devuelve el tramo
 * (actividad_de): la fecha exacta nunca sale del servidor.
 */
export type TramoActividad = 'hoy' | 'semana' | 'mes' | 'antes'

const TEXTO: Record<TramoActividad, string> = {
  hoy: 'Última actividad: hoy',
  semana: 'Última actividad: esta semana',
  mes: 'Última actividad: este mes',
  antes: 'Última actividad: hace más de un mes',
}

export function textoActividad(tramo: string | null | undefined): string | null {
  return tramo && tramo in TEXTO ? TEXTO[tramo as TramoActividad] : null
}

/** Cookie que evita llamar a registrar_actividad en cada petición. */
export const COOKIE_ACTIVIDAD = 'odt_act'
export const SEGUNDOS_ACTIVIDAD = 3600
