import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hoyEnMadrid } from '@/lib/convocatorias/importacion'

// ── Supabase (service client) en memoria ────────────────────────────────────
//    Solo las cadenas que usa la ruta:
//      profiles: select('id').eq('slug', 'redaccion').is('deleted_at', null).maybeSingle()
//      calls:    insert(fila).select('id').single()
//                select('id').eq('origen', ..).eq('url_bases_normalizada', ..).limit(1).maybeSingle()
//      rpc('noticias_normalizar_url', { p_url })
type Fila = Record<string, unknown>

const REDACCION_ID = 'perfil-redaccion'

const estado = {
  redaccion: REDACCION_ID as string | null,
  // clave de URL (sin esquema ni www) → id
  guardadas: new Map<string, string>(),
  inserts: [] as Fila[],
  siguienteId: 1,
}

const clave = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '')

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (tabla: string) => {
      if (tabla === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: () => Promise.resolve({ data: estado.redaccion ? { id: estado.redaccion } : null, error: null }),
              }),
            }),
          }),
        }
      }
      if (tabla === 'calls') {
        return {
          insert: (fila: Fila) => {
            estado.inserts.push(fila)
            return {
              select: () => ({
                single: () => {
                  const k = clave(String(fila.url_bases))
                  if (estado.guardadas.has(k)) {
                    return Promise.resolve({
                      data: null,
                      error: { code: '23505', message: 'duplicate key value violates unique constraint "calls_url_bases_redaccion_unica"', details: null },
                    })
                  }
                  const id = `nueva-${estado.siguienteId++}`
                  estado.guardadas.set(k, id)
                  // Lo que haría el trigger: BDNS de España sin filtro → publicado.
                  const publicada = String(fila.lote).startsWith('BDNS-') && fila.pais_code === 'ES'
                  return Promise.resolve({ data: { id, estado: publicada ? 'publicado' : 'pendiente_revision' }, error: null })
                },
              }),
            }
          },
          select: () => ({
            eq: () => ({
              eq: (_col: string, k: string) => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: estado.guardadas.has(k) ? { id: estado.guardadas.get(k) } : null, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      throw new Error(`Tabla inesperada: ${tabla}`)
    },
    rpc: (_fn: string, args: { p_url: string }) => Promise.resolve({ data: args.p_url, error: null }),
  }),
}))

import { POST } from '../route'

const SECRETO = 'secreto-convocatorias-0123456789'

function peticion(cuerpo: unknown, cabeceras: Record<string, string> = { 'x-convocatorias-secret': SECRETO }) {
  const body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)
  return new Request('http://localhost/api/convocatorias/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabeceras },
    body,
  }) as unknown as Parameters<typeof POST>[0]
}

function convocatoria(extra: Fila = {}): Fila {
  return {
    titulo: 'Festival Iberoamericano de Teatro Joven',
    resumen: 'Convocatoria abierta a compañías jóvenes de habla hispana para la edición 2027.',
    categoria: 'festival',
    pais_code: 'CO',
    ciudad: 'Bogotá',
    entidad_convocante: 'Fundación Teatro Joven',
    fecha_limite: '2099-12-31',
    dotacion: '5.000 € y alojamiento',
    url_bases: 'https://www.teatrojoven.org/bases-2027',
    fuente_dominio: 'www.teatrojoven.org',
    ...extra,
  }
}

beforeEach(() => {
  process.env.CONVOCATORIAS_IMPORT_SECRET = SECRETO
  estado.redaccion = REDACCION_ID
  estado.guardadas = new Map()
  estado.inserts = []
  estado.siguienteId = 1
})

describe('POST /api/convocatorias/import — autenticación y sobre', () => {
  it('sin cabecera de secreto: 401 sin detalle', async () => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria()] }, {}))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'No autorizado' })
    expect(estado.inserts).toHaveLength(0)
  })

  it('con secreto erróneo: 401', async () => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria()] }, { 'x-convocatorias-secret': 'otro' }))
    expect(res.status).toBe(401)
  })

  it('sin CONVOCATORIAS_IMPORT_SECRET configurada: 401 aunque llegue una cabecera', async () => {
    delete process.env.CONVOCATORIAS_IMPORT_SECRET
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria()] }))
    expect(res.status).toBe(401)
  })

  it('cuerpo de más de 64 KB: 413', async () => {
    const enorme = { lote: 'L1', convocatorias: [convocatoria({ resumen: 'x'.repeat(70 * 1024) })] }
    const res = await POST(peticion(enorme))
    expect(res.status).toBe(413)
    expect(estado.inserts).toHaveLength(0)
  })

  it('más de 10 convocatorias: 400', async () => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: Array.from({ length: 11 }, () => convocatoria()) }))
    expect(res.status).toBe(400)
  })

  it('JSON no válido: 400', async () => {
    const res = await POST(peticion('{no es json'))
    expect(res.status).toBe(400)
  })

  it('sin el perfil de la Redacción: 500 y nada se guarda', async () => {
    estado.redaccion = null
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria()] }))
    expect(res.status).toBe(500)
    expect(estado.inserts).toHaveLength(0)
  })

  it('la respuesta nunca contiene el secreto', async () => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria({ pais_code: 'XX' })] }))
    expect(JSON.stringify(await res.json())).not.toContain(SECRETO)
  })
})

describe('POST /api/convocatorias/import — resultados por convocatoria', () => {
  it('creada: se guarda a nombre de la Redacción, en revisión y con origen redaccion', async () => {
    const res = await POST(peticion({ lote: 'L-2026-10-06', convocatorias: [convocatoria()] }))
    expect(res.status).toBe(200)
    const cuerpo = await res.json()
    expect(cuerpo.resultados).toEqual([{ url_bases: 'https://www.teatrojoven.org/bases-2027', resultado: 'creada', id: 'nueva-1', estado: 'pendiente_revision' }])

    const fila = estado.inserts[0]
    expect(fila).toMatchObject({
      profile_id: REDACCION_ID,
      origen: 'redaccion',
      estado: 'pendiente_revision',
      title: 'Festival Iberoamericano de Teatro Joven',
      category: 'festival',
      pais_code: 'CO',
      ciudad: 'Bogotá',
      entidad_convocante: 'Fundación Teatro Joven',
      prize: '5.000 € y alojamiento',
      fuente_dominio: 'teatrojoven.org',
      lote: 'L-2026-10-06',
    })
    // Último segundo del día en Madrid (31 de diciembre: horario de invierno, +01:00).
    expect(fila.deadline).toBe('2099-12-31T23:59:59+01:00')
  })

  it('duplicada: las mismas bases (aunque cambien http/https y www) no entran dos veces', async () => {
    await POST(peticion({ lote: 'L1', convocatorias: [convocatoria()] }))
    const res = await POST(peticion({ lote: 'L2', convocatorias: [convocatoria({ url_bases: 'https://teatrojoven.org/bases-2027' })] }))
    const cuerpo = await res.json()
    expect(cuerpo.resultados).toEqual([{ url_bases: 'https://teatrojoven.org/bases-2027', resultado: 'duplicada', id: 'nueva-1' }])
  })

  it('vencida: fecha límite de hoy (Madrid) o anterior no se guarda', async () => {
    const res = await POST(peticion({
      lote: 'L1',
      convocatorias: [
        convocatoria({ fecha_limite: hoyEnMadrid(), url_bases: 'https://a.org/hoy' }),
        convocatoria({ fecha_limite: '2020-01-01', url_bases: 'https://a.org/pasada' }),
      ],
    }))
    const cuerpo = await res.json()
    expect(cuerpo.resultados.map((r: { resultado: string }) => r.resultado)).toEqual(['vencida', 'vencida'])
    expect(estado.inserts).toHaveLength(0)
  })

  it('sin bases: invalida con motivo, y el resto del lote sigue', async () => {
    const res = await POST(peticion({
      lote: 'L1',
      convocatorias: [convocatoria({ url_bases: '' }), convocatoria({ url_bases: 'https://b.org/bases' })],
    }))
    const cuerpo = await res.json()
    expect(cuerpo.resultados[0]).toMatchObject({ resultado: 'invalida', motivo: expect.stringContaining('url_bases') })
    expect(cuerpo.resultados[1]).toMatchObject({ resultado: 'creada' })
  })

  it('bases por http (no https): invalida', async () => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria({ url_bases: 'http://c.org/bases' })] }))
    expect((await res.json()).resultados[0]).toMatchObject({ resultado: 'invalida', motivo: expect.stringContaining('https') })
  })

  it.each([
    ['categoria', { categoria: 'casting' }],
    ['pais_code', { pais_code: 'US' }],
    ['entidad_convocante', { entidad_convocante: '' }],
    ['fecha_limite', { fecha_limite: '31/12/2099' }],
    ['resumen', { resumen: 'x'.repeat(601) }],
  ])('%s no válido: invalida', async (_campo, extra) => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria(extra)] }))
    expect((await res.json()).resultados[0].resultado).toBe('invalida')
    expect(estado.inserts).toHaveLength(0)
  })

  it('acepta la categoría ayuda', async () => {
    const res = await POST(peticion({ lote: 'L1', convocatorias: [convocatoria({ categoria: 'ayuda' })] }))
    expect((await res.json()).resultados[0].resultado).toBe('creada')
    expect(estado.inserts[0].category).toBe('ayuda')
  })
})

describe('POST /api/convocatorias/import — autopublicación BDNS (decide el trigger)', () => {
  it('la ruta pide siempre pendiente_revision y devuelve el estado que deja la base', async () => {
    const res = await POST(peticion({
      lote: 'BDNS-2026-10-07',
      convocatorias: [convocatoria({ pais_code: 'ES', ciudad: 'Valencia', url_bases: 'https://dogv.gva.es/bases-1' })],
    }))
    const cuerpo = await res.json()
    expect(estado.inserts[0]).toMatchObject({ estado: 'pendiente_revision', lote: 'BDNS-2026-10-07', origen: 'redaccion' })
    expect(cuerpo.resultados[0]).toMatchObject({ resultado: 'creada', estado: 'publicado' })
  })

  it('GALERTAS queda en revisión', async () => {
    const res = await POST(peticion({
      lote: 'GALERTAS-2026-10-07',
      convocatorias: [convocatoria({ pais_code: 'AR', url_bases: 'https://ejemplo.com.ar/bases' })],
    }))
    expect((await res.json()).resultados[0]).toMatchObject({ resultado: 'creada', estado: 'pendiente_revision' })
  })
})
