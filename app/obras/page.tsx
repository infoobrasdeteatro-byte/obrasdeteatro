import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'

export const metadata: Metadata = {
  title: 'Biblioteca de Obras | ObrasDeTeatro®',
  description:
    'La biblioteca de referencia del teatro en español. 59 géneros, obras clásicas y contemporáneas, dramaturgos y colecciones organizadas para profesionales e investigadores.',
}

const TAXONOMIA: { section: string; items: string[] }[] = [
  {
    section: 'Teatro Dramático',
    items: ['Drama', 'Comedia', 'Tragicomedia', 'Melodrama', 'Teatro psicológico', 'Teatro social', 'Teatro político', 'Teatro histórico', 'Teatro religioso'],
  },
  {
    section: 'Teatro Clásico y Literario',
    items: ['Teatro clásico', 'Teatro contemporáneo', 'Teatro costumbrista', 'Teatro del absurdo', 'Adaptaciones', 'Teatro poético'],
  },
  {
    section: 'Formatos Escénicos',
    items: ['Monólogos', 'Microteatro', 'Teatro breve', 'Teatro leído', 'Radioteatro', 'Performance escénica'],
  },
  {
    section: 'Teatro Musical y Expresivo',
    items: ['Teatro musical', 'Zarzuela', 'Ópera', 'Teatro gestual', 'Teatro físico', 'Teatro de improvisación'],
  },
  {
    section: 'Público y Contexto',
    items: ['Teatro infantil', 'Teatro juvenil', 'Teatro familiar', 'Teatro educativo', 'Teatro universitario', 'Teatro amateur', 'Teatro profesional'],
  },
  {
    section: 'Nuevos Lenguajes',
    items: ['Teatro experimental', 'Teatro documental', 'Teatro inmersivo', 'Teatro de calle', 'Teatro inclusivo', 'Teatro de marionetas', 'Teatro de objetos'],
  },
  {
    section: 'Tradición Escénica',
    items: ['Auto sacramental', 'Entremés', 'Sainete', 'Vodevil', "Commedia dell'arte"],
  },
  {
    section: 'Nuevas Tendencias',
    items: ['Teatro digital', 'Teatro interactivo', 'Teatro multimedia', 'Teatro comunitario', 'Teatro foro', 'Teatro testimonial', 'Teatro verbatim'],
  },
  {
    section: 'Especializados',
    items: ['Teatro científico', 'Teatro terapéutico', 'Teatro penitenciario', 'Teatro sensorial', 'Teatro de sombras', 'Teatro de títeres'],
  },
]

const OBRAS_PLACEHOLDER = [
  { titulo: 'La casa de Bernarda Alba', autor: 'Federico García Lorca',       genero: 'Drama',          año: '1936' },
  { titulo: 'La vida es sueño',         autor: 'Pedro Calderón de la Barca', genero: 'Teatro clásico', año: '1636' },
  { titulo: 'Bodas de sangre',          autor: 'Federico García Lorca',       genero: 'Tragedia',       año: '1932' },
  { titulo: 'Luces de Bohemia',         autor: 'Ramón del Valle-Inclán',      genero: 'Esperpento',     año: '1924' },
  { titulo: 'Yerma',                    autor: 'Federico García Lorca',       genero: 'Tragicomedia',   año: '1934' },
  { titulo: 'Fuenteovejuna',            autor: 'Lope de Vega',                genero: 'Drama histórico',año: '1619' },
]

const AUTORES_PLACEHOLDER = [
  { nombre: 'Federico García Lorca',      pais: 'España', obras: 12,  iniciales: 'FL' },
  { nombre: 'Pedro Calderón de la Barca', pais: 'España', obras: 47,  iniciales: 'PB' },
  { nombre: 'Lope de Vega',               pais: 'España', obras: 184, iniciales: 'LV' },
  { nombre: 'Ramón del Valle-Inclán',     pais: 'España', obras: 23,  iniciales: 'RV' },
]

const PROXIMAS_FUNCIONALIDADES = [
  'Fichas de obras',
  'Guiones descargables',
  'Derechos de representación',
  'ScenaIA',
  'Colecciones editoriales',
  'Buscador avanzado',
]

export default function ObrasPage() {
  return (
    <>
      <TopNav />

      <main>
        {/* ── HERO EDITORIAL ── */}
        <section className="bib-hero">
          <div className="bib-container">
            <div className="bib-hero-eyebrow">
              <span className="bib-eyebrow-dot" aria-hidden="true" />
              BIBLIOTECA OFICIAL · <span style={{ color: 'var(--red)' }}>PATRIMONIO TEATRAL</span>
            </div>
            <p className="bib-hero-desc">
              Un espacio para conservar el patrimonio dramático en lengua española.
            </p>
          </div>
        </section>

        {/* ── BUSCADOR ── */}
        <section className="bib-search" aria-label="Buscador de la biblioteca">
          <div className="bib-container">
            <div className="bib-search-wrap">
              <svg
                className="bib-search-icon"
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                className="bib-search-input"
                placeholder="Buscar una obra, autor o género..."
                aria-label="Buscar en la biblioteca"
                disabled
              />
              <button className="bib-search-btn" disabled aria-disabled="true">
                Buscar
              </button>
            </div>
            <p className="bib-search-coming">
              Buscador avanzado disponible en la próxima versión
            </p>
          </div>
        </section>

        {/* ── EXPLORAR POR GÉNEROS ── */}
        <section className="bib-section bib-section--alt" aria-labelledby="generos-heading">
          <div className="bib-container">
            <header className="bib-section-head">
              <div className="bib-section-eyebrow">Explorar</div>
              <h2 className="bib-section-title" id="generos-heading">Géneros y categorías</h2>
              <p className="bib-section-sub">59 géneros teatrales organizados en 9 bloques temáticos</p>
            </header>
            <div className="bib-generos-grid">
              {TAXONOMIA.map(({ section, items }) => (
                <div key={section} className="bib-genero-bloque">
                  <h3 className="bib-genero-bloque-title">{section}</h3>
                  <div className="bib-genero-tags">
                    {items.map(item => (
                      <span key={item} className="bib-genero-tag">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OBRAS DESTACADAS ── */}
        <section className="bib-section" aria-labelledby="destacadas-heading">
          <div className="bib-container">
            <header className="bib-section-head">
              <div className="bib-section-eyebrow">Catálogo</div>
              <h2 className="bib-section-title" id="destacadas-heading">Obras destacadas</h2>
            </header>
            <div className="bib-cards-grid">
              {OBRAS_PLACEHOLDER.map(obra => (
                <article key={obra.titulo} className="bib-card">
                  <div className="bib-card-genero">{obra.genero}</div>
                  <h3 className="bib-card-titulo">{obra.titulo}</h3>
                  <p className="bib-card-autor">{obra.autor}</p>
                  <div className="bib-card-footer">
                    <span className="bib-card-año">{obra.año}</span>
                    <span className="bib-card-action">Ver ficha →</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── ÚLTIMAS INCORPORACIONES + AUTORES DESTACADOS ── */}
        <section className="bib-section bib-section--alt">
          <div className="bib-container">
            <div className="bib-two-col">
              <div>
                <header className="bib-section-head bib-section-head--sm">
                  <div className="bib-section-eyebrow">Recientes</div>
                  <h2 className="bib-section-title">Últimas incorporaciones</h2>
                </header>
                <ul className="bib-recientes-list">
                  {OBRAS_PLACEHOLDER.slice(0, 4).map(obra => (
                    <li key={obra.titulo + '-r'} className="bib-reciente-item">
                      <div className="bib-reciente-titulo">{obra.titulo}</div>
                      <div className="bib-reciente-meta">{obra.autor} · {obra.genero}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <header className="bib-section-head bib-section-head--sm">
                  <div className="bib-section-eyebrow">Dramaturgos</div>
                  <h2 className="bib-section-title">Autores destacados</h2>
                </header>
                <ul className="bib-autores-list">
                  {AUTORES_PLACEHOLDER.map(autor => (
                    <li key={autor.nombre} className="bib-autor-item">
                      <div className="bib-autor-iniciales" aria-hidden="true">
                        {autor.iniciales}
                      </div>
                      <div>
                        <div className="bib-autor-nombre">{autor.nombre}</div>
                        <div className="bib-autor-meta">{autor.pais} · {autor.obras} obras</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRÓXIMAMENTE ── */}
        <section className="bib-pronto" aria-labelledby="pronto-heading">
          <div className="bib-container">
            <div className="bib-pronto-eyebrow">En construcción</div>
            <h2 className="bib-pronto-title" id="pronto-heading">
              La biblioteca crece.
            </h2>
            <p className="bib-pronto-text">
              Estamos construyendo el repositorio de referencia del teatro en español.
              Fichas completas, guiones, derechos de representación y herramientas
              para profesionales de la escena llegarán próximamente.
            </p>
            <div className="bib-pronto-features">
              {PROXIMAS_FUNCIONALIDADES.map(f => (
                <span key={f} className="bib-pronto-feature">{f}</span>
              ))}
            </div>
          </div>
        </section>
      </main>

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
