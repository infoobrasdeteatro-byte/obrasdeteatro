'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_SECTIONS = [
  {
    label: 'Mi cuenta',
    items: [
      { href: '/dashboard', label: 'Inicio',    icon: '⊞' },
      { href: '/perfil',    label: 'Mi perfil', icon: '◎' },
      { href: '/mis-obras', label: 'Mis obras', icon: '▣' },
    ],
  },
  {
    label: 'Explorar',
    items: [
      { href: '/directorio', label: 'Directorio', icon: '◈' },
      { href: '/precios',    label: 'Planes',     icon: '◇' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

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
            </Link>
          ))}
        </div>
      ))}
    </aside>
  )
}
