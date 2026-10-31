import Link from 'next/link'
import type { EstadoSesion } from './sesion-cabecera'

// Accesos de cuenta de la cabecera pública. Con sesión replican los de
// NavAutenticado (Mi cuenta + Cerrar sesión por POST a /auth/logout).
// Mientras se comprueba la sesión se reserva el hueco con el mismo ancho que
// los botones sin sesión, invisibles y fuera del árbol accesible, para que no
// parpadee «Iniciar sesión» a quien ya está conectado.

export function CuentaBarra({ estado }: { estado: EstadoSesion }) {
  if (estado === 'comprobando') {
    return (
      <span className="nav-cuenta-reserva" aria-hidden="true" data-estado="comprobando" style={{ display: 'contents' }}>
        <span className="nav-btn-login" style={{ visibility: 'hidden' }}>Iniciar sesión</span>
        <span className="nav-btn-cta" style={{ visibility: 'hidden' }}>Registrarse</span>
      </span>
    )
  }

  if (estado === 'con-sesion') {
    return (
      <>
        <Link href="/dashboard" className="nav-link" style={{ fontWeight: 500 }}>
          Mi cuenta
        </Link>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="nav-btn-logout">
            Cerrar sesión
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <Link href="/auth/login" className="nav-btn-login">
        Iniciar sesión
      </Link>
      <Link href="/auth/registro" className="nav-btn-cta nav-btn-cta--pulse">
        Registrarse
      </Link>
    </>
  )
}

export function CuentaMovil({ estado, onNavegar }: { estado: EstadoSesion; onNavegar: () => void }) {
  if (estado === 'comprobando') {
    return (
      <div aria-hidden="true" data-estado="comprobando" style={{ visibility: 'hidden' }}>
        <span className="nav-mobile-link">Iniciar sesión</span>
        <span className="nav-mobile-cta">Crear cuenta gratis</span>
      </div>
    )
  }

  if (estado === 'con-sesion') {
    return (
      <>
        <Link href="/dashboard" className="nav-mobile-link" onClick={onNavegar}>
          Mi cuenta
        </Link>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="nav-mobile-cta" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            Cerrar sesión
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <Link href="/auth/login" className="nav-mobile-link" onClick={onNavegar}>
        Iniciar sesión
      </Link>
      <Link href="/auth/registro" className="nav-mobile-cta" onClick={onNavegar}>
        Crear cuenta gratis
      </Link>
    </>
  )
}
