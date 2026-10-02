import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase (service client) en memoria ────────────────────────────────────
//    Solo las cadenas que usa la ruta:
//      noticias_categorias: select('id').eq('activo', true)
//      noticias_fuentes:    select('id, dominio')
//      noticias:            insert(fila).select('id').single()
//                           select('id').in('url_original', v).limit(1).maybeSingle()
//      noticias_registro:   insert(filas)
//      rpc('noticias_normalizar_url', { p_url })
type Fila = Record<string, unknown>

const estado = {
  categorias: [] as { id: string }[],
  fuentes: [] as { id: string; dominio: string }[],
  // URLs (normalizadas a efectos del test: tal cual) ya guardadas → id
  guardadas: new Map<string, string>(),
  inserts: [] as Fila[],
  registro: [] as Fila[],
  siguienteId: 1,
}

function clave(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, '')
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (tabla: string) => {
      if (tabla === 'noticias_categorias') {
        return { select: () => ({ eq: () => Promise.resolve({ data: estado.categorias, error: null }) }) }
      }
      if (tabla === 'noticias_fuentes') {
        return { select: () => Promise.resolve({ data: estado.fuentes, error: null }) }
      }
      if (tabla === 'noticias') {
        return {
          insert: (fila: Fila) => {
            estado.inserts.push(fila)
            return {
              select: () => ({
                single: () => {
                  const k = clave(String(fila.url_original))
                  if ([...estado.guardadas.keys()].some(u => clave(u) === k)) {
                    return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value' } })
                  }
                  const id = `nueva-${estado.siguienteId++}`
                  estado.guardadas.set(String(fila.url_original), id)
                  return Promise.resolve({ data: { id }, error: null })
                },
              }),
            }
          },
          select: () => ({
            in: (_col: string, variantes: string[]) => ({
              limit: () => ({
                maybeSingle: () => {
                  const encontrada = variantes.find(v => estado.guardadas.has(v))
                  return Promise.resolve({ data: encontrada ? { id: estado.guardadas.get(encontrada) } : null, error: null })
                },
              }),
            }),
          }),
        }
      }
      if (tabla === 'noticias_registro') {
        return {
          insert: (filas: Fila[]) => {
            estado.registro.push(...filas)
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`Tabla inesperada: ${tabla}`)
    },
    rpc: (_fn: string, args: { p_url: string }) => Promise.resolve({ data: args.p_url, error: null }),
  }),
}))

import { POST } from '../route'

const SECRETO = 'secreto-de-prueba-0123456789'

function peticion(cuerpo: unknown, cabeceras: Record<string, string> = { 'x-noticias-secret': SECRETO }) {
  const body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)
  return new Request('http://localhost/api/news/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabeceras },
    body,
  }) as unknown as Parameters<typeof POST>[0]
}

function noticia(extra: Fila = {}): Fila {
  return {
    titular: 'Estreno en el Teatro Nacional',
    resumen: 'Resumen breve propio de la noticia.',
    categoria_id: 'estreno',
    pais_code: 'CL',
    fuente_dominio: 'www.satch.cl',
    url_original: 'https://www.satch.cl/2026/10/02/estreno',
    ...extra,
  }
}

beforeEach(() => {
  process.env.NOTICIAS_IMPORT_SECRET = SECRETO
  estado.categorias = [{ id: 'estreno' }, { id: 'actualidad' }]
  estado.fuentes = [{ id: 'fuente-satch', dominio: 'satch.cl' }]
  estado.guardadas = new Map()
  estado.inserts = []
  estado.registro = []
  estado.siguienteId = 1
})

describe('POST /api/news/import — autenticación', () => {
  it('sin cabecera de secreto: 401 sin detalle', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia()] }, {}))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'No autorizado' })
    expect(estado.inserts).toHaveLength(0)
  })

  it('con secreto erróneo: 401', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia()] }, { 'x-noticias-secret': 'otro' }))
    expect(res.status).toBe(401)
    expect(estado.inserts).toHaveLength(0)
  })

  it('sin NOTICIAS_IMPORT_SECRET configurada: 401 aunque llegue una cabecera', async () => {
    delete process.env.NOTICIAS_IMPORT_SECRET
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia()] }))
    expect(res.status).toBe(401)
  })

  it('la respuesta y el registro nunca contienen el secreto', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ pais_code: 'XX' })] }))
    const texto = JSON.stringify(await res.json()) + JSON.stringify(estado.registro)
    expect(texto).not.toContain(SECRETO)
  })
})

describe('POST /api/news/import — sobre', () => {
  it('JSON inválido: 400', async () => {
    const res = await POST(peticion('{no es json'))
    expect(res.status).toBe(400)
  })

  it('más de 5 noticias: 400 y no inserta nada', async () => {
    const noticias = Array.from({ length: 6 }, (_, i) => noticia({ url_original: `https://satch.cl/n${i}` }))
    const res = await POST(peticion({ lote: 'L1', noticias }))
    expect(res.status).toBe(400)
    expect(estado.inserts).toHaveLength(0)
  })

  it('sin lote: 400', async () => {
    const res = await POST(peticion({ noticias: [noticia()] }))
    expect(res.status).toBe(400)
  })

  it('cuerpo demasiado grande: 413', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ resumen: 'x'.repeat(70 * 1024) })] }))
    expect(res.status).toBe(413)
  })
})

describe('POST /api/news/import — noticias', () => {
  it('alta correcta: creada como importación de Make, sin estado en la fila', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ fecha_original: '2026-10-02' })] }))
    expect(res.status).toBe(200)
    const cuerpo = await res.json()
    expect(cuerpo.resultados).toEqual([
      { url: 'https://www.satch.cl/2026/10/02/estreno', resultado: 'creada', id: 'nueva-1' },
    ])
    expect(estado.inserts[0]).toMatchObject({
      fuente_id: 'fuente-satch',
      origen: 'make',
      lote_importacion: 'L1',
      pais_code: 'CL',
      fecha_original: '2026-10-02T00:00:00.000Z',
    })
    // El estado lo decide el trigger: la ruta no lo envía.
    expect(estado.inserts[0]).not.toHaveProperty('estado')
    // 'importada' la escribe el trigger, no la ruta.
    expect(estado.registro).toHaveLength(0)
  })

  it('categoría inexistente o inactiva: rechazada con entrada de error', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ categoria_id: 'opera' })] }))
    expect(res.status).toBe(200)
    const { resultados } = await res.json()
    expect(resultados[0]).toMatchObject({ resultado: 'rechazada' })
    expect(resultados[0].motivo).toMatch(/categoria_id/)
    expect(estado.inserts).toHaveLength(0)
    expect(estado.registro[0]).toMatchObject({ evento: 'error', lote: 'L1' })
  })

  it('país fuera de los 20: rechazada', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ pais_code: 'BR' })] }))
    const { resultados } = await res.json()
    expect(resultados[0].resultado).toBe('rechazada')
    expect(resultados[0].motivo).toMatch(/pais_code/)
    expect(estado.registro[0]).toMatchObject({ evento: 'error' })
  })

  it('dominio desconocido: rechazada', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ fuente_dominio: 'desconocido.com' })] }))
    const { resultados } = await res.json()
    expect(resultados[0].resultado).toBe('rechazada')
    expect(resultados[0].motivo).toMatch(/fuente_dominio/)
    expect(estado.inserts).toHaveLength(0)
    expect(estado.registro[0]).toMatchObject({ evento: 'error', detalle: { fase: 'fuente' } })
  })

  it('URL no http(s): rechazada', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ url_original: 'javascript:alert(1)' })] }))
    const { resultados } = await res.json()
    expect(resultados[0].resultado).toBe('rechazada')
    expect(resultados[0].motivo).toMatch(/url_original/)
  })

  it('titular de más de 200 caracteres: rechazada', async () => {
    const res = await POST(peticion({ lote: 'L1', noticias: [noticia({ titular: 't'.repeat(201) })] }))
    const { resultados } = await res.json()
    expect(resultados[0].resultado).toBe('rechazada')
  })

  it('duplicado: responde duplicada con el id existente y lo registra', async () => {
    estado.guardadas.set('https://www.satch.cl/2026/10/02/estreno', 'existente-7')
    const res = await POST(peticion({ lote: 'L2', noticias: [noticia({ url_original: 'http://satch.cl/2026/10/02/estreno' })] }))
    expect(res.status).toBe(200)
    const { resultados } = await res.json()
    expect(resultados[0]).toEqual({ url: 'http://satch.cl/2026/10/02/estreno', resultado: 'duplicada', id: 'existente-7' })
    expect(estado.registro).toEqual([
      expect.objectContaining({ evento: 'duplicada', noticia_id: 'existente-7', lote: 'L2' }),
    ])
  })

  it('lote mixto: cada noticia con su propio resultado', async () => {
    const res = await POST(peticion({
      lote: 'L3',
      noticias: [
        noticia({ url_original: 'https://satch.cl/a' }),
        noticia({ url_original: 'https://satch.cl/a' }),
        noticia({ url_original: 'https://satch.cl/b', pais_code: 'XX' }),
      ],
    }))
    const { resultados } = await res.json()
    expect(resultados.map((r: { resultado: string }) => r.resultado)).toEqual(['creada', 'duplicada', 'rechazada'])
  })
})
