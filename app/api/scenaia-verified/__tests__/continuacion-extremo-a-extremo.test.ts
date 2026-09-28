import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveScenaiaAccess } from '@/lib/auth/scenaia-access'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { verifyAndReserve, settleReservation, releaseReservation } from '@/lib/accounting-engine'
import { findProviderAdapter } from '@/lib/ai-gateway/provider-registry'
import { resolveVocabulary } from '@/lib/intent-resolver'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { POST } from '../route'

/**
 * SCENAIA-004B §6.1 y §7 (PR 3) -- DE EXTREMO A EXTREMO: petición HTTP a la
 * ruta, con el Orquestador, el intérprete, SKM, Knowledge Assets, Repository
 * Layer, Decision Engine, Credit Manager, AI Gateway y la composición REALES.
 *
 * Se simulan solo: la base de datos (emulador de PostgREST), el acceso y el
 * contexto profesional, la reserva y la liquidación (para contarlas), el
 * registro de proveedores de IA (para contar cualquier intento de llamar a
 * la IA) y lo que escribe en la base (actividad, auditoría, métricas).
 */

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/auth/scenaia-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/scenaia-access')>()),
  resolveScenaiaAccess: vi.fn(),
}))
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/accounting-engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/accounting-engine')>()),
  verifyAndReserve: vi.fn(),
  settleReservation: vi.fn(),
  releaseReservation: vi.fn(),
}))
vi.mock('@/lib/ai-gateway/provider-registry', () => ({ findProviderAdapter: vi.fn(() => null) }))
vi.mock('@/lib/intent-resolver', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/intent-resolver')>()),
  resolveVocabulary: vi.fn(),
}))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))
vi.mock('@/lib/execution-audit-router', () => ({ distributeExecutionAudit: vi.fn() }))
vi.mock('@/lib/verified/observabilidad', () => ({ recordTurnMetrics: vi.fn(), recordTurnFailure: vi.fn() }))

type Fila = Record<string, unknown>

/** 25 obras publicadas: páginas de 10, 10 y 5. */
const CATALOGO: Fila[] = Array.from({ length: 25 }, (_, i) => ({
  id: `w-${String(i + 1).padStart(3, '0')}`,
  title: `Obra ${String((i * 7) % 25).padStart(2, '0')}`,
  subtitle: null, author: 'Autora', genre: 'Drama', synopsis: null, language: 'es', year: 1600 + i, slug: `obra-${i}`,
  min_age: 0, duration_minutes: 90, cast_size_max: 5, source_name: null, source_url: null, is_published: true, deleted_at: null,
}))

/** Emulador de PostgREST: filtra, ordena, corta, cuenta y responde PGRST103 si el desplazamiento supera el total. */
function baseDeDatos() {
  const from = vi.fn(() => {
    let filas = [...CATALOGO]
    let contar = false
    let soloAutor = false
    const orden: string[] = []
    const resolver = (desde: number, hasta: number) => {
      const ordenadas = orden.length === 0 ? filas : [...filas].sort((a, b) => {
        for (const c of orden) if (a[c] !== b[c]) return String(a[c]) < String(b[c]) ? -1 : 1
        return 0
      })
      if (contar && desde > ordenadas.length) {
        return Promise.resolve({ data: null, count: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable', details: `An offset of ${desde} was requested, but there are only ${ordenadas.length} rows.` } })
      }
      const cortadas = ordenadas.slice(desde, hasta + 1)
      return Promise.resolve({ data: soloAutor ? cortadas.map((f) => ({ author: f.author })) : cortadas, error: null, count: contar ? ordenadas.length : null })
    }
    const b = {
      select: (cols: string, opts?: { count?: string }) => { soloAutor = cols === 'author'; contar = opts?.count === 'exact'; return b },
      eq: (c: string, v: unknown) => { filas = filas.filter((f) => f[c] === v); return b },
      is: (c: string, v: unknown) => { filas = filas.filter((f) => f[c] === v); return b },
      ilike: () => b, gte: () => b, lte: () => b,
      order: (c: string) => { orden.push(c); return b },
      range: (d: number, h: number) => resolver(d, h),
      limit: (n: number) => resolver(0, n - 1),
    }
    return b
  })
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from } as never)
}

function peticion(body: unknown) {
  return new NextRequest('http://localhost/api/scenaia-verified', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
}

const CONTEXTO_PROFESIONAL = {
  identity: { userId: 'user-1', profileType: 'actor', language: 'es', country: 'ES', timezone: null, authenticationStatus: 'autenticado' },
  subscription: { plan: 'premium', status: 'active', availableCapabilities: null, usageLimits: null },
  professionalProfile: { specialty: null, disciplines: null, experience: null, publicProfile: null },
  session: { route: null, module: null, locale: 'es', timestamp: 'T' },
}

const ENV = process.env.SCENAIA_PAGINACION_ENABLED

beforeEach(() => {
  __resetCacheForTests()
  baseDeDatos()
  vi.mocked(resolveScenaiaAccess).mockReset().mockResolvedValue({ allowed: true, userId: 'user-1', plan: 'premium' })
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue(CONTEXTO_PROFESIONAL as never)
  vi.mocked(verifyAndReserve).mockReset()
  vi.mocked(settleReservation).mockReset()
  vi.mocked(releaseReservation).mockReset()
  vi.mocked(findProviderAdapter).mockClear()
  vi.mocked(resolveVocabulary).mockReset().mockResolvedValue([])
  process.env.SCENAIA_PAGINACION_ENABLED = '1'
})

afterEach(() => {
  if (ENV === undefined) delete process.env.SCENAIA_PAGINACION_ENABLED
  else process.env.SCENAIA_PAGINACION_ENABLED = ENV
})

function sinIaNiCreditos() {
  expect(findProviderAdapter).not.toHaveBeenCalled()
  expect(resolveVocabulary).not.toHaveBeenCalled()
  expect(verifyAndReserve).not.toHaveBeenCalled()
  expect(settleReservation).not.toHaveBeenCalled()
  expect(releaseReservation).not.toHaveBeenCalled()
}

describe('continuación de extremo a extremo: sin IA y sin créditos (SCENAIA-004B §6.1)', () => {
  it('primera página: 10 fichas, recuento total y siguiente en 10', async () => {
    const cuerpo = await (await POST(peticion({ message: 'dame la lista de obras' }))).json()

    expect(cuerpo.listingPage).toEqual({ from: 1, to: 10, total: 25, nextOffset: 10 })
    expect(cuerpo.responseContent).toMatch(/^En obras he encontrado 25 resultados:/)
    expect(cuerpo.responseContent.split('\n').filter((l: string) => l.startsWith('- '))).toHaveLength(10)
    sinIaNiCreditos()
  })

  it.each([
    [10, { from: 11, to: 20, total: 25, nextOffset: 20 }, 10],
    [20, { from: 21, to: 25, total: 25, nextOffset: null }, 5],
  ])('continuación con desplazamiento %i', async (offset, pagina, fichas) => {
    const res = await POST(peticion({ message: 'dame la lista de obras', continuation: { offset } }))
    const cuerpo = await res.json()

    expect(res.status).toBe(200)
    expect(cuerpo.responseType).toBe('RESPONSE_DIRECT')
    expect(cuerpo.listingPage).toEqual(pagina)
    expect(cuerpo.responseContent.split('\n').filter((l: string) => l.startsWith('- '))).toHaveLength(fichas)
    sinIaNiCreditos()
  })

  it.each([25, 30, 49_990])('página vacía (desplazamiento %i): "No hay más obras", sin IA y sin créditos', async (offset) => {
    const cuerpo = await (await POST(peticion({ message: 'dame la lista de obras', continuation: { offset } }))).json()

    expect(cuerpo.responseContent).toBe('No hay más obras en este listado.')
    expect(cuerpo.listingPage).toEqual({ from: offset + 1, to: offset, total: 25, nextOffset: null })
    sinIaNiCreditos()
  })

  it('recorriendo todas las páginas con nextOffset se ven las 25 obras, una sola vez y sin coste', async () => {
    const titulos: string[] = []
    let siguiente: number | null = 0
    let turnos = 0

    while (siguiente !== null && turnos < 10) {
      const body: Record<string, unknown> =
        siguiente === 0 ? { message: 'dame la lista de obras' } : { message: 'dame la lista de obras', continuation: { offset: siguiente } }
      const cuerpo: { responseContent: string; listingPage: { nextOffset: number | null } } = await (await POST(peticion(body))).json()
      titulos.push(...cuerpo.responseContent.split('\n').filter((l: string) => l.startsWith('- ')))
      siguiente = cuerpo.listingPage.nextOffset
      turnos++
    }

    expect(turnos).toBe(3)
    expect(new Set(titulos).size).toBe(25)
    sinIaNiCreditos()
  })
})
