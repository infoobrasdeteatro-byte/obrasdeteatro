import { clienteAnonimo } from '@/lib/supabase/anonimo'
import { funcionesFuturas, resumenEntradas, type ResumenEntradas } from './datos'
import { agruparPorEspectaculo, type FichaListado } from './listado'

/** Espectáculos que enseña la «Programación» de una sala, como mucho. */
export const MAX_PROGRAMACION = 20

/**
 * Programación de una sala de Espacios escénicos: los espectáculos publicados
 * con funciones próximas en ella, por fecha. Cliente anónimo (la ficha se
 * cachea 10 minutos y debe enseñar lo que ve cualquiera). Si falla, vacía.
 */
export async function programacionDeSala(espacioId: string, ahora: number):
  Promise<{ fichas: FichaListado[]; entradas: Map<string, ResumenEntradas> }> {
  try {
    const supabase = clienteAnonimo()
    const fichas = agruparPorEspectaculo(await funcionesFuturas(supabase, ahora, { espacioId })).slice(0, MAX_PROGRAMACION)
    return { fichas, entradas: await resumenEntradas(supabase, fichas.map(f => f.id)) }
  } catch {
    return { fichas: [], entradas: new Map() }
  }
}
