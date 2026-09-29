import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * /scenaia sin sesión redirige al login CON la vuelta (`next=/scenaia`).
 * Las demás causas de bloqueo y el acceso permitido no cambian.
 *
 * Se simulan la sesión, el veredicto de acceso y `redirect` (que, como el
 * real, corta la ejecución lanzando). Los componentes de la página se
 * sustituyen por marcas para no arrastrar el cliente de ScenaIA.
 */

const { getUser, resolveScenaiaAccess, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  resolveScenaiaAccess: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}))
vi.mock('@/lib/auth/scenaia-access', () => ({ resolveScenaiaAccess }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/components/NavAutenticado', () => ({ default: () => <nav data-marca="nav" /> }))
vi.mock('@/components/design-system/Sidebar', () => ({ default: () => <aside data-marca="sidebar" /> }))
vi.mock('../ScenaiaClient', () => ({ default: () => <div data-marca="scenaia-client" /> }))

import ScenaiaPage from '../page'

beforeEach(() => {
  getUser.mockReset()
  resolveScenaiaAccess.mockReset()
  redirect.mockClear()
})

describe('/scenaia — redirección según el veredicto de acceso', () => {
  it('sin sesión → /auth/login?next=%2Fscenaia', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    resolveScenaiaAccess.mockResolvedValue({ allowed: false, reason: 'no_autenticado' })

    await expect(ScenaiaPage()).rejects.toThrow('REDIRECT:/auth/login?next=%2Fscenaia')
    expect(resolveScenaiaAccess).toHaveBeenCalledWith(null)
    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledWith('/auth/login?next=%2Fscenaia')
  })

  it('sin verificar → /verificacion (sin cambios)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    resolveScenaiaAccess.mockResolvedValue({ allowed: false, reason: 'no_verificado' })

    await expect(ScenaiaPage()).rejects.toThrow('REDIRECT:/verificacion')
    expect(resolveScenaiaAccess).toHaveBeenCalledWith('u-1')
    expect(redirect).toHaveBeenCalledTimes(1)
  })

  it('cualquier otra causa → /dashboard (sin cambios)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    resolveScenaiaAccess.mockResolvedValue({ allowed: false, reason: 'otra' })

    await expect(ScenaiaPage()).rejects.toThrow('REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledTimes(1)
  })

  it('con sesión y acceso permitido → la página carga, sin redirección', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    resolveScenaiaAccess.mockResolvedValue({ allowed: true })

    const html = renderToStaticMarkup(await ScenaiaPage())
    expect(redirect).not.toHaveBeenCalled()
    expect(html).toContain('ScenaIA')
    expect(html).toContain('data-marca="nav"')
    expect(html).toContain('data-marca="sidebar"')
    expect(html).toContain('data-marca="scenaia-client"')
  })
})
