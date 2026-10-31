import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => { throw new Error('no debe llamarse al renderizar en servidor') },
}))

import TopNav from '../TopNav'
import { CuentaBarra, CuentaMovil } from '../TopNavCuenta'
import { vigilarSesion, type ClienteAuth, type EstadoSesion } from '../sesion-cabecera'

const barra = (estado: EstadoSesion) => renderToStaticMarkup(<CuentaBarra estado={estado} />)
const movil = (estado: EstadoSesion) => renderToStaticMarkup(<CuentaMovil estado={estado} onNavegar={() => {}} />)

describe('TopNav — renderizado en servidor', () => {
  it('pinta el estado «comprobando»: ni accesos de invitado ni de usuario', () => {
    const h = renderToStaticMarkup(<TopNav />)
    expect(h).toContain('data-estado="comprobando"')
    expect(h).not.toContain('href="/auth/login"')
    expect(h).not.toContain('href="/auth/registro"')
    expect(h).not.toContain('href="/dashboard"')
    expect(h).not.toContain('/auth/logout')
  })

  it('respeta heroMode', () => {
    expect(renderToStaticMarkup(<TopNav heroMode />)).toContain('top-nav nav--hero')
    expect(renderToStaticMarkup(<TopNav />)).toContain('top-nav nav--solid')
  })
})

describe('TopNav — barra', () => {
  it('comprobando: reserva el hueco con los botones invisibles y ocultos al lector de pantalla', () => {
    const h = barra('comprobando')
    expect(h).toContain('aria-hidden="true"')
    expect(h).toContain('class="nav-btn-login" style="visibility:hidden"')
    expect(h).toContain('class="nav-btn-cta" style="visibility:hidden"')
    expect(h).not.toContain('<a ')
    expect(h).not.toContain('<form')
  })

  it('sin sesión: exactamente «Iniciar sesión» y «Registrarse»', () => {
    const h = barra('sin-sesion')
    expect(h).toContain('<a class="nav-btn-login" href="/auth/login">Iniciar sesión</a>')
    expect(h).toContain('<a class="nav-btn-cta nav-btn-cta--pulse" href="/auth/registro">Registrarse</a>')
    expect(h).not.toContain('/auth/logout')
    expect(h).not.toContain('Mi cuenta')
  })

  it('con sesión: «Mi cuenta» y «Cerrar sesión» por POST a /auth/logout', () => {
    const h = barra('con-sesion')
    expect(h).toContain('href="/dashboard"')
    expect(h).toContain('Mi cuenta')
    expect(h).toContain('<form action="/auth/logout" method="POST">')
    expect(h).toContain('class="nav-btn-logout">Cerrar sesión</button>')
    expect(h).not.toContain('Iniciar sesión')
    expect(h).not.toContain('Registrarse')
  })
})

describe('TopNav — menú móvil («Cuenta»)', () => {
  it('comprobando: nada visible ni enlazado', () => {
    const h = movil('comprobando')
    expect(h).toContain('aria-hidden="true"')
    expect(h).toContain('visibility:hidden')
    expect(h).not.toContain('<a ')
    expect(h).not.toContain('<form')
  })

  it('sin sesión: «Iniciar sesión» y «Crear cuenta gratis»', () => {
    const h = movil('sin-sesion')
    expect(h).toContain('href="/auth/login"')
    expect(h).toContain('href="/auth/registro"')
    expect(h).toContain('Crear cuenta gratis')
    expect(h).not.toContain('/auth/logout')
  })

  it('con sesión: «Mi cuenta» y «Cerrar sesión»', () => {
    const h = movil('con-sesion')
    expect(h).toContain('href="/dashboard"')
    expect(h).toContain('<form action="/auth/logout" method="POST">')
    expect(h).toContain('Cerrar sesión')
    expect(h).not.toContain('Iniciar sesión')
    expect(h).not.toContain('Crear cuenta gratis')
  })
})

describe('vigilarSesion', () => {
  function clienteFalso(sesionInicial: unknown | null, falla = false) {
    let oyente: ((e: string, s: unknown | null) => void) | null = null
    const unsubscribe = vi.fn()
    const cliente: ClienteAuth = {
      auth: {
        getSession: () => falla
          ? Promise.reject(new Error('red'))
          : Promise.resolve({ data: { session: sesionInicial } }),
        onAuthStateChange: (cb) => { oyente = cb; return { data: { subscription: { unsubscribe } } } },
      },
    }
    return { cliente, unsubscribe, disparar: (e: string, s: unknown | null) => oyente?.(e, s) }
  }

  it('con sesión al montar emite «con-sesion»', async () => {
    const { cliente } = clienteFalso({ user: { id: 'u' } })
    const onCambio = vi.fn()
    vigilarSesion(cliente, onCambio)
    await Promise.resolve(); await Promise.resolve()
    expect(onCambio).toHaveBeenLastCalledWith('con-sesion')
  })

  it('sin sesión al montar emite «sin-sesion»; si la comprobación falla, también', async () => {
    const a = vi.fn(); vigilarSesion(clienteFalso(null).cliente, a)
    const b = vi.fn(); vigilarSesion(clienteFalso(null, true).cliente, b)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(a).toHaveBeenLastCalledWith('sin-sesion')
    expect(b).toHaveBeenLastCalledWith('sin-sesion')
  })

  it('sigue los cambios (login / logout) y deja de emitir tras la limpieza', async () => {
    const { cliente, unsubscribe, disparar } = clienteFalso(null)
    const onCambio = vi.fn()
    const limpiar = vigilarSesion(cliente, onCambio)
    await Promise.resolve(); await Promise.resolve()
    disparar('SIGNED_IN', { user: { id: 'u' } })
    expect(onCambio).toHaveBeenLastCalledWith('con-sesion')
    disparar('SIGNED_OUT', null)
    expect(onCambio).toHaveBeenLastCalledWith('sin-sesion')

    limpiar()
    expect(unsubscribe).toHaveBeenCalledOnce()
    const llamadas = onCambio.mock.calls.length
    disparar('SIGNED_IN', { user: { id: 'u' } })
    expect(onCambio.mock.calls.length).toBe(llamadas)
  })
})
