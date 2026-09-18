import Link from 'next/link'
import { LEGAL_LINKS } from '@/lib/legal'

// Footer global, montado una sola vez en app/layout.tsx. Sustituye a los footers
// que cada página escribía por su cuenta: la LSSI exige que el aviso legal y el
// resto de textos legales sean accesibles desde cualquier punto del sitio, no
// solo desde dentro de otra página legal.
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <Link href="/" className="footer-logo">
          obras<span>de</span>teatro.com
        </Link>
        <p className="footer-copy">
          © 2026 obrasdeteatro.com — Ecosistema del teatro en español · 20 países
        </p>
      </div>
      <nav className="site-footer-legal" aria-label="Información legal">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
