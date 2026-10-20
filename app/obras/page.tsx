import type { Metadata } from 'next'
import TopNav from '@/components/design-system/TopNav'
import BibliotecaClient from './BibliotecaClient'
import { leerFiltrosCatalogo, totalPaginas, formatearMiles } from '@/lib/biblioteca/catalogo'
import { paginaCatalogo, resumenBiblioteca } from '@/lib/biblioteca/datos'

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

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ObrasPage({ searchParams }: Props) {
  const filtros = leerFiltrosCatalogo(await searchParams)
  const [{ obras, total }, resumen] = await Promise.all([paginaCatalogo(filtros), resumenBiblioteca()])
  const paginas = totalPaginas(total)

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
            {/* Formulario GET: la búsqueda queda en la URL y funciona sin JavaScript. */}
            <form className="bib-search-wrap" role="search" aria-label="Buscador de la biblioteca" action="/obras#catalogo" method="get">
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
                name="q"
                className="bib-search-input"
                placeholder="Buscar una obra, autor o género..."
                aria-label="Buscar en la biblioteca"
                defaultValue={filtros.q}
                maxLength={80}
              />
              <button type="submit" className="bib-search-btn">
                Buscar
              </button>
            </form>
            <p className="bib-search-coming">
              {formatearMiles(resumen.total)} obras en la biblioteca
            </p>
          </div>
        </section>

        {/* ── NAVEGACIÓN MODULAR ── */}
        <BibliotecaClient
          obras={obras}
          total={total}
          totalBiblioteca={resumen.total}
          pagina={filtros.pagina}
          paginas={paginas}
          q={filtros.q}
          recientes={resumen.recientes}
          autores={resumen.autores}
        />

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
    </>
  )
}
