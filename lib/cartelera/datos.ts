import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { cartelValido } from './cartelera'
import { MARGEN_EMPEZADA_MS, diaLocal, type FuncionListado } from './listado'

type Cliente = SupabaseClient<Database>

/**
 * Lecturas de la cartelera pública. Solo espectáculos publicados (el filtro
 * explícito evita que una sesión de moderación vea aquí lo que está en
 * revisión). El cartel solo se enseña si es de nuestro bucket y de la carpeta
 * de quien publica.
 */

/** Funciones próximas de espectáculos publicados; con `espacioId`, solo las de esa sala. */
export async function funcionesFuturas(supabase: Cliente, ahora: number, filtro: { espacioId?: string } = {}): Promise<FuncionListado[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  let consulta = supabase
    .from('funciones')
    .select('id, inicio, zona_horaria, ciudad, pais_code, lugar_nombre, espacio_id, estado, espectaculos!inner(id, slug, titulo, compania_nombre, cartel_url, genero_id, user_id, estado)')
    .eq('espectaculos.estado', 'publicado')
    .neq('estado', 'cancelada')
    .gte('inicio', new Date(ahora - MARGEN_EMPEZADA_MS).toISOString())
  if (filtro.espacioId) consulta = consulta.eq('espacio_id', filtro.espacioId)
  const { data } = await consulta.order('inicio', { ascending: true }).limit(3000)
  return (data ?? []).map(f => {
    const e = f.espectaculos
    return {
      id: f.id, inicio: f.inicio, zona_horaria: f.zona_horaria, ciudad: f.ciudad, pais_code: f.pais_code,
      lugar_nombre: f.lugar_nombre, espacio_id: f.espacio_id, estado: f.estado,
      espectaculo: {
        id: e.id, slug: e.slug, titulo: e.titulo, compania_nombre: e.compania_nombre, genero_id: e.genero_id, user_id: e.user_id,
        cartel_url: cartelValido(e.cartel_url, supabaseUrl, e.user_id),
      },
    }
  })
}

export type ResumenEntradas = {
  precio: number | null
  moneda: string | null
  gratis: boolean
  /** Si el espectáculo tiene una sola opción online para todas las funciones, el botón va directo. */
  directa: string | null
}

export async function resumenEntradas(supabase: Cliente, ids: string[]): Promise<Map<string, ResumenEntradas>> {
  const res = new Map<string, ResumenEntradas>()
  if (ids.length === 0) return res
  const { data } = await supabase
    .from('opciones_compra')
    .select('id, espectaculo_id, funcion_id, tipo, url, precio_desde, moneda')
    .in('espectaculo_id', ids.slice(0, 500))
  const por = new Map<string, NonNullable<typeof data>>()
  for (const o of data ?? []) {
    if (!por.has(o.espectaculo_id)) por.set(o.espectaculo_id, [])
    por.get(o.espectaculo_id)!.push(o)
  }
  for (const [id, ops] of por) {
    const conPrecio = ops.filter(o => o.precio_desde != null && o.moneda)
    // El más barato en la moneda más frecuente (no se comparan euros con pesos).
    const moneda = conPrecio.length ? mayoritaria(conPrecio.map(o => o.moneda!)) : null
    const precios = conPrecio.filter(o => o.moneda === moneda).map(o => Number(o.precio_desde))
    const online = ops.filter(o => o.url && (o.tipo === 'venta' || o.tipo === 'reserva'))
    res.set(id, {
      precio: precios.length ? Math.min(...precios) : null,
      moneda,
      gratis: ops.some(o => o.tipo === 'gratis') && precios.length === 0,
      directa: online.length === 1 && !online[0].funcion_id ? online[0].id : null,
    })
  }
  return res
}

function mayoritaria(xs: string[]): string {
  const c = new Map<string, number>()
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1])[0][0]
}

/** Ids de espectáculos destacados hoy (en la ciudad o en la portada). */
export async function destacadosHoy(supabase: Cliente, ahora: number): Promise<Map<string, string[]>> {
  const hoy = diaLocal(ahora, 'Europe/Madrid')
  const { data } = await supabase
    .from('cartelera_destacados')
    .select('espectaculo_id, ambito')
    .lte('desde', hoy)
    .gte('hasta', hoy)
  const res = new Map<string, string[]>()
  for (const d of data ?? []) res.set(d.espectaculo_id, [...(res.get(d.espectaculo_id) ?? []), d.ambito])
  return res
}
