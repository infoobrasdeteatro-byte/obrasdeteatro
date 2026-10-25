import { clienteAnonimo } from '@/lib/supabase/anonimo'
import { funcionesFuturas, resumenEntradas, destacadosHoy, type ResumenEntradas } from './datos'
import { agruparPorEspectaculo, type FichaListado, type FuncionListado } from './listado'
import { ordenPortada } from './destacados'
import { cartelValido } from './cartelera'
import { repartirEspectaculos, type EspectaculoAnterior, type FilaEspectaculoPerfil } from './perfil'

/** Carteles que enseña la franja «En cartel» de la portada. */
export const MAX_PORTADA = 8
/** Sin funciones próximas, la franja enseña los últimos espectáculos ya celebrados. */
export const MAX_ANTERIORES_PORTADA = 4

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
export async function enCartelPortada(ahora: number):
  Promise<{ fichas: FichaListado[]; entradas: Map<string, ResumenEntradas>; destacados: Set<string>; anteriores: EspectaculoAnterior[] }> {
  try {
    const supabase = clienteAnonimo()
    const [funciones, ambitos] = await Promise.all([funcionesFuturas(supabase, ahora), destacadosHoy(supabase, ahora)])
    // Destacados primero (como mucho 4; si hay más, rotan cada hora) y el resto por fecha.
    const semilla = new Date(ahora).toISOString().slice(0, 13)
    const { fichas, destacados } = ordenPortada(agruparPorEspectaculo(funciones), ambitos, semilla, MAX_PORTADA)
    const entradas = await resumenEntradas(supabase, fichas.map(f => f.id))
    // Sin funciones próximas, la franja no desaparece: enseña los últimos celebrados.
    const anteriores = fichas.length === 0 ? await anterioresPortada(supabase, ahora) : []
    return { fichas, entradas, destacados, anteriores }
  } catch {
    return { fichas: [], entradas: new Map(), destacados: new Set(), anteriores: [] }
  }
}

/** Últimos espectáculos publicados cuyas funciones ya pasaron (como mucho 4). */
async function anterioresPortada(supabase: ReturnType<typeof clienteAnonimo>, ahora: number): Promise<EspectaculoAnterior[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const { data } = await supabase
    .from('espectaculos')
    .select('id, slug, titulo, compania_nombre, cartel_url, genero_id, user_id, estado, funciones(id, inicio, zona_horaria, ciudad, pais_code, lugar_nombre, espacio_id, estado)')
    .in('estado', ['publicado', 'finalizado'])
    .order('updated_at', { ascending: false })
    .limit(40)
  const filas: FilaEspectaculoPerfil[] = (data ?? []).map(e => ({
    ...e, cartel_url: cartelValido(e.cartel_url, supabaseUrl, e.user_id), funciones: e.funciones ?? [],
  }))
  return repartirEspectaculos(filas, ahora).anteriores
    .filter(a => a.ultima !== null)
    .slice(0, MAX_ANTERIORES_PORTADA)
}
