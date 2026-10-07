import Link from 'next/link'
import BrandIcon from '@/components/brand/BrandIcon'
import { LEGAL_LINKS } from '@/lib/legal'
import { hayColaboradoresActivos } from '@/lib/colaboradores/datos'

// Footer global, montado una sola vez en app/layout.tsx. Sustituye a los footers
// que cada página escribía por su cuenta: la LSSI exige que el aviso legal y el
// resto de textos legales sean accesibles desde cualquier punto del sitio, no
// solo desde dentro de otra página legal.
export default async function SiteFooter() {
  // «Colaboradores» solo con algún colaborador activo: si no, /colaboradores
  // da 404. Lectura pública cacheada 10 minutos, no una consulta por página.
  const conColaboradores = await hayColaboradoresActivos()

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <Link href="/" className="footer-logo">
          <BrandIcon />
          obras<span>de</span>teatro.com
        </Link>
        <p className="footer-copy">
          © 2026 obrasdeteatro.com — Ecosistema del teatro en español · 20 países
        </p>
      </div>
      {/* Páginas institucionales y legales en la misma fila. Las institucionales
          van fuera de LEGAL_LINKS: esa lista también alimenta la navegación
          entre páginas legales. */}
      <div className="site-footer-legal">
        {conColaboradores && (
          <nav className="site-footer-grupo" aria-label="Sobre ObrasDeTeatro">
            <Link href="/colaboradores">Colaboradores</Link>
          </nav>
        )}
        <nav className="site-footer-grupo" aria-label="Información legal">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
