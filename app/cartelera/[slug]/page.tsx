import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/geo/countries'
import {
  cartelValido, etiquetaGenero, etiquetaRol, etiquetaTipoOpcion, fechaFuncion, precioTexto, IDIOMAS,
} from '@/lib/cartelera/cartelera'
import { MARGEN_EMPEZADA_MS } from '@/lib/cartelera/listado'
import { rutaFicha } from '@/lib/espacios/espacios'
import { SITIO } from '@/lib/convocatorias/resumen-semanal'
import { Poster, rutaEntradas, rutaEspectaculo } from '@/components/cartelera/publico'

type Props = { params: Promise<{ slug: string }> }

const nombrePais = (code: string | null) => COUNTRIES.find(c => c.code === code)?.name ?? code ?? ''

/** Una lectura por petición, compartida entre metadata y página. Solo publicados o finalizados. */
const cargar = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data: e } = await supabase
    .from('espectaculos')
    .select('id, slug, titulo, compania_nombre, sinopsis, cartel_url, genero_id, duracion_min, edad_minima, idioma, estado, user_id')
    .eq('slug', slug)
    .in('estado', ['publicado', 'finalizado'])
    .maybeSingle()
  if (!e) return null
  const [{ data: funciones }, { data: opciones }, { data: equipo }] = await Promise.all([
    supabase.from('funciones')
      .select('id, inicio, zona_horaria, lugar_nombre, ciudad, pais_code, estado, nota, espacios_escenicos(slug)')
      .eq('espectaculo_id', e.id).order('inicio'),
    supabase.from('opciones_compra')
      .select('id, funcion_id, tipo, url, precio_desde, moneda, etiqueta').eq('espectaculo_id', e.id).order('orden'),
    supabase.from('espectaculo_personas').select('id, nombre, rol, personaje').eq('espectaculo_id', e.id).order('orden'),
  ])
  return {
    ...e,
    cartel_url: cartelValido(e.cartel_url, process.env.NEXT_PUBLIC_SUPABASE_URL!, e.user_id),
    funciones: funciones ?? [], opciones: opciones ?? [], equipo: equipo ?? [],
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const e = await cargar(slug)
  if (!e) return { title: 'Espectáculo no encontrado | ObrasDeTeatro', robots: { index: false } }
  const ciudades = [...new Set(e.funciones.map(f => f.ciudad).filter(Boolean))].slice(0, 3).join(', ')
  const descripcion = e.sinopsis?.slice(0, 160)
    ?? `${etiquetaGenero(e.genero_id)} de ${e.compania_nombre}${ciudades ? ` en ${ciudades}` : ''}. Funciones, horarios y entradas.`
  return {
    title: `${e.titulo}${ciudades ? ` · ${ciudades}` : ''} | Cartelera | ObrasDeTeatro`,
    description: descripcion,
    alternates: { canonical: rutaEspectaculo(e.slug) },
    openGraph: {
      title: e.titulo, description: descripcion, url: rutaEspectaculo(e.slug), siteName: 'ObrasDeTeatro', locale: 'es_ES', type: 'website',
      ...(e.cartel_url ? { images: [{ url: e.cartel_url }] } : {}),
    },
  }
}

export default async function EspectaculoPage({ params }: Props) {
  const { slug } = await params
  const e = await cargar(slug)
  if (!e) notFound()

  const ahora = Date.now()
  const futuras = e.funciones.filter(f => new Date(f.inicio).getTime() > ahora - MARGEN_EMPEZADA_MS)
  const generales = e.opciones.filter(o => !o.funcion_id)
  const porFuncion = (id: string) => e.opciones.filter(o => o.funcion_id === id)
  const terminado = e.estado === 'finalizado' || futuras.length === 0
  const idioma = IDIOMAS.find(i => i.value === e.idioma)?.label

  const datos = [
    etiquetaGenero(e.genero_id),
    e.duracion_min ? `${e.duracion_min} min` : null,
    e.edad_minima != null ? (e.edad_minima === 0 ? 'Todos los públicos' : `A partir de ${e.edad_minima} años`) : null,
    idioma && e.idioma !== 'es' ? `En ${idioma.toLowerCase()}` : null,
  ].filter(Boolean)

  // Datos estructurados: un evento por función futura (hasta 20).
  const jsonLd = futuras.slice(0, 20).map(f => ({
    '@context': 'https://schema.org',
    '@type': 'TheaterEvent',
    name: e.titulo,
    startDate: f.inicio,
    eventStatus: f.estado === 'cancelada' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: f.lugar_nombre, address: { '@type': 'PostalAddress', addressLocality: f.ciudad, addressCountry: f.pais_code } },
    ...(e.cartel_url ? { image: [e.cartel_url] } : {}),
    ...(e.sinopsis ? { description: e.sinopsis.slice(0, 300) } : {}),
    organizer: { '@type': 'PerformingGroup', name: e.compania_nombre },
    url: `${SITIO}${rutaEspectaculo(e.slug)}`,
  }))

  return (
    <>
      <TopNav />
      {jsonLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      )}
      <main style={{ background: 'var(--off)', minHeight: '100vh' }}>
        <div className="cart-wrap" style={{ maxWidth: '1040px' }}>
          <Link href="/cartelera" className="page-back">← Cartelera</Link>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px) 1fr', gap: '32px', marginTop: '16px' }} className="cart-ficha">
            <div>
              <Poster url={e.cartel_url} titulo={e.titulo} prioridad />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <div>
                <h1 className="cart-title" style={{ fontSize: '40px' }}>{e.titulo}</h1>
                <p style={{ fontSize: '16px', color: 'var(--text)', marginTop: '6px' }}>{e.compania_nombre}</p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>{datos.join(' · ')}</p>
              </div>

              {terminado && (
                <div className="ds-alert-error" style={{ background: 'var(--subtle)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                  Este espectáculo no tiene funciones próximas. <Link href="/cartelera" className="table-link">Ver la cartelera</Link>
                </div>
              )}

              {!terminado && generales.length > 0 && (
                <div id="entradas" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {generales.map(o => <BotonEntradas key={o.id} o={o} />)}
                </div>
              )}

              {e.sinopsis && (
                <section>
                  <h2 className="cart-fila-label" style={{ marginBottom: '6px' }}>Sinopsis</h2>
                  <p style={{ fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-line', color: 'var(--text)' }}>{e.sinopsis}</p>
                </section>
              )}

              {e.equipo.length > 0 && (
                <section>
                  <h2 className="cart-fila-label" style={{ marginBottom: '6px' }}>Ficha artística</h2>
                  <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px', fontSize: '14px' }}>
                    {agruparEquipo(e.equipo).map(([rol, nombres]) => (
                      <div key={rol} style={{ display: 'contents' }}>
                        <dt style={{ color: 'var(--muted)' }}>{etiquetaRol(rol)}</dt>
                        <dd style={{ margin: 0 }}>{nombres.join(', ')}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          </div>

          <section id="funciones" className="cart-seccion">
            <h2>Funciones</h2>
            {futuras.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No hay funciones programadas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {futuras.map(f => {
                  const propias = porFuncion(f.id)
                  const sala = f.espacios_escenicos?.slug
                  return (
                    <div key={f.id} className="cart-agenda-fila" style={{ gridTemplateColumns: '1fr auto' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--black)', textTransform: 'capitalize' }}>
                          {fechaFuncion(f.inicio, f.zona_horaria)}
                        </div>
                        <div className="cart-agenda-m">
                          {sala ? <Link href={rutaFicha(sala)} className="table-link">{f.lugar_nombre}</Link> : f.lugar_nombre}
                          {' · '}{f.ciudad}, {nombrePais(f.pais_code)}
                          {f.nota ? ` · ${f.nota}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {f.estado === 'cancelada' && <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--muted)' }}>Cancelada</span>}
                        {f.estado === 'agotada' && <span className="status-pill" style={{ background: 'var(--red-light)', color: 'var(--red-h)' }}>Agotado</span>}
                        {f.estado === 'programada' && (propias.length > 0 ? propias : generales).map(o => <BotonEntradas key={o.id} o={o} pequeno />)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="ds-form-hint" style={{ marginTop: '12px' }}>
              Las entradas las vende la sala o la ticketera de cada función: ObrasDeTeatro te lleva a su página.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}

function BotonEntradas({ o, pequeno }: {
  o: { id: string; tipo: string; url: string | null; precio_desde: number | null; moneda: string | null; etiqueta: string | null }
  pequeno?: boolean
}) {
  const precio = precioTexto(o.precio_desde, o.moneda, o.tipo)
  const texto = o.etiqueta || (o.tipo === 'reserva' ? 'Reservar' : o.tipo === 'venta' ? 'Comprar entradas' : etiquetaTipoOpcion(o.tipo))
  const estilo = pequeno ? { padding: '6px 12px' } : { padding: '11px 20px', fontSize: '14px' }
  if (!o.url) {
    return <span className="cart-btn cart-btn--sec" style={{ ...estilo, cursor: 'default' }}>{texto}{precio ? ` · ${precio}` : ''}</span>
  }
  return (
    <a href={rutaEntradas(o.id)} className="cart-btn" style={estilo} rel="nofollow sponsored" target="_blank">
      {texto}{precio ? ` · ${precio}` : ''}
    </a>
  )
}

function agruparEquipo(equipo: { nombre: string; rol: string; personaje: string | null }[]): [string, string[]][] {
  const m = new Map<string, string[]>()
  for (const p of equipo) m.set(p.rol, [...(m.get(p.rol) ?? []), p.personaje ? `${p.nombre} (${p.personaje})` : p.nombre])
  return [...m]
}
