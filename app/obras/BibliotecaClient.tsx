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

const AUTORES_PLACEHOLDER = [
  { nombre: 'Federico García Lorca',      pais: 'España', obras: 12,  iniciales: 'FL' },
  { nombre: 'Pedro Calderón de la Barca', pais: 'España', obras: 47,  iniciales: 'PB' },
  { nombre: 'Lope de Vega',               pais: 'España', obras: 184, iniciales: 'LV' },
  { nombre: 'Ramón del Valle-Inclán',     pais: 'España', obras: 23,  iniciales: 'RV' },
]

/* ── Types ───────────────────────────────────────────────── */

type ObraCard = {
  id: string
  title: string
  author: string | null
  slug: string | null
  genre: string | null
  year: number | null
}

const SECCIONES = [
  { id: 'catalogo',        num: '01', label: 'Catálogo' },
  { id: 'generos',         num: '02', label: 'Géneros y categorías' },
  { id: 'incorporaciones', num: '03', label: 'Últimas incorporaciones' },
  { id: 'dramaturgos',     num: '04', label: 'Dramaturgos' },
] as const

type SeccionId = (typeof SECCIONES)[number]['id']

const GENRES_TOTAL = TAXONOMIA.reduce((acc, { items }) => acc + items.length, 0)

interface Props {
  obrasData: ObraCard[]
}

/* ── Component ───────────────────────────────────────────── */

export default function BibliotecaClient({ obrasData }: Props) {
  const [activa, setActiva] = useState<SeccionId>('catalogo')
  const recientes = [...obrasData].reverse().slice(0, 4)

  const counts: Record<SeccionId, number> = {
    catalogo:        obrasData.length,
    generos:         GENRES_TOTAL,
    incorporaciones: recientes.length,
    dramaturgos:     AUTORES_PLACEHOLDER.length,
  }

  return (
    <div className="bib-modular">

      {/* Índice lateral */}
      <nav className="bib-nav-lateral" aria-label="Índice de la Biblioteca">
        <span className="bib-nav-lateral-title" aria-hidden="true">Índice</span>
        {SECCIONES.map(s => (
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
              {counts[s.id]}
            </span>
          </button>
        ))}
      </nav>

      {/* Área de contenido */}
      <div className="bib-contenido">

        {activa === 'catalogo' && (
          <section aria-labelledby="bib-catalogo-h">
            <header className="bib-section-head">
              <div className="bib-section-eyebrow">Catálogo</div>
              <h2 className="bib-section-title" id="bib-catalogo-h">Obras destacadas</h2>
            </header>
            <div className="bib-cards-grid">
              {obrasData.map(obra => (
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

        {activa === 'dramaturgos' && (
          <section aria-labelledby="bib-autores-h">
            <header className="bib-section-head bib-section-head--sm">
              <div className="bib-section-eyebrow">Dramaturgos</div>
              <h2 className="bib-section-title" id="bib-autores-h">Autores destacados</h2>
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
          </section>
        )}

      </div>
    </div>
  )
}
