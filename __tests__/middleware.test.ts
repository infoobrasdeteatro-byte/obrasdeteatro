import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

/**
 * Middleware: el parámetro `next` se conserva en los dos sentidos.
 *   - Con sesión en /auth: vuelve a `next` si es una ruta interna válida
 *     (safeNextPath) y no apunta a /auth; si no, al panel.
 *   - Sin sesión en una ruta privada: al login con `next` = la ruta pedida.
 * Se simula solo la sesión; el resto del middleware es el real.
 */
let usuario: { id: string } | null = null
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: usuario } }) } }),
}))

const BASE = 'https://www.obrasdeteatro.com'
const pedir = (ruta: string) => middleware(new NextRequest(BASE + ruta))
const destino = async (ruta: string) => {
  const r = await pedir(ruta)
  return { status: r.status, location: r.headers.get('location') }
}
/** El middleware deja pasar la petición: sin redirección. */
const pasa = async (ruta: string) => {
  const r = await pedir(ruta)
  return r.status === 200 && r.headers.get('location') === null && r.headers.get('x-middleware-next') === '1'
}

beforeEach(() => {
  usuario = null
})

describe('con sesión en /auth: vuelve a `next` si es una ruta interna válida', () => {
  beforeEach(() => {
    usuario = { id: 'u-1' }
  })

  it.each([
    ['/auth/login?next=/precios', '/precios'],
    ['/auth/login?next=%2Fprecios%3Fplan%3Dpremium', '/precios?plan=premium'],
    ['/auth/login?next=/cuenta/seguridad', '/cuenta/seguridad'],
  ])('%s → %s', async (ruta, esperado) => {
    expect(await destino(ruta)).toEqual({ status: 307, location: BASE + esperado })
  })

  it.each([
    ['sin next', '/auth/login'],
    ['next vacío', '/auth/login?next='],
    ['next externo absoluto', '/auth/login?next=https://otro.com/'],
    ['next con doble barra', '/auth/login?next=//otro.com'],
    ['next con doble barra codificada', '/auth/login?next=%2F%2Fotro.com'],
    ['next con barra invertida', '/auth/login?next=%2F%5Cotro.com'],
    ['next con tabulador (carácter de control)', '/auth/login?next=%2F%09%2Fotro.com'],
    ['next con salto de línea (carácter de control)', '/auth/login?next=%2F%0A%2Fotro.com'],
    ['next relativo sin barra', '/auth/login?next=precios'],
    ['next a /auth/login', '/auth/login?next=/auth/login'],
    ['next a /auth/registro con otro next dentro', '/auth/login?next=%2Fauth%2Fregistro%3Fnext%3D%2Fprecios'],
  ])('%s → /dashboard', async (_caso, ruta) => {
    expect(await destino(ruta)).toEqual({ status: 307, location: BASE + '/dashboard' })
  })

  it('/auth/registro?next=… se comporta igual que el login', async () => {
    expect(await destino('/auth/registro?next=/precios')).toEqual({ status: 307, location: BASE + '/precios' })
    expect(await destino('/auth/registro?next=//otro.com')).toEqual({ status: 307, location: BASE + '/dashboard' })
    expect(await destino('/auth/registro')).toEqual({ status: 307, location: BASE + '/dashboard' })
  })

  it('/auth/logout, /auth/callback y /auth/update-password siguen sin redirigir, aunque lleven next', async () => {
    for (const ruta of ['/auth/logout', '/auth/logout?next=/precios', '/auth/callback?code=abc', '/auth/callback?next=/precios', '/auth/update-password', '/auth/update-password?next=/precios']) {
      expect(await pasa(ruta), ruta).toBe(true)
    }
  })

  it('con sesión, las rutas privadas siguen pasando sin redirección', async () => {
    for (const ruta of ['/dashboard', '/cuenta', '/mis-obras', '/obras/nueva', '/admin']) {
      expect(await pasa(ruta), ruta).toBe(true)
    }
  })
})

describe('sin sesión en una ruta privada: al login con `next` = la ruta pedida', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/cuenta', '/cuenta'],
    ['/cuenta/seguridad', '/cuenta/seguridad'],
    ['/mis-obras', '/mis-obras'],
    ['/obras/nueva', '/obras/nueva'],
    ['/obras/la-dama-boba/editar', '/obras/la-dama-boba/editar'],
    ['/castings/nuevo', '/castings/nuevo'],
    ['/perfil', '/perfil'],
    ['/admin', '/admin'],
  ])('%s → /auth/login?next=%s', async (ruta, next) => {
    expect(await destino(ruta)).toEqual({ status: 307, location: `${BASE}/auth/login?next=${encodeURIComponent(next)}` })
  })

  it('conserva también la query de la ruta pedida', async () => {
    expect(await destino('/mis-postulaciones?estado=pendiente')).toEqual({
      status: 307,
      location: `${BASE}/auth/login?next=${encodeURIComponent('/mis-postulaciones?estado=pendiente')}`,
    })
  })

  it('el next que llega al login es el que el formulario ya sabe validar y seguir', async () => {
    const { location } = await destino('/cuenta/sesiones')
    const next = new URL(location as string).searchParams.get('next')
    expect(next).toBe('/cuenta/sesiones')
  })
})

describe('sin sesión: lo que ya estaba verificado no cambia', () => {
  it('/scenaia no la redirige el middleware: el 307 al login lo hace la propia página (app/scenaia/page.tsx), igual que antes', async () => {
    expect(await pasa('/scenaia')).toBe(true)
  })

  it('las rutas públicas y las de /auth pasan sin redirección', async () => {
    for (const ruta of ['/', '/obras', '/obras/la-dama-boba', '/perfil/alguien', '/castings', '/precios', '/auth/login', '/auth/login?next=/precios', '/auth/registro']) {
      expect(await pasa(ruta), ruta).toBe(true)
    }
  })
})
