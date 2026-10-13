import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import {
  COLUMNAS_PUBLICAS,
  etiquetaTipo, etiquetaDisciplina, etiquetaNivel, etiquetaModalidad,
  nombrePaisFormacion, fechasFormacion, precioFormacion, enlaceInscripcion, rutaFormacion,
} from '@/lib/formacion/formacion'

type Props = { params: Promise<{ slug: string }> }

/** Una sola lectura por petición, compartida entre metadata y página. */
const cargar = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('formaciones')
    .select(COLUMNAS_PUBLICAS)
    .eq('slug', slug)
    .eq('estado', 'publicado')
    .maybeSingle()
  return data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const f = await cargar(slug)
  if (!f) return { title: 'Formación | ObrasDeTeatro' }
  const descripcion = f.descripcion ? f.descripcion.slice(0, 160) : `${etiquetaTipo(f.tipo)} en ObrasDeTeatro.`
  return {
    title: `${f.titulo} | Formación | ObrasDeTeatro`,
    description: descripcion,
    alternates: { canonical: rutaFormacion(f.slug) },
    openGraph: { title: f.titulo, description: descripcion },
  }
}

/**
 * Ficha pública de una formación. Se ve sin sesión.
 *
 * La inscripción NO pasa por la plataforma: se enlaza a la web o al correo que
 * indicó quien la publica (nofollow, porque es contenido de usuario).
 */
export default async function FormacionFichaPage({ params }: Props) {
  const { slug } = await params
  const f = await cargar(slug)
  if (!f) notFound()

  const supabase = await createClient()
  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellidos, slug')
    .eq('id', f.profile_id)
    .maybeSingle()
  const organizador = perfil ? [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ').trim() : ''

  const enlace = enlaceInscripcion(f)
  const esCorreo = enlace?.startsWith('mailto:')
  const fechas = fechasFormacion(f)
  const pais = nombrePaisFormacion(f.pais_code)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: f.titulo,
    description: f.descripcion ?? undefined,
    provider: organizador ? { '@type': 'Organization', name: organizador } : undefined,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: f.modalidad === 'online' ? 'online' : f.modalidad === 'hibrida' ? 'blended' : 'onsite',
      startDate: f.fecha_inicio ?? undefined,
      endDate: f.fecha_fin ?? undefined,
      location: f.ciudad ? { '@type': 'Place', name: [f.lugar, f.ciudad, pais].filter(Boolean).join(', ') } : undefined,
    },
    offers: f.es_gratuita
      ? { '@type': 'Offer', price: 0, priceCurrency: f.moneda ?? 'EUR', category: 'Free' }
      : f.precio !== null ? { '@type': 'Offer', price: Number(f.precio), priceCurrency: f.moneda ?? 'EUR' } : undefined,
  }

  return (
    <>
      <TopNav />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{f.titulo}</h1>
              <Link href="/formacion" className="page-back">← Toda la formación</Link>
            </div>
            {f.es_gratuita && <span className="status-pill status-pill--published">Gratuita</span>}
          </div>

          <article className="account-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span className="status-pill" style={{ background: 'var(--red-light)', color: 'var(--red-h)' }}>{etiquetaTipo(f.tipo)}</span>
              {f.disciplina && (
                <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>{etiquetaDisciplina(f.disciplina)}</span>
              )}
              {f.nivel && (
                <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>{etiquetaNivel(f.nivel)}</span>
              )}
            </div>

            {f.descripcion && (
              <div style={{ marginTop: '18px' }}>
                <h2 className="obras-stat-label" style={{ marginBottom: '6px' }}>Descripción</h2>
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{f.descripcion}</p>
              </div>
            )}

            {f.requisitos && (
              <div style={{ marginTop: '18px' }}>
                <h2 className="obras-stat-label" style={{ marginBottom: '6px' }}>Requisitos</h2>
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{f.requisitos}</p>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <Dato etiqueta="Imparte" valor={f.imparte} />
              <Dato etiqueta="Modalidad" valor={etiquetaModalidad(f.modalidad)} />
              <Dato etiqueta="Lugar" valor={f.lugar} />
              <Dato etiqueta="Ciudad" valor={f.ciudad} />
              <Dato etiqueta="País" valor={pais} />
              <Dato etiqueta="Fechas" valor={fechas} />
              <Dato etiqueta="Horario" valor={f.horario} />
              <Dato etiqueta="Duración" valor={f.duracion} />
              <Dato etiqueta="Plazas" valor={f.plazas !== null ? String(f.plazas) : null} />
              <Dato etiqueta="Precio" valor={precioFormacion(f)} />
            </dl>

            {enlace && (
              <div style={{ marginTop: '22px' }}>
                <a href={enlace} target={esCorreo ? undefined : '_blank'} rel="noopener nofollow ugc" className="ds-btn-primary"
                  style={{ width: 'auto', display: 'inline-flex', padding: '11px 22px', fontSize: '14px' }}>
                  {esCorreo ? 'Inscribirme por correo →' : 'Inscribirme →'}
                </a>
                <p className="ds-form-hint" style={{ marginTop: '8px' }}>
                  La inscripción la gestiona directamente quien organiza la formación.
                </p>
              </div>
            )}
          </article>

          <section className="account-card">
            <h2 className="obras-stat-label" style={{ marginBottom: '10px' }}>Quién la organiza</h2>
            {organizador ? (
              perfil?.slug ? (
                <Link href={`/perfil/${perfil.slug}`} style={{ fontSize: '15px', color: 'var(--red)', textDecoration: 'none' }}>
                  {organizador}
                </Link>
              ) : (
                <p style={{ fontSize: '15px', color: 'var(--black)' }}>{organizador}</p>
              )
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Organizador sin identificar.</p>
            )}
            <p className="ds-form-hint" style={{ marginTop: '10px' }}>
              ¿Ves algo incorrecto en esta formación? Escríbenos a hola@obrasdeteatro.com.
            </p>
          </section>

        </div>
      </main>
    </>
  )
}

/** Un dato corto. Ausente = no se pinta la fila. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null
  return (
    <div>
      <dt className="obras-stat-label">{etiqueta}</dt>
      <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{valor}</dd>
    </div>
  )
}
