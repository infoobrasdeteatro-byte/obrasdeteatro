import { describe, it, expect, beforeEach } from 'vitest'
import { leerEstadoMake, ultimaEjecucion, vaciarCacheMake, MAKE_API } from '../make'
import { inicioPeriodo, mezclarEventos, nombreVisible, periodoValido, type Evento } from '../actividad'
import { plazasOcupadas } from '@/lib/embajadores/plazas'

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

describe('leerEstadoMake', () => {
  beforeEach(() => vaciarCacheMake())

  it('sin token no llama a Make', async () => {
    let llamadas = 0
    const fetcher = (async () => { llamadas++; return json({}) }) as unknown as typeof fetch
    expect(await leerEstadoMake({ token: '', fetcher })).toEqual({ tipo: 'sin_token' })
    expect(await leerEstadoMake({ token: undefined, fetcher })).toEqual({ tipo: 'sin_token' })
    expect(llamadas).toBe(0)
  })

  it('lee escenarios y su última ejecución terminada, con el token en la cabecera', async () => {
    const pedidas: { url: string; auth: string | null }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      pedidas.push({ url, auth: new Headers(init.headers).get('authorization') })
      if (url.includes('/logs')) {
        return json({ scenarioLogs: url.includes('/7/')
          ? [{ timestamp: '2026-10-29T08:00:00Z' }, { timestamp: '2026-10-28T08:00:00Z', status: 3 }]
          : [] })
      }
      return json({ scenarios: [
        { id: 7, name: 'Convocatorias · BDNS España', isActive: true, isinvalid: false },
        { id: 8, name: 'Convocatorias · Google Alertas LATAM', isActive: false, isinvalid: false },
      ] })
    }) as unknown as typeof fetch

    const r = await leerEstadoMake({ token: 'abc', fetcher, ahora: 0 })
    expect(r.tipo).toBe('ok')
    if (r.tipo !== 'ok') return
    expect(pedidas[0].url).toBe(`${MAKE_API}/scenarios?teamId=3029327&pg%5Blimit%5D=100`)
    expect(pedidas.every(p => p.auth === 'Token abc')).toBe(true)
    const bdns = r.escenarios.find(e => e.id === 7)!
    expect(bdns.ultimaEjecucion).toEqual({ at: '2026-10-28T08:00:00Z', resultado: 'error' }) // la que sigue en curso no cuenta
    expect(r.escenarios.find(e => e.id === 8)).toMatchObject({ activo: false, ultimaEjecucion: null })
  })

  it('un token rechazado vuelve como error, sin lanzar', async () => {
    const fetcher = (async () => json({}, 401)) as unknown as typeof fetch
    expect(await leerEstadoMake({ token: 'malo', fetcher, ahora: 0 })).toEqual({ tipo: 'error', mensaje: 'Make rechazó el token (401)' })
  })

  it('un tiempo agotado vuelve como error legible', async () => {
    const fetcher = (async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }) }) as unknown as typeof fetch
    expect(await leerEstadoMake({ token: 'abc', fetcher, ahora: 0 })).toEqual({ tipo: 'error', mensaje: 'no respondió a tiempo' })
  })

  it('guarda el resultado 5 minutos y un fallo solo 1 minuto', async () => {
    let llamadas = 0
    const bien = (async () => { llamadas++; return json({ scenarios: [] }) }) as unknown as typeof fetch
    await leerEstadoMake({ token: 'abc', fetcher: bien, ahora: 0 })
    await leerEstadoMake({ token: 'abc', fetcher: bien, ahora: 4 * 60_000 })
    expect(llamadas).toBe(1)
    await leerEstadoMake({ token: 'abc', fetcher: bien, ahora: 6 * 60_000 })
    expect(llamadas).toBe(2)

    vaciarCacheMake()
    let fallos = 0
    const mal = (async () => { fallos++; return json({}, 500) }) as unknown as typeof fetch
    await leerEstadoMake({ token: 'abc', fetcher: mal, ahora: 0 })
    await leerEstadoMake({ token: 'abc', fetcher: mal, ahora: 30_000 })
    await leerEstadoMake({ token: 'abc', fetcher: mal, ahora: 61_000 })
    expect(fallos).toBe(2)
  })

  it('ultimaEjecucion traduce los estados 1/2/3', () => {
    expect(ultimaEjecucion([{ timestamp: 't', status: 1 }])).toEqual({ at: 't', resultado: 'ok' })
    expect(ultimaEjecucion([{ timestamp: 't', status: 2 }])).toEqual({ at: 't', resultado: 'aviso' })
    expect(ultimaEjecucion([])).toBeNull()
  })
})

describe('actividad', () => {
  const ev = (id: string, at: string): Evento => ({ id, tipo: 'registro', texto: id, at, href: null })

  it('mezcla en orden cronológico inverso y corta con «hay más»', () => {
    const r = mezclarEventos([[ev('a', '2026-10-29T10:00:00Z'), ev('c', '2026-10-27T10:00:00Z')], [ev('b', '2026-10-28T10:00:00Z')]], 2)
    expect(r.eventos.map(e => e.id)).toEqual(['a', 'b'])
    expect(r.hayMas).toBe(true)
    expect(mezclarEventos([[ev('a', '2026-10-29T10:00:00Z')]], 2).hayMas).toBe(false)
  })

  it('«Hoy» empieza a las 00:00 de Canarias', () => {
    // 29-10-2026 08:30 UTC = 08:30 en Canarias (horario de invierno).
    expect(inicioPeriodo('hoy', new Date('2026-10-29T08:30:00Z')).toISOString()).toBe('2026-10-29T00:00:00.000Z')
    // En verano Canarias va a UTC+1: 00:30 del 15-07 allí son las 23:30 UTC del 14-07.
    expect(inicioPeriodo('hoy', new Date('2026-07-14T23:45:00Z')).toISOString()).toBe('2026-07-14T23:00:00.000Z')
    expect(inicioPeriodo('7d', new Date('2026-10-29T08:30:00Z')).toISOString()).toBe('2026-10-22T08:30:00.000Z')
  })

  it('periodo desconocido → hoy', () => {
    expect(periodoValido('30d')).toBe('30d')
    expect(periodoValido('x')).toBe('hoy')
    expect(periodoValido(undefined)).toBe('hoy')
  })

  it('nombre visible sin correo', () => {
    expect(nombreVisible({ nombre: 'Ana', apellidos: 'Ruiz', nombre_artistico: null })).toBe('Ana Ruiz')
    expect(nombreVisible({ nombre: 'Ana', apellidos: null, nombre_artistico: 'La Ruiz' })).toBe('La Ruiz')
    expect(nombreVisible(undefined)).toBe('Sin nombre')
  })
})

describe('plazas de Embajadores', () => {
  it('cuenta aceptadas y pendientes sin caducar', () => {
    const ahora = Date.parse('2026-10-29T12:00:00Z')
    expect(plazasOcupadas([
      { estado: 'aceptada', caduca_at: '2026-01-01T00:00:00Z' },
      { estado: 'pendiente', caduca_at: '2026-11-05T00:00:00Z' },
      { estado: 'pendiente', caduca_at: '2026-10-01T00:00:00Z' },
      { estado: 'revocada', caduca_at: '2026-12-01T00:00:00Z' },
    ], ahora)).toBe(2)
  })
})
