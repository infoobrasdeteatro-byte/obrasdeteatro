'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_SECTIONS = [
  {
    label: 'Mi cuenta',
    items: [
      { href: '/dashboard', label: 'Inicio',    icon: '⊞' },
      { href: '/perfil',        label: 'Mi perfil',          icon: '◎' },
      { href: '/perfil/centro', label: 'Centro Profesional', icon: '⊙' },
      { href: '/perfil/red',    label: 'Mi red',             icon: '◌' },
      { href: '/perfil/mensajes', label: 'Mensajes',         icon: '✉' },
      { href: '/mis-obras',     label: 'Mis obras',          icon: '▣' },
      { href: '/mis-espectaculos', label: 'Mis espectáculos', icon: '▤' },
      { href: '/mis-castings',  label: 'Mis castings',       icon: '◉' },
      { href: '/mis-postulaciones', label: 'Mis postulaciones', icon: '◈' },
      { href: '/mis-convocatorias', label: 'Mis convocatorias', icon: '◉' },
      { href: '/mis-formaciones', label: 'Mis formaciones', icon: '◇' },
      { href: '/cuenta',        label: 'Gestión de cuenta',  icon: '⚙' },
    ],
  },
  {
    label: 'Explorar',
    items: [
      { href: '/directorio', label: 'Directorio', icon: '◈' },
      // El listado PUBLICO de convocatorias, no la gestion propia: con sesion
      // iniciada la barra publica no se ve, y sin esta entrada habria que
      // cerrar sesion para descubrir castings de otros.
      { href: '/cartelera',  label: 'Cartelera',  icon: '◆' },
      { href: '/castings',   label: 'Castings',   icon: '◆' },
      { href: '/convocatoria', label: 'Convocatorias', icon: '◆' },
      { href: '/formacion', label: 'Formación', icon: '◆' },
      { href: '/mediateca', label: 'Mediateca', icon: '◆' },
      { href: '/precios',    label: 'Planes',     icon: '◇' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const sinLeer = useSinLeer(pathname)

  return (
    <aside className="sidebar">
      {NAV_SECTIONS.map(section => (
        <div key={section.label} className="sid-section">
          <span className="sid-label">{section.label}</span>
          {section.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sid-item${pathname === item.href ? ' active' : ''}`}
            >
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
              {item.href === '/perfil/mensajes' && sinLeer > 0 && (
                <span className="sid-contador" aria-label={`${sinLeer} sin leer`}>{sinLeer > 99 ? '99+' : sinLeer}</span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  )
}

/**
 * Mensajes sin leer (Fase 3 de la red). Se consulta al cambiar de página y
 * cada minuto mientras la pestaña está visible. Sin sesión, 0.
 */
function useSinLeer(pathname: string): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    let vivo = true
    const leer = async () => {
      if (document.visibilityState !== 'visible') return
      const { data, error } = await createClient().rpc('mensajes_sin_leer')
      if (vivo && !error) setN(typeof data === 'number' ? data : 0)
    }
    void leer()
    const t = setInterval(leer, 60000)
    return () => { vivo = false; clearInterval(t) }
  }, [pathname])
  return n
}
