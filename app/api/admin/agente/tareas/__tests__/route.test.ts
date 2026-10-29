import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Si la ruta llegara a crear el cliente de servicio sin token válido, el test falla.
const creado = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => { creado(); throw new Error('no debe usarse') } }))

import { GET } from '../route'
import { PATCH } from '../[id]/route'

const pedir = (auth?: string, metodo = 'GET') =>
  new NextRequest('https://www.obrasdeteatro.com/api/admin/agente/tareas', {
    method: metodo, headers: auth ? { authorization: auth, 'content-type': 'application/json' } : {}, body: metodo === 'PATCH' ? '{"estado":"resuelta"}' : undefined,
  })
const params = { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) }

afterEach(() => { vi.unstubAllEnvs(); creado.mockClear() })

describe('rutas del agente', () => {
  it('sin ADMIN_AGENT_TOKEN: 404 en GET y PATCH', async () => {
    vi.stubEnv('ADMIN_AGENT_TOKEN', '')
    expect((await GET(pedir('Bearer x'))).status).toBe(404)
    expect((await PATCH(pedir('Bearer x', 'PATCH'), params)).status).toBe(404)
    expect(creado).not.toHaveBeenCalled()
  })
  it('con la variable y un token inválido o sin cabecera: 401', async () => {
    vi.stubEnv('ADMIN_AGENT_TOKEN', 'token-de-prueba-largo')
    expect((await GET(pedir('Bearer otro'))).status).toBe(401)
    expect((await GET(pedir())).status).toBe(401)
    expect((await PATCH(pedir('Bearer otro', 'PATCH'), params)).status).toBe(401)
    expect(creado).not.toHaveBeenCalled()
  })
})
