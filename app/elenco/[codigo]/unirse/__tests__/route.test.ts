import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const estado = { user: null as { id: string } | null, fundador: [{ codigo: 'anagarcia', nombre: 'Ana', slug: 'ana' }] as unknown[] }
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: estado.user } }) },
    rpc: async () => ({ data: estado.fundador }),
  }),
}))
// Enlaces antiguos con número: el 007 es la plaza de Ana.
vi.mock('@/lib/elenco/enlace-antiguo', () => ({
  codigoDeEnlaceAntiguo: async (v: string | null | undefined) => (v === '007' ? 'anagarcia' : null),
}))

import { GET } from '../route'

const pedir = (url: string, cookie?: string) => {
  const req = new NextRequest(new URL(url, 'https://www.obrasdeteatro.com'), cookie ? { headers: { cookie } } : undefined)
  return GET(req, { params: Promise.resolve({ codigo: url.split('/')[2] }) })
}

beforeEach(() => { estado.user = null; estado.fundador = [{ codigo: 'anagarcia', nombre: 'Ana', slug: 'ana' }] })

describe('/elenco/<código>/unirse — atribución por cookie', () => {
  it('profesional: guarda el código en la cookie 30 días y lleva al registro, sin número', async () => {
    const r = await pedir('/elenco/anagarcia/unirse?como=profesional')
    expect(r.headers.get('location')).toBe('https://www.obrasdeteatro.com/auth/registro?elenco=anagarcia&tipo=profesional')
    const c = r.cookies.get('odt_elenco')
    expect(c?.value).toBe('anagarcia')
    expect(c?.maxAge).toBe(60 * 60 * 24 * 30)
    expect(c?.httpOnly).toBe(true)
  })

  it('el código se escribe como sea: mayúsculas y tildes', async () => {
    const r = await pedir('/elenco/AnaGarc%C3%ADa/unirse?como=profesional')
    expect(r.cookies.get('odt_elenco')?.value).toBe('anagarcia')
  })

  it('enlace antiguo con número: se atribuye por su código y el número no aparece', async () => {
    const r = await pedir('/elenco/007/unirse?como=profesional')
    expect(r.headers.get('location')).toBe('https://www.obrasdeteatro.com/auth/registro?elenco=anagarcia&tipo=profesional')
    expect(r.cookies.get('odt_elenco')?.value).toBe('anagarcia')
  })

  it('organización y sala', async () => {
    expect((await pedir('/elenco/anagarcia/unirse?como=organizacion')).headers.get('location')).toContain('tipo=organizacion')
    const sala = await pedir('/elenco/anagarcia/unirse?como=sala&q=Teatro%20Real')
    expect(sala.headers.get('location')).toBe('https://www.obrasdeteatro.com/espacios?q=Teatro+Real')
    expect(sala.cookies.get('odt_elenco')?.value).toBe('anagarcia')
  })

  it('cada alta cuenta para un solo programa: deja de contar un enlace de embajador anterior', async () => {
    const r = await pedir('/elenco/anagarcia/unirse?como=profesional', 'odt_ref=AB12CD34')
    expect(r.cookies.get('odt_elenco')?.value).toBe('anagarcia')
    expect(r.cookies.get('odt_ref')?.value).toBe('')
  })

  it('primer enlace: no sustituye la cookie de otro fundador (código o número antiguo)', async () => {
    expect((await pedir('/elenco/anagarcia/unirse?como=profesional', 'odt_elenco=luisperez')).cookies.get('odt_elenco')).toBeUndefined()
    expect((await pedir('/elenco/anagarcia/unirse?como=profesional', 'odt_elenco=003')).cookies.get('odt_elenco')).toBeUndefined()
  })

  it('con la sesión abierta no atribuye nada y vuelve a la página', async () => {
    estado.user = { id: 'u1' }
    const r = await pedir('/elenco/anagarcia/unirse?como=profesional')
    expect(r.headers.get('location')).toBe('https://www.obrasdeteatro.com/elenco/anagarcia')
    expect(r.cookies.get('odt_elenco')).toBeUndefined()
  })

  it('un código sin fundador o inválido no deja cookie', async () => {
    estado.fundador = []
    expect((await pedir('/elenco/nadie/unirse?como=profesional')).cookies.get('odt_elenco')).toBeUndefined()
    expect((await pedir('/elenco/ab/unirse')).cookies.get('odt_elenco')).toBeUndefined()
    expect((await pedir('/elenco/050/unirse')).cookies.get('odt_elenco')).toBeUndefined()
  })
})
