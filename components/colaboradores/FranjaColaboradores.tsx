import Link from 'next/link'
import { MINIMO_CARRUSEL, urlSegura, type ColaboradorPublico } from '@/lib/colaboradores/colaboradores'

/**
 * Franja «Medios colaboradores» de la portada.
 *
 * - Sin colaboradores: no se pinta.
 * - Menos de MINIMO_CARRUSEL: fila estática centrada.
 * - MINIMO_CARRUSEL o más: carrusel continuo en CSS puro. La lista va dos
 *   veces seguidas y la pista se desplaza media longitud, así que el bucle no
 *   tiene salto. La segunda copia es solo visual: aria-hidden y fuera del
 *   orden de tabulación. Se detiene al pasar el ratón o al enfocar un logo, y
 *   con prefers-reduced-motion queda quieta y sin la copia.
 *
 * Logos en gris que pasan a color al pasar el ratón; altura uniforme.
 */
export default function FranjaColaboradores({ colaboradores }: { colaboradores: ColaboradorPublico[] }) {
  if (colaboradores.length === 0) return null

  const carrusel = colaboradores.length >= MINIMO_CARRUSEL

  return (
    <section className="colab-franja" aria-labelledby="colab-franja-titulo">
      <h2 id="colab-franja-titulo" className="colab-franja-titulo">Medios colaboradores</h2>

      {carrusel ? (
        <div className="colab-carrusel">
          <ul className="colab-pista" style={{ ['--colab-duracion' as string]: `${colaboradores.length * 6}s` }}>
            {colaboradores.map(c => <Logo key={c.id} c={c} copia={false} />)}
            {colaboradores.map(c => <Logo key={`${c.id}-copia`} c={c} copia />)}
          </ul>
        </div>
      ) : (
        <ul className="colab-fila">
          {colaboradores.map(c => <Logo key={c.id} c={c} copia={false} />)}
        </ul>
      )}

      <Link href="/colaboradores" className="colab-franja-ver">Ver todos los colaboradores →</Link>
    </section>
  )
}

function Logo({ c, copia }: { c: ColaboradorPublico; copia: boolean }) {
  const web = urlSegura(c.url_web)
  const logo = urlSegura(c.logo_url)
  const contenido = logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={logo} alt={copia ? '' : c.nombre} loading="lazy" decoding="async" />
    : <span className="colab-logo-texto">{c.nombre}</span>

  return (
    <li className="colab-logo" aria-hidden={copia ? true : undefined} data-copia={copia ? '' : undefined}>
      {web ? (
        <a href={web} target="_blank" rel="noopener" title={c.nombre} tabIndex={copia ? -1 : undefined}>
          {contenido}
        </a>
      ) : contenido}
    </li>
  )
}
