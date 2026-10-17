import { clienteAnonimo } from '@/lib/supabase/anonimo'
import { funcionesFuturas, resumenEntradas, type ResumenEntradas } from './datos'
import { agruparPorEspectaculo, type FichaListado, type FuncionListado } from './listado'

/** Carteles que enseña la franja «En cartel» de la portada. */
export const MAX_PORTADA = 8

/**
 * Los espectáculos de la franja: los que tienen la función más cercana,
 * por orden de fecha y sin repetir (igual para todos, sin destacados de pago).
 */
export function seleccionPortada(funciones: FuncionListado[], max = MAX_PORTADA): FichaListado[] {
  return agruparPorEspectaculo(funciones).slice(0, max)
}

/**
 * Lectura para la portada con el cliente anónimo (sin cookies): la portada se
 * cachea 10 minutos y debe contar lo que ve un visitante sin cuenta. Si falla,
 * la franja no se pinta: nunca se rellena con nada.
 */
export async function enCartelPortada(ahora: number): Promise<{ fichas: FichaListado[]; entradas: Map<string, ResumenEntradas> }> {
  try {
    const supabase = clienteAnonimo()
    const fichas = seleccionPortada(await funcionesFuturas(supabase, ahora))
    const entradas = await resumenEntradas(supabase, fichas.map(f => f.id))
    return { fichas, entradas }
  } catch {
    return { fichas: [], entradas: new Map() }
  }
}
