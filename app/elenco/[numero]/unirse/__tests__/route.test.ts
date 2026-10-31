import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const estado = { user: null as { id: string } | null, fundador: [{ numero: 7, nombre: 'Ana', slug: 'ana' }] as unknown[] }
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: estado.user } }) },
    rpc: async () => ({ data: estado.fundador }),
  }),
}))

import { GET } from '../route'

const pedir = (url: string, cookie?: string) => {
  const req = new NextRequest(new URL(url, 'https://www.obrasdeteatro.com'), cookie ? { headers: { cookie } } : undefined)
  return GET(req, { params: Promise.resolve({ numero: url.split('/')[2] }) })
}

beforeEach(() => { estado.user = null; estado.fundador = [{ numero: 7, nombre: 'Ana', slug: 'ana' }] })

describe('/elenco/<nº>/unirse — atribución por cookie', () => {
  it('profesional: guarda la cookie 30 días y lleva al registro', async () => {
    const r = await pedir('/elenco/007/unirse?como=profesional')
    expect(r.headers.get('location')).toBe('https://www.obrasdeteatro.com/auth/registro?elenco=007&tipo=profesional')
    const c = r.cookies.get('odt_elenco')
    expect(c?.value).toBe('007')
    expect(c?.maxAge).toBe(60 * 60 * 24 * 30)
    expect(c?.httpOnly).toBe(true)
  })

  it('organización y sala', async () => {
    expect((await pedir('/elenco/007/unirse?como=organizacion')).headers.get('location')).toContain('tipo=organizacion')
    const sala = await pedir('/elenco/007/unirse?como=sala&q=Teatro%20Real')
    expect(sala.headers.get('location')).toBe('https://www.obrasdeteatro.com/espacios?q=Teatro+Real')
    expect(sala.cookies.get('odt_elenco')?.value).toBe('007')
  })

  it('primer enlace: no sustituye la cookie de otro fundador', async () => {
    const r = await pedir('/elenco/007/unirse?como=profesional', 'odt_elenco=003')
    expect(r.cookies.get('odt_elenco')).toBeUndefined()
  })

  it('con la sesión abierta no atribuye nada y vuelve a la página', async () => {
    estado.user = { id: 'u1' }
    const r = await pedir('/elenco/007/unirse?como=profesional')
    expect(r.headers.get('location')).toBe('https://www.obrasdeteatro.com/elenco/007')
    expect(r.cookies.get('odt_elenco')).toBeUndefined()
  })

  it('una plaza sin fundador o un número inválido no deja cookie', async () => {
    estado.fundador = []
    expect((await pedir('/elenco/050/unirse?como=profesional')).cookies.get('odt_elenco')).toBeUndefined()
    expect((await pedir('/elenco/abc/unirse')).cookies.get('odt_elenco')).toBeUndefined()
  })
})
