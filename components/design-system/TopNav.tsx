'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  heroMode?: boolean
}

export default function TopNav({ heroMode = false }: Props) {
  const [isHero, setIsHero] = useState(heroMode)

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

  return (
    <nav className={`top-nav${isHero ? ' nav--hero' : ' nav--solid'}`}>
      <Link href="/" className="nav-logo">
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
      </div>
    </nav>
  )
}
