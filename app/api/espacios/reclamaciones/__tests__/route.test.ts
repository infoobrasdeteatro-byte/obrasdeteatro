import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase (cliente con sesión) en memoria ────────────────────────────────
//    espacio:  from('espacios_escenicos').select().eq().eq().maybeSingle()
//    insert:   from('espacios_reclamaciones').insert({...})
//    perfil:   from('profiles').select().eq().maybeSingle()
const estado = {
  user: null as { id: string; email: string } | null,
  espacio: null as Record<string, unknown> | null,
  errorInsert: null as { code: string; message: string } | null,
  insertado: null as Record<string, unknown> | null,
  perfil: { nombre: 'Ana', apellidos: 'Pérez', nombre_artistico: null } as Record<string, unknown> | null,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: estado.user } }) },
    from: (tabla: string) => {
      if (tabla === 'espacios_reclamaciones') {
        return {
          insert: async (fila: Record<string, unknown>) => {
            if (estado.errorInsert) return { error: estado.errorInsert }
            estado.insertado = fila
            return { error: null }
          },
        }
      }
      const resultado = tabla === 'espacios_escenicos' ? estado.espacio : estado.perfil
      const cadena = { select: () => cadena, eq: () => cadena, maybeSingle: async () => ({ data: resultado, error: null }) }
      return cadena
    },
  }),
}))

const envio = vi.hoisted(() => ({ resultado: { ok: true } as { ok: true } | { ok: false; error: string }, llamadas: [] as unknown[] }))
vi.mock('@/lib/espacios/aviso-reclamacion', () => ({
  enviarAvisoReclamacion: async (d: unknown) => {
    envio.llamadas.push(d)
    return envio.resultado
  },
}))

import { POST } from '../route'

const ESPACIO_ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'

function peticion(cuerpo: unknown) {
  return new Request('http://localhost/api/espacios/reclamaciones', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  }) as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
  estado.user = { id: 'u-1', email: 'ana@leal.es' }
  estado.espacio = { id: ESPACIO_ID, nombre: 'Teatro Leal', slug: 'teatro-leal', municipio: 'San Cristóbal de La Laguna' }
  estado.errorInsert = null
  estado.insertado = null
  envio.resultado = { ok: true }
  envio.llamadas = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/espacios/reclamaciones', () => {
  it('sin sesión: 401 y no guarda nada', async () => {
    estado.user = null
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: 'Directora, 600000000' }))
    expect(res.status).toBe(401)
    expect(estado.insertado).toBeNull()
  })

  it('cuerpo no JSON, espacio no válido o mensaje corto: 400', async () => {
    expect((await POST(peticion('no es json'))).status).toBe(400)
    expect((await POST(peticion({ espacio_id: 'x', mensaje: 'Directora, 600000000' }))).status).toBe(400)
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: 'corto' }))).status).toBe(400)
    expect(estado.insertado).toBeNull()
  })

  it('espacio inexistente o sin publicar: 404', async () => {
    estado.espacio = null
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: 'Directora, 600000000' }))).status).toBe(404)
  })

  it('crea la reclamación a nombre de quien tiene la sesión y avisa a moderación', async () => {
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: '  Directora, 600000000  ', profile_id: 'otro' }))
    expect(res.status).toBe(201)
    expect(estado.insertado).toEqual({ espacio_id: ESPACIO_ID, profile_id: 'u-1', mensaje: 'Directora, 600000000' })
    expect(envio.llamadas).toEqual([{
      espacioNombre: 'Teatro Leal',
      espacioSlug: 'teatro-leal',
      municipio: 'San Cristóbal de La Laguna',
      solicitante: 'Ana Pérez · ana@leal.es',
      mensaje: 'Directora, 600000000',
    }])
  })

  it('ya tiene una pendiente (índice único): 409 y sin correo', async () => {
    estado.errorInsert = { code: '23505', message: 'duplicate key value violates unique constraint "espacios_reclamaciones_una_pendiente"' }
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: 'Directora, 600000000' }))
    expect(res.status).toBe(409)
    expect(envio.llamadas).toHaveLength(0)
  })

  it('la RLS la rechaza por otro motivo: 500 genérico', async () => {
    estado.errorInsert = { code: '42501', message: 'new row violates row-level security policy' }
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: 'Directora, 600000000' }))).status).toBe(500)
  })

  it('si el correo falla, la reclamación queda guardada y se responde 201', async () => {
    envio.resultado = { ok: false, error: 'Resend respondió 500' }
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, mensaje: 'Directora, 600000000' }))
    expect(res.status).toBe(201)
    expect(estado.insertado).not.toBeNull()
    expect(console.error).toHaveBeenCalled()
  })
})
