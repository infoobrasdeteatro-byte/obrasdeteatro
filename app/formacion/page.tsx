import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/geo/countries'
import {
  TIPOS, DISCIPLINAS, MODALIDADES,
  esTipo, esDisciplina, esModalidad, esPais,
  etiquetaTipo, etiquetaDisciplina, etiquetaNivel,
  lugarFormacion, fechasFormacion, precioFormacion, rutaFormacion,
} from '@/lib/formacion/formacion'

export const metadata: Metadata = {
  title: 'Formación teatral: cursos, talleres y masterclass | ObrasDeTeatro',
  description: 'Cursos, talleres, masterclass, seminarios, residencias y diplomaturas de artes escénicas en España y Latinoamérica.',
}

type Props = {
  searchParams: Promise<{ tipo?: string; disciplina?: string; modalidad?: string; pais?: string; gratuita?: string; q?: string }>
}

/** Quita lo que PostgREST interpreta dentro de un filtro `or` o de un patrón ILIKE. */
const limpiarBusqueda = (s: string) => s.replace(/[%_,()*\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)

/**
 * Listado público de formaciones.
 *
 * Accesible SIN sesión. La política «Formaciones publicadas visibles» solo
 * deja ver estado = 'publicado'; el filtro explícito dice lo mismo y evita
 * que una sesión de moderación vea aquí borradores o retiradas.
 * Los filtros son un formulario GET: funcionan sin JavaScript y la búsqueda
 * queda en la URL.
 */
export default async function FormacionPublicaPage({ searchParams }: Props) {
  const sp = await searchParams
  const tipo = esTipo(sp.tipo) ? sp.tipo : undefined
  const disciplina = esDisciplina(sp.disciplina) ? sp.disciplina : undefined
  const modalidad = esModalidad(sp.modalidad) ? sp.modalidad : undefined
  const pais = esPais(sp.pais) ? sp.pais : undefined
  const gratuita = sp.gratuita === '1'
  const q = sp.q ? limpiarBusqueda(sp.q) : ''

  const supabase = await createClient()
  let consulta = supabase
    .from('formaciones')
    .select('id, slug, titulo, tipo, disciplina, nivel, modalidad, pais_code, ciudad, fecha_inicio, fecha_fin, imparte, es_gratuita, precio, moneda, descripcion')
    .eq('estado', 'publicado')

  if (tipo) consulta = consulta.eq('tipo', tipo)
  if (disciplina) consulta = consulta.eq('disciplina', disciplina)
  if (modalidad) consulta = consulta.eq('modalidad', modalidad)
  if (pais) consulta = consulta.eq('pais_code', pais)
  if (gratuita) consulta = consulta.eq('es_gratuita', true)
  if (q) consulta = consulta.or(`titulo.ilike.%${q}%,imparte.ilike.%${q}%,ciudad.ilike.%${q}%`)

  // Lo que antes empieza, primero; las que no fijan fecha (cursos abiertos
  // todo el año), al final.
  const { data, error } = await consulta
    .order('fecha_inicio', { ascending: true, nullsFirst: false })
    .order('fecha_publicacion', { ascending: false })
    .limit(60)

  const lista = data ?? []
  const hayFiltros = Boolean(tipo || disciplina || modalidad || pais || gratuita || q)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Formación</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Cursos, talleres, masterclass, seminarios, residencias y diplomaturas de artes escénicas.
              </span>
            </div>
            <Link href="/mis-formaciones/nueva" className="ds-btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13px' }}>
              Publicar una formación
            </Link>
          </div>

          <form method="get" className="account-card" style={{ marginBottom: '20px' }}>
            <div className="ds-form-grid">
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="q">Buscar</label>
                <input id="q" name="q" className="ds-input" defaultValue={q} placeholder="Título, docente o ciudad" />
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" className="ds-select" defaultValue={tipo ?? ''}>
                  <option value="">Todos</option>
                  {TIPOS.map(x => <option key={x.value} value={x.value}>{x.plural}</option>)}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="disciplina">Disciplina</label>
                <select id="disciplina" name="disciplina" className="ds-select" defaultValue={disciplina ?? ''}>
                  <option value="">Todas</option>
                  {DISCIPLINAS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="modalidad">Modalidad</label>
                <select id="modalidad" name="modalidad" className="ds-select" defaultValue={modalidad ?? ''}>
                  <option value="">Todas</option>
                  {MODALIDADES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-label" htmlFor="pais">País</label>
                <select id="pais" name="pais" className="ds-select" defaultValue={pais ?? ''}>
                  <option value="">Todos</option>
                  {COUNTRIES.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}
                </select>
              </div>
              <div className="ds-form-group" style={{ justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--text)', marginTop: '26px' }}>
                  <input type="checkbox" name="gratuita" value="1" defaultChecked={gratuita} />
                  Solo gratuitas
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px' }}>
              <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>
                Filtrar
              </button>
              {hayFiltros && <Link href="/formacion" className="table-link">Quitar filtros</Link>}
            </div>
          </form>

          {error && (
            <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
              No se pudieron cargar las formaciones. Inténtalo de nuevo en unos minutos.
            </div>
          )}

          {lista.length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                {hayFiltros
                  ? 'Ninguna formación coincide con estos filtros.'
                  : 'Todavía no hay formaciones publicadas. ¿Impartes un curso o un taller? Publícalo aquí.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {lista.map(f => {
                const fechas = fechasFormacion(f)
                const precio = precioFormacion(f)
                return (
                  <Link key={f.id} href={rutaFormacion(f.slug)} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <article className="account-card">
                      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                            {f.titulo}
                          </h2>
                          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                            {lugarFormacion(f)}{f.imparte && ` · Imparte ${f.imparte}`}
                          </p>
                        </div>
                        {f.es_gratuita && (
                          <span className="status-pill status-pill--published" style={{ flexShrink: 0 }}>Gratuita</span>
                        )}
                      </header>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                        <span className="status-pill" style={{ background: 'var(--red-light)', color: 'var(--red-h)' }}>
                          {etiquetaTipo(f.tipo)}
                        </span>
                        {f.disciplina && (
                          <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                            {etiquetaDisciplina(f.disciplina)}
                          </span>
                        )}
                        {f.nivel && (
                          <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>
                            {etiquetaNivel(f.nivel)}
                          </span>
                        )}
                      </div>

                      {f.descripcion && (
                        <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, marginTop: '12px',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {f.descripcion}
                        </p>
                      )}

                      {(fechas || (precio && !f.es_gratuita)) && (
                        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '14px' }}>
                          {fechas && (
                            <div>
                              <dt className="obras-stat-label">Fechas</dt>
                              <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{fechas}</dd>
                            </div>
                          )}
                          {precio && !f.es_gratuita && (
                            <div>
                              <dt className="obras-stat-label">Precio</dt>
                              <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{precio}</dd>
                            </div>
                          )}
                        </dl>
                      )}
                    </article>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
