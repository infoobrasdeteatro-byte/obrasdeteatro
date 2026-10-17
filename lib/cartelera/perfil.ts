import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { cartelValido } from './cartelera'
import { MARGEN_EMPEZADA_MS, agruparPorEspectaculo, type FichaListado, type FuncionListado } from './listado'

/**
 * Espectáculos en el perfil público de quien los publica: «En cartel» (con
 * funciones próximas) y «Anteriores» (terminados). Solo publicados o
 * finalizados, con filtro explícito: la página del perfil usa la sesión de
 * quien visita y la RLS le dejaría ver al dueño sus borradores.
 */

export const MAX_ANTERIORES = 12

export type FilaEspectaculoPerfil = {
  id: string; slug: string; titulo: string; compania_nombre: string; cartel_url: string | null
  genero_id: string; user_id: string; estado: string
  funciones: { id: string; inicio: string; zona_horaria: string; ciudad: string | null; pais_code: string | null
    lugar_nombre: string | null; espacio_id: string | null; estado: string }[]
}

export type EspectaculoAnterior = {
  id: string; slug: string; titulo: string; cartel_url: string | null; genero_id: string
  /** Última función (para el año y el orden). */
  ultima: string | null
  ciudades: string[]
}

export function repartirEspectaculos(filas: FilaEspectaculoPerfil[], ahora: number):
  { enCartel: FichaListado[]; anteriores: EspectaculoAnterior[] } {
  const futuras: FuncionListado[] = []
  const anteriores: EspectaculoAnterior[] = []
  for (const e of filas) {
    const { funciones, estado, ...datos } = e
    const proximas = estado === 'publicado'
      ? funciones.filter(f => f.estado !== 'cancelada' && new Date(f.inicio).getTime() > ahora - MARGEN_EMPEZADA_MS)
      : []
    if (proximas.length > 0) {
      for (const f of proximas) futuras.push({ ...f, espectaculo: datos })
      continue
    }
    const hechas = funciones.filter(f => f.estado !== 'cancelada')
    anteriores.push({
      id: e.id, slug: e.slug, titulo: e.titulo, cartel_url: e.cartel_url, genero_id: e.genero_id,
      ultima: hechas.reduce<string | null>((m, f) => (m === null || f.inicio > m ? f.inicio : m), null),
      ciudades: [...new Set(hechas.map(f => f.ciudad).filter((c): c is string => Boolean(c)))],
    })
  }
  futuras.sort((a, b) => a.inicio.localeCompare(b.inicio))
  anteriores.sort((a, b) => (b.ultima ?? '').localeCompare(a.ultima ?? ''))
  return { enCartel: agruparPorEspectaculo(futuras), anteriores: anteriores.slice(0, MAX_ANTERIORES) }
}

export async function espectaculosDelPerfil(supabase: SupabaseClient<Database>, userId: string, ahora: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const { data } = await supabase
    .from('espectaculos')
    .select('id, slug, titulo, compania_nombre, cartel_url, genero_id, user_id, estado, funciones(id, inicio, zona_horaria, ciudad, pais_code, lugar_nombre, espacio_id, estado)')
    .eq('user_id', userId)
    .in('estado', ['publicado', 'finalizado'])
    .limit(200)
  const filas: FilaEspectaculoPerfil[] = (data ?? []).map(e => ({
    ...e, cartel_url: cartelValido(e.cartel_url, supabaseUrl, e.user_id), funciones: e.funciones ?? [],
  }))
  return repartirEspectaculos(filas, ahora)
}
