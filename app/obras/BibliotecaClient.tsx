'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ── Static data ─────────────────────────────────────────── */

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

/* ── Types ───────────────────────────────────────────────── */

import { urlCatalogo, formatearMiles } from '@/lib/biblioteca/catalogo'
import type { ObraCard, AutorDestacado } from '@/lib/biblioteca/datos'

const SECCIONES = [
  { id: 'catalogo',        num: '01', label: 'Catálogo' },
  { id: 'generos',         num: '02', label: 'Géneros y categorías' },
  { id: 'incorporaciones', num: '03', label: 'Últimas incorporaciones' },
  { id: 'dramaturgos',     num: '04', label: 'Dramaturgos' },
] as const

type SeccionId = (typeof SECCIONES)[number]['id']

const GENRES_TOTAL = TAXONOMIA.reduce((acc, { items }) => acc + items.length, 0)

interface Props {
  /** La página del catálogo que se muestra (48 obras como mucho). */
  obras: ObraCard[]
  /** Obras que encajan con la búsqueda (todas, si no hay búsqueda). */
  total: number
  totalBiblioteca: number
  pagina: number
  paginas: number
  q: string
  recientes: ObraCard[]
  /** Todos los dramaturgos de la biblioteca (sin «Anónimo»), de más a menos obras. */
  autores: AutorDestacado[]
}

const DRAMATURGOS_POR_PAGINA = 48

/* ── Component ───────────────────────────────────────────── */

export default function BibliotecaClient({ obras, total, totalBiblioteca, pagina, paginas, q, recientes, autores }: Props) {
  const [activa, setActiva] = useState<SeccionId>('catalogo')
  const [paginaAutores, setPaginaAutores] = useState(1)
  const paginasAutores = Math.max(1, Math.ceil(autores.length / DRAMATURGOS_POR_PAGINA))
  const irAPaginaAutores = (n: number) => {
    setPaginaAutores(n)
    document.getElementById('bib-autores-h')?.scrollIntoView({ block: 'start' })
  }
  const autoresPagina = autores.slice((paginaAutores - 1) * DRAMATURGOS_POR_PAGINA, paginaAutores * DRAMATURGOS_POR_PAGINA)
  const secciones = SECCIONES.filter(s => s.id !== 'dramaturgos' || autores.length > 0)

  const counts: Record<SeccionId, number> = {
    catalogo:        totalBiblioteca,
    generos:         GENRES_TOTAL,
    incorporaciones: recientes.length,
    dramaturgos:     autores.length,
  }

  return (
    <div className="bib-modular">

      {/* Índice lateral */}
      <nav className="bib-nav-lateral" aria-label="Índice de la Biblioteca">
        <span className="bib-nav-lateral-title" aria-hidden="true">Índice</span>
        {secciones.map(s => (
          <button
            key={s.id}
            className={`bib-nav-lateral-item${activa === s.id ? ' bib-nav-lateral-item--active' : ''}`}
            onClick={() => setActiva(s.id)}
            aria-current={activa === s.id ? 'true' : undefined}
          >
            <span className="bib-nav-num">{s.num}</span>
            <span className="bib-nav-sep" aria-hidden="true">·</span>
            <span className="bib-nav-label">{s.label}</span>
            <span className="bib-nav-count" aria-hidden="true">
              {formatearMiles(counts[s.id])}
            </span>
          </button>
        ))}
      </nav>

      {/* Área de contenido */}
      <div className="bib-contenido">

        {activa === 'catalogo' && (
          <section aria-labelledby="bib-catalogo-h" id="catalogo">
            <header className="bib-section-head">
              <div className="bib-section-eyebrow">Catálogo</div>
              <h2 className="bib-section-title" id="bib-catalogo-h">
                {q ? `Resultados para «${q}»` : 'Todas las obras'}
              </h2>
              <p className="bib-section-sub">
                {total === 0
                  ? 'No hay obras que coincidan con la búsqueda.'
                  : `${formatearMiles(total)} ${total === 1 ? 'obra' : 'obras'}${paginas > 1 ? ` · página ${pagina} de ${formatearMiles(paginas)}` : ''}`}
                {q && <> · <Link href="/obras#catalogo">Ver todas</Link></>}
              </p>
            </header>
            <div className="bib-cards-grid">
              {obras.map(obra => (
                <Link key={obra.id} href={`/obras/${obra.slug}`} className="bib-card">
                  <div className="bib-card-genero">{obra.genre}</div>
                  <h3 className="bib-card-titulo">{obra.title}</h3>
                  <p className="bib-card-autor">{obra.author}</p>
                  <div className="bib-card-footer">
                    <span className="bib-card-año">{obra.year ?? ''}</span>
                    <span className="bib-card-action">Ver ficha →</span>
                  </div>
                </Link>
              ))}
            </div>
            {paginas > 1 && (
              <nav className="bib-paginacion" aria-label="Páginas del catálogo">
                {pagina > 1
                  ? <Link href={urlCatalogo(q, pagina - 1)} className="bib-paginacion-enlace" rel="prev">← Anterior</Link>
                  : <span />}
                <span className="bib-paginacion-estado">Página {pagina} de {formatearMiles(paginas)}</span>
                {pagina < paginas
                  ? <Link href={urlCatalogo(q, pagina + 1)} className="bib-paginacion-enlace" rel="next">Siguiente →</Link>
                  : <span />}
              </nav>
            )}
          </section>
        )}

        {activa === 'generos' && (
          <section aria-labelledby="bib-generos-h">
            <header className="bib-section-head">
              <div className="bib-section-eyebrow">Explorar</div>
              <h2 className="bib-section-title" id="bib-generos-h">Géneros y categorías</h2>
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
          </section>
        )}

        {activa === 'incorporaciones' && (
          <section aria-labelledby="bib-incorp-h">
            <header className="bib-section-head bib-section-head--sm">
              <div className="bib-section-eyebrow">Recientes</div>
              <h2 className="bib-section-title" id="bib-incorp-h">Últimas incorporaciones</h2>
            </header>
            <ul className="bib-recientes-list">
              {recientes.map(obra => (
                <li key={obra.id + '-r'} className="bib-reciente-item">
                  <Link href={`/obras/${obra.slug}`} className="bib-reciente-link">
                    <div className="bib-reciente-titulo">{obra.title}</div>
                    <div className="bib-reciente-meta">{obra.author} · {obra.genre}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activa === 'dramaturgos' && autores.length > 0 && (
          <section aria-labelledby="bib-autores-h">
            <header className="bib-section-head bib-section-head--sm">
              <div className="bib-section-eyebrow">Dramaturgos</div>
              <h2 className="bib-section-title" id="bib-autores-h">Todos los dramaturgos</h2>
              <p className="bib-section-sub">
                {formatearMiles(autores.length)} autores · de más a menos obras
                {paginasAutores > 1 ? ` · página ${paginaAutores} de ${formatearMiles(paginasAutores)}` : ''}
              </p>
            </header>
            <ul className="bib-autores-list">
              {autoresPagina.map(autor => (
                <li key={autor.nombre}>
                  <Link href={urlCatalogo(autor.nombre, 1)} className="bib-autor-item" onClick={() => setActiva('catalogo')}>
                    <div className="bib-autor-iniciales" aria-hidden="true">
                      {autor.iniciales}
                    </div>
                    <div>
                      <div className="bib-autor-nombre">{autor.nombre}</div>
                      <div className="bib-autor-meta">{autor.obras === 1 ? '1 obra' : `${formatearMiles(autor.obras)} obras`}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {paginasAutores > 1 && (
              <nav className="bib-paginacion" aria-label="Páginas de dramaturgos">
                {paginaAutores > 1
                  ? <button type="button" className="bib-paginacion-enlace bib-paginacion-boton" onClick={() => irAPaginaAutores(paginaAutores - 1)}>← Anterior</button>
                  : <span />}
                <span className="bib-paginacion-estado">Página {paginaAutores} de {formatearMiles(paginasAutores)}</span>
                {paginaAutores < paginasAutores
                  ? <button type="button" className="bib-paginacion-enlace bib-paginacion-boton" onClick={() => irAPaginaAutores(paginaAutores + 1)}>Siguiente →</button>
                  : <span />}
              </nav>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
