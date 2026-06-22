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
          <Link href="/dashboard"  className="nav-link">Dashboard</Link>
          <Link href="/directorio" className="nav-link">Directorio</Link>
          <Link href="/perfil"     className="nav-link">Mi perfil</Link>
          <Link href="/mis-obras"  className="nav-link">Mis obras</Link>
          <Link href="/precios"    className="nav-link">Planes</Link>
        </div>
        <div className="nav-right">
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
          <span className="nav-mobile-section-label">Mi cuenta</span>
          <Link href="/dashboard"  className="nav-mobile-link">Inicio</Link>
          <Link href="/perfil"     className="nav-mobile-link">Mi perfil</Link>
          <Link href="/mis-obras"  className="nav-mobile-link">Mis obras</Link>
          <hr className="nav-mobile-divider" />
          <span className="nav-mobile-section-label">Explorar</span>
          <Link href="/directorio" className="nav-mobile-link">Directorio</Link>
          <Link href="/precios"    className="nav-mobile-link">Planes</Link>
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
