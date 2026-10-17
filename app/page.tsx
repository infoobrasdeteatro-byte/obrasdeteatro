import TopNav from '@/components/design-system/TopNav'
import Link from 'next/link'
import EcosistemaPulso from '@/components/homepage/EcosistemaPulso'
import EcosistemaStatsGrid from '@/components/homepage/EcosistemaStatsGrid'
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
  const obrasIndicador = superaUmbral(datos.obras, UMBRALES.obras)
    ? { value: datos.obras.toLocaleString('es-ES'), label: 'Obras' }
    : { value: 'Abierta', label: 'Biblioteca' }

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
            Obras, compañías, artistas, directores, festivales y convocatorias
            conectados en una sola plataforma para los 20 países de habla hispana.
          </p>

          <div className="hero-ctas">
            <Link href="/directorio" className="btn-hero-primary">
              Explorar profesionales
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link href="/auth/registro" className="btn-hero-secondary">
              Crear cuenta gratis
            </Link>
          </div>

          <p className="hero-microcopy" aria-hidden="true">
            Obras · convocatorias · compañías · profesionales
          </p>

          <div className="hero-indicators" role="list">
            {([
              { value: obrasIndicador.value, em: true, label: obrasIndicador.label },
              { value: '20',              label: 'Países' },
              { value: 'Activa',  em: true,  label: 'Comunidad' },
              { value: 'Gratis', em: true, label: 'Publicar convocatorias', href: '/convocatoria/nueva' },
            ] as const).map((item, i) => {
              const contenido = (
                <>
                  <div className="hero-indicator-value">
                    {'em' in item ? <em>{item.value}</em> : item.value}
                  </div>
                  <div className="hero-indicator-label">{item.label}</div>
                </>
              )
              return 'href' in item ? (
                <Link key={i} href={item.href} className="hero-indicator" role="listitem">{contenido}</Link>
              ) : (
                <div key={i} className="hero-indicator" role="listitem">{contenido}</div>
              )
            })}
          </div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span className="hero-scroll-text">Explorar</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── MEDIOS COLABORADORES (solo si hay alguno activo) ── */}
      <FranjaColaboradores colaboradores={medios} />

      {/* ── NARRATIVE ── */}
      <section className="narrative" aria-labelledby="narrative-heading">
        <div className="narrative-inner">
          <div className="narrative-head">
            <h2 className="narrative-headline" id="narrative-heading">
              Todo el teatro hispano, conectado.
            </h2>
            <p className="narrative-sub">
              Una plataforma donde compañías, artistas, obras, festivales y convocatorias
              conviven en un ecosistema digital pensado para la escena contemporánea.
            </p>
          </div>

          {/* Las cuatro puertas de la plataforma: biblioteca, directorio, convocatorias y países. */}
          <EcosistemaStatsGrid datos={datos} />
        </div>
      </section>

      {/* ── EL PULSO DEL ECOSISTEMA (vista previa visual) ── */}
      <EcosistemaPulso datos={datos} />

      {/* ── EN CARTEL: al final, después de lo profesional (solo si hay espectáculos) ── */}
      <FranjaEnCartel fichas={cartel.fichas} entradas={cartel.entradas} ahora={ahora} destacados={cartel.destacados} />

      {/* ── FOOTER ── */}
    </>
  )
}
