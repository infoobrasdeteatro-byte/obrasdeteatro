'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavAutenticado() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav className="top-nav nav--solid">
        <Link href="/" className="nav-logo">
          obras<span>de</span>teatro.com
        </Link>
        <div className="nav-divider" />
        <div className="nav-links">
          <Link href="/directorio" className="nav-link">Profesionales</Link>
          <Link href="/obras" className="nav-link">Obras</Link>
          <Link href="/directorio?tipo=compania" className="nav-link">Compañías</Link>
          <Link href="/directorio?tipo=teatro" className="nav-link">Espacios Escénicos</Link>
          <Link href="/directorio" className="nav-link">Instituciones</Link>
          <Link href="/directorio" className="nav-link">Servicios</Link>
          <Link href="/" className="nav-link">Recursos</Link>
          <Link href="/" className="nav-link">Editorial</Link>
        </div>
        <div className="nav-right">
          <Link href="/perfil/centro" className="nav-link" style={{ fontWeight: 500 }}>
            Centro Profesional
          </Link>
          {/*
            RC-001A-003A: "Cerrar sesión" se mantiene aqui de forma temporal y
            documentada -- es hoy el unico punto de toda la aplicacion donde un
            usuario puede cerrar su propia sesion (SesionesPanel.tsx solo cierra
            sesiones ajenas, scope 'others', y remite explicitamente a este
            boton). Retirarlo sin darle antes un hogar real dentro de Centro
            Profesional seria una regresion funcional, no una limpieza visual.
            Pendiente de decision de Direccion sobre su destino definitivo.
          */}
          <form action="/auth/logout" method="POST">
            <button type="submit" className="nav-btn-logout">
              Cerrar sesión
            </button>
          </form>
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
            )}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="nav-mobile-menu">
          <span className="nav-mobile-section-label">Ecosistema</span>
          <Link href="/directorio" className="nav-mobile-link">Profesionales</Link>
          <Link href="/obras" className="nav-mobile-link">Obras</Link>
          <Link href="/directorio?tipo=compania" className="nav-mobile-link">Compañías</Link>
          <Link href="/directorio?tipo=teatro" className="nav-mobile-link">Espacios Escénicos</Link>
          <Link href="/directorio" className="nav-mobile-link">Instituciones</Link>
          <Link href="/directorio" className="nav-mobile-link">Servicios</Link>
          <Link href="/" className="nav-mobile-link">Recursos</Link>
          <Link href="/" className="nav-mobile-link">Editorial</Link>
          <hr className="nav-mobile-divider" />
          <span className="nav-mobile-section-label">Mi cuenta</span>
          <Link href="/perfil/centro" className="nav-mobile-link">Centro Profesional</Link>
          <hr className="nav-mobile-divider" />
          <form action="/auth/logout" method="POST">
            <button type="submit" className="nav-mobile-cta" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </>
  )
}
