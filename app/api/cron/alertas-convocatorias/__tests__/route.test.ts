import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Supabase (service client) en memoria ────────────────────────────────────
type Fila = Record<string, unknown>
const db = {
  alertas: [] as Fila[],
  perfiles: [] as Fila[],
  calls: [] as Fila[],
  updates: [] as { cambios: Fila; id: unknown }[],
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (tabla: string) => {
      if (tabla === 'alertas_convocatorias') {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: db.alertas, error: null }) }),
          update: (cambios: Fila) => ({ eq: (_c: string, id: unknown) => { db.updates.push({ cambios, id }); return Promise.resolve({ error: null }) } }),
        }
      }
      if (tabla === 'profiles') {
        const cadena = { in: () => cadena, eq: () => cadena, is: () => cadena, then: (r: (v: unknown) => void) => r({ data: db.perfiles, error: null }) }
        return { select: () => cadena }
      }
      if (tabla === 'calls') {
        const cadena = { eq: () => cadena, is: () => cadena, gt: () => cadena, or: () => cadena, order: () => cadena, limit: () => Promise.resolve({ data: db.calls, error: null }) }
        return { select: () => cadena }
      }
      throw new Error(`Tabla inesperada: ${tabla}`)
    },
  }),
}))

import { GET } from '../route'

const fetchMock = vi.fn()
const peticion = (auth?: string) =>
  new Request('http://localhost/api/cron/alertas-convocatorias', { headers: auth ? { authorization: auth } : {} }) as unknown as Parameters<typeof GET>[0]

const USUARIO = '0b5c6d7e-1234-4abc-9def-0123456789ab'
const alerta = (extra: Fila = {}): Fila => ({
  profile_id: USUARIO, activa: true, paises: ['ES'], categorias: [], frecuencia: 'diaria', ultimo_envio_at: null, ...extra,
})
const convocatoria = (id: string, extra: Fila = {}): Fila => ({
  id, title: `Convocatoria ${id}`, entidad_convocante: 'Entidad', pais_code: 'ES', location: null, category: 'beca',
  deadline: '2026-11-30T22:59:59Z', fecha_publicacion: '2026-10-12T10:00:00Z', ...extra,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T07:30:00Z')) // martes
  process.env.CRON_SECRET = 'cron'
  process.env.RESEND_API_KEY = 're_prueba'
  process.env.ALERTAS_CONVOCATORIAS_SECRET = 'secreto-alertas'
  db.alertas = [alerta()]
  db.perfiles = [{ id: USUARIO, email: 'artista@ejemplo.org', plan: 'premium' }]
  db.calls = [convocatoria('a'), convocatoria('b', { deadline: '2026-10-20T00:00:00Z' })]
  db.updates = []
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const ejecutar = async () => (await GET(peticion('Bearer cron'))).json()

describe('GET /api/cron/alertas-convocatorias', () => {
  it('sin CRON_SECRET correcto: 401', async () => {
    expect((await GET(peticion())).status).toBe(401)
    expect((await GET(peticion('Bearer otro'))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envía un único correo desde no-reply, ordenado por plazo, con baja de un clic; y solo entonces avanza ultimo_envio_at', async () => {
    const r = await ejecutar()
    expect(r).toMatchObject({ toca: 1, enviados: 1, sin_resultados: 0, sin_plan: 0, errores: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(cuerpo.from).toBe('ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(cuerpo.to).toBe('artista@ejemplo.org')
    expect(cuerpo.subject).toBe('2 convocatorias nuevas para ti')
    expect(cuerpo.html.indexOf('/convocatoria/b')).toBeLessThan(cuerpo.html.indexOf('/convocatoria/a'))
    expect(cuerpo.headers['List-Unsubscribe']).toMatch(/^<https:\/\/www\.obrasdeteatro\.com\/api\/alertas\/baja\?t=/)
    expect(cuerpo.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(db.updates).toEqual([{ cambios: { ultimo_envio_at: '2026-10-13T07:30:00.000Z' }, id: USUARIO }])
  })

  it('plan gratuito: excluido, sin correo', async () => {
    db.perfiles = [{ id: USUARIO, email: 'artista@ejemplo.org', plan: 'gratuito' }]
    expect(await ejecutar()).toMatchObject({ toca: 1, sin_plan: 1, enviados: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sin convocatorias que coincidan: no envía nada ni toca ultimo_envio_at', async () => {
    db.alertas = [alerta({ paises: ['MX'] })]
    expect(await ejecutar()).toMatchObject({ sin_resultados: 1, enviados: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(db.updates).toHaveLength(0)
  })

  it('semanal un martes: no toca', async () => {
    db.alertas = [alerta({ frecuencia: 'semanal' })]
    expect(await ejecutar()).toMatchObject({ toca: 0, enviados: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('si Resend falla, ultimo_envio_at no avanza', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    expect(await ejecutar()).toMatchObject({ enviados: 0, errores: 1 })
    expect(db.updates).toHaveLength(0)
  })
})
