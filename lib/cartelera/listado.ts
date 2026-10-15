/**
 * Cartelera pública: funciones puras para filtrar y agrupar (sin red).
 * Las fechas se calculan en la zona horaria de CADA función: «hoy» en Buenos
 * Aires no es el mismo día que en Madrid.
 */

export type FuncionListado = {
  id: string
  inicio: string
  zona_horaria: string
  ciudad: string | null
  pais_code: string | null
  lugar_nombre: string | null
  espacio_id: string | null
  estado: string
  espectaculo: {
    id: string
    slug: string
    titulo: string
    compania_nombre: string
    cartel_url: string | null
    genero_id: string
    user_id: string
  }
}

export const CUANDO = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'manana', label: 'Mañana' },
  { value: 'finde', label: 'Este finde' },
  { value: '7d', label: 'Próximos 7 días' },
  { value: '30d', label: 'Próximos 30 días' },
] as const
export type Cuando = (typeof CUANDO)[number]['value']
export const esCuando = (v: unknown): v is Cuando => CUANDO.some(c => c.value === v)
export const esFecha = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Ambientes: atajos a varios géneros a la vez. */
export const AMBIENTES = [
  { value: 'reir', label: 'Para reír', generos: ['comedia', 'humor', 'clown', 'improvisacion'] },
  { value: 'familia', label: 'En familia', generos: ['infantil', 'titeres', 'circo'] },
  { value: 'emocion', label: 'Drama y clásicos', generos: ['drama', 'teatro', 'lectura'] },
  { value: 'musica', label: 'Música y danza', generos: ['musical', 'danza', 'opera'] },
  { value: 'otro', label: 'Formatos distintos', generos: ['microteatro', 'performance', 'otro'] },
] as const
export const esAmbiente = (v: unknown) => AMBIENTES.some(a => a.value === v)

/** Una función se lista hasta una hora después de empezar. */
export const MARGEN_EMPEZADA_MS = 60 * 60_000

/** Día local «AAAA-MM-DD» de un instante en una zona. */
export function diaLocal(iso: string | number | Date, zona: string): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso))
  const v = (t: string) => p.find(x => x.type === t)?.value
  return `${v('year')}-${v('month')}-${v('day')}`
}

export function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado. */
const diaSemana = (dia: string) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

/** Rango [desde, hasta] de días locales para un filtro «Cuándo». */
export function rangoCuando(cuando: Cuando | string, hoy: string): [string, string] {
  switch (cuando) {
    case 'hoy': return [hoy, hoy]
    case 'manana': return [sumarDias(hoy, 1), sumarDias(hoy, 1)]
    case '7d': return [hoy, sumarDias(hoy, 6)]
    case '30d': return [hoy, sumarDias(hoy, 29)]
    case 'finde': {
      const ds = diaSemana(hoy)
      // Viernes, sábado o domingo: desde hoy hasta el domingo. Si no, el próximo viernes a domingo.
      if (ds === 5 || ds === 6 || ds === 0) return [hoy, sumarDias(hoy, ds === 0 ? 0 : 7 - ds)]
      return [sumarDias(hoy, 5 - ds), sumarDias(hoy, 7 - ds)]
    }
    default: return esFecha(cuando) ? [cuando, cuando] : ['0000-00-00', '9999-99-99']
  }
}

export function enCuando(f: Pick<FuncionListado, 'inicio' | 'zona_horaria'>, cuando: string, ahora: number): boolean {
  const dia = diaLocal(f.inicio, f.zona_horaria)
  const [desde, hasta] = rangoCuando(cuando, diaLocal(ahora, f.zona_horaria))
  return dia >= desde && dia <= hasta
}

/** Para comparar ciudades escritas de formas distintas («Málaga» / «malaga »). */
export function normalizarCiudad(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export type FichaListado = {
  id: string
  slug: string
  titulo: string
  compania_nombre: string
  cartel_url: string | null
  genero_id: string
  user_id: string
  proxima: FuncionListado
  funciones: number
  ultima: string
  salas: string[]
  ciudades: string[]
}

/** Agrupa funciones (ya filtradas y ordenadas por fecha) por espectáculo. */
export function agruparPorEspectaculo(funciones: FuncionListado[]): FichaListado[] {
  const mapa = new Map<string, FichaListado>()
  for (const f of funciones) {
    const e = f.espectaculo
    const ya = mapa.get(e.id)
    if (!ya) {
      mapa.set(e.id, {
        ...e, proxima: f, funciones: 1, ultima: f.inicio,
        salas: f.lugar_nombre ? [f.lugar_nombre] : [], ciudades: f.ciudad ? [f.ciudad] : [],
      })
      continue
    }
    ya.funciones++
    if (f.inicio > ya.ultima) ya.ultima = f.inicio
    if (f.inicio < ya.proxima.inicio) ya.proxima = f
    if (f.lugar_nombre && !ya.salas.includes(f.lugar_nombre)) ya.salas.push(f.lugar_nombre)
    if (f.ciudad && !ya.ciudades.includes(f.ciudad)) ya.ciudades.push(f.ciudad)
  }
  return [...mapa.values()].sort((a, b) => a.proxima.inicio.localeCompare(b.proxima.inicio))
}

/** Etiqueta corta de la próxima función: «HOY 20:00», «MAÑANA 19:30», «SÁB 24 OCT». */
export function etiquetaProxima(f: Pick<FuncionListado, 'inicio' | 'zona_horaria'>, ahora: number): string {
  const dia = diaLocal(f.inicio, f.zona_horaria)
  const hoy = diaLocal(ahora, f.zona_horaria)
  const hora = new Intl.DateTimeFormat('es-ES', { timeZone: f.zona_horaria, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(f.inicio))
  if (dia === hoy) return `HOY ${hora}`
  if (dia === sumarDias(hoy, 1)) return `MAÑANA ${hora}`
  return new Intl.DateTimeFormat('es-ES', { timeZone: f.zona_horaria, weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(f.inicio)).replace(/,/g, '').replace(/\./g, '').toUpperCase()
}

/** Termina pronto: su última función es en los próximos 7 días (y ya había empezado a programarse). */
export function terminaPronto(e: Pick<FichaListado, 'ultima' | 'funciones'>, ahora: number): boolean {
  return e.funciones >= 1 && new Date(e.ultima).getTime() - ahora < 7 * 86400_000
}

/** Cuenta por clave (ciudad, género…) contando cada espectáculo una sola vez. */
export function contarPor<T extends string>(funciones: FuncionListado[], clave: (f: FuncionListado) => T | null): Map<T, number> {
  const vistos = new Map<T, Set<string>>()
  for (const f of funciones) {
    const k = clave(f)
    if (k == null) continue
    if (!vistos.has(k)) vistos.set(k, new Set())
    vistos.get(k)!.add(f.espectaculo.id)
  }
  return new Map([...vistos].map(([k, s]) => [k, s.size]))
}

/** Ciudad del visitante (cabeceras de Vercel) → la ciudad de la cartelera que coincide, si hay. */
export function ciudadDetectada(cabeceraCiudad: string | null, ciudadesConFunciones: string[]): string | null {
  if (!cabeceraCiudad) return null
  let c = cabeceraCiudad
  try { c = decodeURIComponent(cabeceraCiudad) } catch { /* se usa tal cual */ }
  const n = normalizarCiudad(c)
  if (!n) return null
  return ciudadesConFunciones.find(x => normalizarCiudad(x) === n) ?? null
}
