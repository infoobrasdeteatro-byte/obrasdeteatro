import Link from 'next/link'
import { REDES_SOCIALES } from '@/lib/redes-sociales'
import { LEGAL_LINKS } from '@/lib/legal'
import { hayColaboradoresActivos } from '@/lib/colaboradores/datos'
import { configBoletin } from '@/lib/boletin/datos'
import FormularioBoletin from '@/components/boletin/FormularioBoletin'

// Footer global, montado una sola vez en app/layout.tsx. Sustituye a los footers
// que cada página escribía por su cuenta: la LSSI exige que el aviso legal y el
// resto de textos legales sean accesibles desde cualquier punto del sitio, no
// solo desde dentro de otra página legal.
export default async function SiteFooter() {
  // «Colaboradores» solo con algún colaborador activo: si no, /colaboradores
  // da 404. Lectura pública cacheada 10 minutos, no una consulta por página.
  const [conColaboradores, boletin] = await Promise.all([hayColaboradoresActivos(), configBoletin()])

  return (
    <footer className="site-footer">
      {/* Boletín: solo cuando está activado en /admin/boletin. Con acceso «pago», un aviso en vez del formulario. */}
      {boletin.activo && (
        <section className="site-footer-boletin" aria-labelledby="pie-boletin">
          <div>
            <p id="pie-boletin" className="site-footer-boletin-titulo">{boletin.nombre}</p>
            <p className="site-footer-boletin-texto">La actualidad de las artes escénicas en español, en tu correo cada semana.</p>
          </div>
          {boletin.acceso === 'pago' ? (
            <p className="site-footer-boletin-texto">Exclusivo para los planes de pago. <Link href="/precios">Ver planes →</Link></p>
          ) : (
            <FormularioBoletin nombre={boletin.nombre} origen="pie" compacto />
          )}
        </section>
      )}
      {/* Franja negra de marca: logo (versión de letras blancas, la misma de la
          cinta de la portada) y «Síguenos» con las redes. */}
      <div className="site-footer-top">
        <Link href="/" className="footer-logo" aria-label="obrasdeteatro.com, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-obrasdeteatro-horizontal-blanco.svg" alt="obrasdeteatro.com" width={141} height={22} />
        </Link>
        <nav className="footer-redes" aria-label="Redes sociales">
          <span className="footer-redes-titulo">Síguenos</span>
          <ul>
            {REDES_SOCIALES.map(r => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`obrasdeteatro.com en ${r.nombre}`}
                  className="footer-red" style={{ '--red-marca': r.color } as React.CSSProperties}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d={r.path} /></svg>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {/* Debajo: el copyright, luego los textos legales y, al final,
          «Colaboradores». Las institucionales van fuera de LEGAL_LINKS: esa
          lista también alimenta la navegación entre páginas legales. */}
      <div className="site-footer-legal">
        <p className="footer-copy">© 2026 obrasdeteatro.com — Ecosistema del teatro en español · 20 países</p>
        <nav className="site-footer-grupo" aria-label="Información legal y sobre ObrasDeTeatro">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          {conColaboradores && <Link href="/colaboradores">Colaboradores</Link>}
        </nav>
      </div>
    </footer>
  )
}
