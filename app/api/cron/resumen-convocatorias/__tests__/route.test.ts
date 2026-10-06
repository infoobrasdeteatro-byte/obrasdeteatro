import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Supabase (service client) en memoria ────────────────────────────────────
//    pendientes: from('calls').select(..).eq().is().or().order().limit()
//    bdns:       from('calls').select('id', {count, head}).eq().like().is().gte()
const estado = {
  pendientes: [] as Record<string, unknown>[],
  bdns: 0,
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: (_cols: string, opciones?: { head?: boolean }) => {
        if (opciones?.head) {
          const cadena = { eq: () => cadena, like: () => cadena, is: () => cadena, gte: () => Promise.resolve({ count: estado.bdns, error: null }) }
          return cadena
        }
        const cadena = {
          eq: () => cadena, is: () => cadena, or: () => cadena, order: () => cadena,
          limit: () => Promise.resolve({ data: estado.pendientes, error: null }),
        }
        return cadena
      },
    }),
  }),
}))

import { GET } from '../route'

const fetchMock = vi.fn()

function peticion(cabecera?: string) {
  return new Request('http://localhost/api/cron/resumen-convocatorias', {
    headers: cabecera ? { authorization: cabecera } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

const PENDIENTE = {
  id: '0b5c6d7e-1234-4abc-9def-0123456789ab',
  title: 'Residencia <b>escénica</b> 2027',
  description: 'Resumen de la convocatoria.',
  origen: 'redaccion',
  lote: 'GALERTAS-2026-10-07',
  pais_code: 'AR',
  ciudad: 'Mendoza',
  location: 'Mendoza, Argentina',
  entidad_convocante: 'Fundación Teatro',
  deadline: '2026-12-15T22:59:59Z',
  prize: '2.000 USD',
  url_bases: 'https://ejemplo.com.ar/bases',
  fuente_dominio: 'ejemplo.com.ar',
}

beforeEach(() => {
  process.env.CRON_SECRET = 'cron-secreto'
  process.env.CONVOCATORIAS_MODERACION_SECRET = 'secreto-moderacion'
  process.env.RESEND_API_KEY = 're_prueba'
  delete process.env.CONVOCATORIAS_RESUMEN_EMAIL
  estado.pendientes = []
  estado.bdns = 0
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('GET /api/cron/resumen-convocatorias', () => {
  it('sin CRON_SECRET correcto: 401 y no envía nada', async () => {
    expect((await GET(peticion())).status).toBe(401)
    expect((await GET(peticion('Bearer otro'))).status).toBe(401)
    delete process.env.CRON_SECRET
    expect((await GET(peticion('Bearer cron-secreto'))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sin pendientes: no envía correo, aunque haya BDNS autopublicadas', async () => {
    estado.bdns = 3
    const res = await GET(peticion('Bearer cron-secreto'))
    expect(await res.json()).toEqual({ enviado: false, pendientes: 0, bdns_autopublicadas: 3 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('con pendientes: un correo desde no-reply al destinatario por defecto, con botones y recuento BDNS', async () => {
    estado.pendientes = [PENDIENTE]
    estado.bdns = 2
    const res = await GET(peticion('Bearer cron-secreto'))
    expect(await res.json()).toEqual({ enviado: true, pendientes: 1, bdns_autopublicadas: 2 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    const cuerpo = JSON.parse(init.body)
    expect(cuerpo.from).toBe('ObrasDeTeatro® <no-reply@obrasdeteatro.com>')
    expect(cuerpo.to).toBe('hola@obrasdeteatro.com')
    expect(cuerpo.subject).toBe('Convocatorias: 1 pendiente de revisión esta semana')
    expect(cuerpo.html).toContain('/admin/convocatorias/moderar?t=')
    expect(cuerpo.html.match(/moderar\?t=/g)).toHaveLength(2)
    expect(cuerpo.html).toContain('2 convocatorias de la BDNS')
    expect(cuerpo.html).toContain('https://www.obrasdeteatro.com/admin/convocatorias')
    // El texto de la convocatoria va escapado.
    expect(cuerpo.html).toContain('Residencia &lt;b&gt;escénica&lt;/b&gt; 2027')
  })

  it('usa CONVOCATORIAS_RESUMEN_EMAIL si existe', async () => {
    process.env.CONVOCATORIAS_RESUMEN_EMAIL = 'moderacion@ejemplo.org'
    estado.pendientes = [PENDIENTE]
    await GET(peticion('Bearer cron-secreto'))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe('moderacion@ejemplo.org')
  })

  it('sin secreto de moderación: no envía un correo con botones inválidos', async () => {
    delete process.env.CONVOCATORIAS_MODERACION_SECRET
    estado.pendientes = [PENDIENTE]
    expect((await GET(peticion('Bearer cron-secreto'))).status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
