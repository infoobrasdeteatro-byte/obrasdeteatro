import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import BibliotecaClient from './BibliotecaClient'

export const metadata: Metadata = {
  title: 'Biblioteca de Obras | ObrasDeTeatro®',
  description:
    'La biblioteca de referencia del teatro en español. 59 géneros, obras clásicas y contemporáneas, dramaturgos y colecciones organizadas para profesionales e investigadores.',
}

const PROXIMAS_FUNCIONALIDADES = [
  'Guiones descargables',
  'Derechos de representación',
  'ScenaIA',
  'Colecciones editoriales',
  'Buscador avanzado',
]

export default async function ObrasPage() {
  const supabase = await createClient()

  const { data: obras } = await supabase
    .from('works')
    .select('id, title, author, slug, genre, year')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('year', { ascending: true })

  const obrasData = obras ?? []

  return (
    <>
      <TopNav />

      <main>
        {/* ── CABECERA + BUSCADOR (bloque compacto unificado) ── */}
        <section className="bib-hero" aria-label="Cabecera de la biblioteca">
          <div className="bib-container">
            <div className="bib-hero-eyebrow">
              <span className="bib-eyebrow-dot" aria-hidden="true" />
              BIBLIOTECA OFICIAL · <span style={{ color: 'var(--red)' }}>PATRIMONIO TEATRAL</span>
            </div>
            <div className="bib-search-wrap" role="search" aria-label="Buscador de la biblioteca">
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

        {/* ── NAVEGACIÓN MODULAR ── */}
        <BibliotecaClient obrasData={obrasData} />

        {/* ── PRÓXIMAMENTE ── */}
        <section className="bib-pronto" aria-labelledby="pronto-heading">
          <div className="bib-container">
            <div className="bib-pronto-eyebrow">En construcción</div>
            <h2 className="bib-pronto-title" id="pronto-heading">
              La biblioteca crece.
            </h2>
            <p className="bib-pronto-text">
              Estamos construyendo el repositorio de referencia del teatro en español.
              Guiones, derechos de representación y herramientas
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
