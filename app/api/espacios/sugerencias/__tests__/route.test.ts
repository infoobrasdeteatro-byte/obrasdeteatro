import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Sesión (opcional) ───────────────────────────────────────────────────────
const sesion = vi.hoisted(() => ({ user: null as { id: string; email: string } | null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sesion.user } }) } }),
}))

// ── Clave de servicio en memoria ────────────────────────────────────────────
//    espacio: from('espacios_escenicos').select().eq().eq().maybeSingle()
//    insert:  from('espacios_sugerencias').insert({...}).select('estado').single()
const bd = vi.hoisted(() => ({
  espacio: null as Record<string, unknown> | null,
  insertado: null as Record<string, unknown> | null,
  estadoGuardado: 'pendiente',
  error: null as { message: string } | null,
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (tabla: string) => {
      if (tabla === 'espacios_sugerencias') {
        return {
          insert: (fila: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                if (bd.error) return { data: null, error: bd.error }
                bd.insertado = fila
                return { data: { estado: bd.estadoGuardado }, error: null }
              },
            }),
          }),
        }
      }
      const cadena = { select: () => cadena, eq: () => cadena, maybeSingle: async () => ({ data: bd.espacio, error: null }) }
      return cadena
    },
  }),
}))

const envio = vi.hoisted(() => ({ llamadas: [] as Record<string, unknown>[] }))
vi.mock('@/lib/espacios/aviso-reclamacion', () => ({
  enviarAvisoSugerencia: async (d: Record<string, unknown>) => {
    envio.llamadas.push(d)
    return { ok: true }
  },
}))

import { POST } from '../route'
import { hashIp } from '@/lib/espacios/ip'

const ESPACIO_ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'
const TEXTO = 'El teléfono de taquilla ha cambiado'

function peticion(cuerpo: unknown, cabeceras: Record<string, string> = { 'x-real-ip': '203.0.113.7' }) {
  return new Request('http://localhost/api/espacios/sugerencias', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabeceras },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  }) as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
  process.env.SUGERENCIAS_IP_SECRET = 'secreto-de-prueba'
  sesion.user = null
  bd.espacio = { id: ESPACIO_ID, nombre: 'Teatro Leal', slug: 'teatro-leal', municipio: 'San Cristóbal de La Laguna' }
  bd.insertado = null
  bd.estadoGuardado = 'pendiente'
  bd.error = null
  envio.llamadas = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/espacios/sugerencias', () => {
  it('sin sesión: guarda sin perfil, con el hash de la IP (nunca la IP) y avisa a moderación', async () => {
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, texto: `  ${TEXTO}  `, email: 'ana@correo.es', sitio_web: '' }))
    expect(res.status).toBe(201)
    expect(bd.insertado).toEqual({
      espacio_id: ESPACIO_ID,
      texto: TEXTO,
      email: 'ana@correo.es',
      profile_id: null,
      ip_hash: hashIp('203.0.113.7', 'secreto-de-prueba'),
    })
    expect(JSON.stringify(bd.insertado)).not.toContain('203.0.113.7')
    expect(envio.llamadas).toHaveLength(1)
    expect(envio.llamadas[0]).toMatchObject({ espacioNombre: 'Teatro Leal', remitente: 'Visitante sin sesión · responder a ana@correo.es', mensaje: TEXTO })
  })

  it('con sesión: guarda el perfil; el email vacío se guarda como null', async () => {
    sesion.user = { id: 'u-1', email: 'ana@leal.es' }
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO, email: '' }))).status).toBe(201)
    expect(bd.insertado).toMatchObject({ profile_id: 'u-1', email: null })
    expect(envio.llamadas[0].remitente).toBe('Usuario ana@leal.es')
  })

  it('campo trampa relleno: responde como si nada y no guarda ni avisa', async () => {
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO, sitio_web: 'https://spam.example' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true })
    expect(bd.insertado).toBeNull()
    expect(envio.llamadas).toHaveLength(0)
  })

  it('cuarta en una hora desde la misma conexión (el trigger lanza): 429', async () => {
    bd.error = { message: 'limite_sugerencias' }
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO }))
    expect(res.status).toBe(429)
    expect(envio.llamadas).toHaveLength(0)
  })

  it('descartada al entrar por una regla de moderación: se responde igual, pero sin aviso', async () => {
    bd.estadoGuardado = 'descartada'
    const res = await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO }))
    expect(res.status).toBe(201)
    expect(envio.llamadas).toHaveLength(0)
  })

  it('cuerpo no JSON, espacio no válido, texto corto o email malo: 400 sin guardar', async () => {
    expect((await POST(peticion('no json'))).status).toBe(400)
    expect((await POST(peticion({ espacio_id: 'x', texto: TEXTO }))).status).toBe(400)
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, texto: 'corto' }))).status).toBe(400)
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO, email: 'no-es-email' }))).status).toBe(400)
    expect(bd.insertado).toBeNull()
  })

  it('espacio inexistente o sin publicar: 404', async () => {
    bd.espacio = null
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO }))).status).toBe(404)
  })

  it('otro error de la base: 500 genérico', async () => {
    bd.error = { message: 'violates check constraint' }
    expect((await POST(peticion({ espacio_id: ESPACIO_ID, texto: TEXTO }))).status).toBe(500)
  })
})
