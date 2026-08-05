import TopNav from '@/components/design-system/TopNav'
import Link from 'next/link'
import EcosistemaPulso from '@/components/homepage/EcosistemaPulso'

export default function Home() {
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
              { value: '+4.000', em: true,  label: 'Obras' },
              { value: '20',              label: 'Países' },
              { value: 'Activa',  em: true,  label: 'Comunidad' },
              { value: 'Tiempo real', em: true, label: 'Convocatorias' },
            ] as const).map((item, i) => (
              <div key={i} className="hero-indicator" role="listitem">
                <div className="hero-indicator-value">
                  {'em' in item ? <em>{item.value}</em> : item.value}
                </div>
                <div className="hero-indicator-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <span className="hero-scroll-text">Explorar</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

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

          <div className="narrative-blocks">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                ),
                title: 'Directorio profesional',
                text: 'Actores, directores, dramaturgos, compañías y salas conectados en 20 países de habla hispana.',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ),
                title: 'Convocatorias en tiempo real',
                text: 'Casting, residencias, festivales y oportunidades actualizadas desde toda Iberoamérica.',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ),
                title: 'ScenaIA',
                text: 'Asistencia inteligente para profesionales del sector teatral hispano. Análisis, recomendaciones y herramientas especializadas.',
              },
            ].map((block, i) => (
              <div key={i} className="narrative-block">
                <div className="narrative-block-icon" aria-hidden="true">{block.icon}</div>
                <div className="narrative-block-title">{block.title}</div>
                <p className="narrative-block-text">{block.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EL PULSO DEL ECOSISTEMA (vista previa visual) ── */}
      <EcosistemaPulso />

      {/* ── FOOTER ── */}
      <footer className="app-footer">
        <Link href="/" className="footer-logo">
          obras<span>de</span>teatro.com
        </Link>
        <p className="footer-copy">
          © 2026 obrasdeteatro.com — Ecosistema del teatro en español · 20 países
        </p>
      </footer>
    </>
  )
}
