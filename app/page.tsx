import TopNav from '@/components/design-system/TopNav'
import Link from 'next/link'
import EcosistemaPulso from '@/components/homepage/EcosistemaPulso'
import { obtenerDatosPortada, superaUmbral, UMBRALES } from '@/lib/portada/datos'
import { colaboradoresActivos } from '@/lib/colaboradores/datos'
import FranjaColaboradores from '@/components/colaboradores/FranjaColaboradores'
import FranjaEnCartel from '@/components/cartelera/FranjaEnCartel'
import { enCartelPortada } from '@/lib/cartelera/portada'

// Las cifras y listas de la portada son reales: se vuelven a leer cada 10 minutos.
export const revalidate = 600

export default async function Home() {
  const ahora = Date.now()
  const [datos, colaboradores, cartel] = await Promise.all([obtenerDatosPortada(), colaboradoresActivos(), enCartelPortada(ahora)])
  // La franja se titula «Medios colaboradores»: solo los de tipo medio.
  const medios = colaboradores.filter(c => c.tipo === 'medio')
  // Las cuatro puertas de la plataforma. La cifra real sustituye al texto
  // cuando supera su umbral (UMBRALES), como en el resto de la portada.
  const miles = (n: number) => n.toLocaleString('es-ES')
  const puertas = [
    superaUmbral(datos.obras, UMBRALES.obras)
      ? { value: miles(datos.obras), label: 'Obras en la biblioteca', href: '/obras' }
      : { value: 'Biblioteca abierta', label: 'Clásicos y autores actuales', href: '/obras' },
    superaUmbral(datos.companias, UMBRALES.companias)
      ? { value: miles(datos.companias), label: 'Compañías en el directorio', href: '/directorio' }
      : { value: 'Directorio profesional', label: 'Compañías, salas y profesionales', href: '/directorio' },
    superaUmbral(datos.convocatoriasAbiertas, UMBRALES.convocatorias)
      ? { value: miles(datos.convocatoriasAbiertas), label: 'Convocatorias abiertas', href: '/convocatoria' }
      : { value: 'Convocatorias', label: 'Festivales, premios y becas', href: '/convocatoria' },
    { value: '20 países', label: 'Conectados', href: '/directorio' },
  ]

  return (
    <>
      <TopNav heroMode />

      {/* ── HERO ── */}
      <section className="hero" aria-label="Presentación de obrasdeteatro.com">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-line-left" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot" />
            <span className="hero-eyebrow-text">Plataforma activa · Comunidad hispanohablante</span>
          </div>

          <h1 className="hero-headline">
            El ecosistema digital<br />
            del teatro en <em>español.</em>
          </h1>

          <p className="hero-sub">
            Obras, dramaturgos, artistas, directores, compañías, salas, festivales, castings y convocatorias,
            todos conectados en una sola plataforma para los 20 países de habla hispana.
          </p>

          {/* Primero «Crear cuenta gratis»: es el botón que se queda grabado. */}
          <div className="hero-ctas">
            <Link href="/auth/registro" className="btn-hero-primary">
              Crear cuenta gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link href="/directorio" className="btn-hero-secondary">
              Explorar profesionales
            </Link>
          </div>

          <nav className="hero-indicators hero-indicators--puertas" aria-label="Secciones de la plataforma">
            {puertas.map(p => (
              <Link key={p.href + p.value} href={p.href} className="hero-indicator">
                <div className="hero-indicator-value"><em>{p.value}</em></div>
                <div className="hero-indicator-label">{p.label}</div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span className="hero-scroll-text">Explorar</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── MEDIOS COLABORADORES (solo si hay alguno activo) ── */}
      <FranjaColaboradores colaboradores={medios} />

      {/* ── EL PULSO DEL ECOSISTEMA (vista previa visual) ── */}
      <EcosistemaPulso datos={datos} />

      {/* ── EN CARTEL: al final, después de lo profesional (solo si hay espectáculos) ── */}
      <FranjaEnCartel fichas={cartel.fichas} entradas={cartel.entradas} ahora={ahora} destacados={cartel.destacados} />

      {/* ── FOOTER ── */}
    </>
  )
}
