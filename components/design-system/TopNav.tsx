'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  heroMode?: boolean
}

export default function TopNav({ heroMode = false }: Props) {
  const [isHero, setIsHero] = useState(heroMode)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!heroMode) {
      setIsHero(false)
      return
    }
    const hero = document.querySelector('.hero')
    if (!hero) { setIsHero(false); return }

    const update = () => {
      setIsHero(hero.getBoundingClientRect().bottom > 52)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [heroMode])

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
      <nav className={`top-nav${isHero ? ' nav--hero' : ' nav--solid'}`}>
        <Link href="/" className="nav-logo" onClick={() => setMobileOpen(false)}>
          obras<span>de</span>teatro.com
        </Link>
        <div className="nav-divider" />
        <div className="nav-links">
          <Link href="/directorio" className="nav-link">Profesionales</Link>
        </div>
        <div className="nav-right">
          <Link href="/auth/login" className="nav-btn-login">
            Iniciar sesión
          </Link>
          <Link href="/auth/registro" className="nav-btn-cta">
            Registrarse
          </Link>
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
          <span className="nav-mobile-section-label">Explorar</span>
          <Link href="/directorio" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>
            Directorio de profesionales
          </Link>
          <hr className="nav-mobile-divider" />
          <span className="nav-mobile-section-label">Cuenta</span>
          <Link href="/auth/login" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>
            Iniciar sesión
          </Link>
          <Link href="/auth/registro" className="nav-mobile-cta" onClick={() => setMobileOpen(false)}>
            Crear cuenta gratis
          </Link>
        </div>
      )}
    </>
  )
}
