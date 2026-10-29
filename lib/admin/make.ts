/**
 * Estado de los escenarios de Make para el Master Control (solo servidor).
 *
 * API de Make, zona eu1, equipo 3029327. El token va en MAKE_API_TOKEN y
 * necesita el scope scenarios:read (lista de escenarios y sus registros de
 * ejecución). Sin token, el semáforo dice «Sin conectar» y no se llama a nada.
 *
 * Cada petición tiene un tiempo máximo corto y el resultado se guarda unos
 * minutos en memoria: el panel no espera a Make ni lo llama en cada visita.
 * Nunca lanza: un fallo vuelve como { tipo: 'error' }.
 */

import type { EjecucionMake, EscenarioMake, EstadoMake } from './salud'

export const MAKE_API = 'https://eu1.make.com/api/v2'
export const MAKE_TEAM_ID = 3029327
const TIEMPO_MAX_MS = 4_000
const CACHE_MS = 5 * 60_000
/** Un fallo se recuerda menos: al minuto se vuelve a intentar. */
const CACHE_ERROR_MS = 60_000

let cache: { at: number; valor: EstadoMake } | null = null

type EscenarioApi = { id: number; name: string; isActive?: boolean; islinked?: boolean; isinvalid?: boolean }
type LogApi = { timestamp?: string; status?: number }

const RESULTADO: Record<number, EjecucionMake['resultado']> = { 1: 'ok', 2: 'aviso', 3: 'error' }

async function pedir<T>(ruta: string, token: string, fetcher: typeof fetch): Promise<T> {
  const r = await fetcher(`${MAKE_API}${ruta}`, {
    headers: { Authorization: `Token ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(TIEMPO_MAX_MS),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? `Make rechazó el token (${r.status})` : `Make respondió ${r.status}`)
  return r.json() as Promise<T>
}

/** Última ejecución terminada (los registros vienen del más reciente al más antiguo). */
export function ultimaEjecucion(logs: LogApi[]): EjecucionMake | null {
  const l = logs.find(x => x.timestamp && x.status !== undefined && RESULTADO[x.status])
  return l ? { at: l.timestamp!, resultado: RESULTADO[l.status!] } : null
}

export async function leerEstadoMake(
  { token = process.env.MAKE_API_TOKEN, fetcher = fetch, ahora = Date.now(), sinCache = false }:
  { token?: string; fetcher?: typeof fetch; ahora?: number; sinCache?: boolean } = {},
): Promise<EstadoMake> {
  if (!token?.trim()) return { tipo: 'sin_token' }
  if (!sinCache && cache && ahora - cache.at < (cache.valor.tipo === 'error' ? CACHE_ERROR_MS : CACHE_MS)) return cache.valor

  let valor: EstadoMake
  try {
    const { scenarios } = await pedir<{ scenarios?: EscenarioApi[] }>(`/scenarios?teamId=${MAKE_TEAM_ID}&pg%5Blimit%5D=100`, token, fetcher)
    const escenarios: EscenarioMake[] = await Promise.all((scenarios ?? []).map(async s => {
      let ejecucion: EjecucionMake | null = null
      try {
        const { scenarioLogs } = await pedir<{ scenarioLogs?: LogApi[] }>(`/scenarios/${s.id}/logs?pg%5Blimit%5D=10&pg%5BsortDir%5D=desc`, token, fetcher)
        ejecucion = ultimaEjecucion(scenarioLogs ?? [])
      } catch { /* sin registros: se muestra «no consta ninguna ejecución» */ }
      return { id: s.id, nombre: s.name, activo: !!(s.isActive ?? s.islinked), invalido: !!s.isinvalid, ultimaEjecucion: ejecucion }
    }))
    escenarios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    valor = { tipo: 'ok', escenarios, leidoAt: new Date(ahora).toISOString() }
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'TimeoutError' ? 'no respondió a tiempo' : e instanceof Error ? e.message : String(e)
    valor = { tipo: 'error', mensaje }
  }
  cache = { at: ahora, valor }
  return valor
}

/** Solo para tests. */
export function vaciarCacheMake() { cache = null }
