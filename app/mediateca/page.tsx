import type { Metadata } from 'next'
import Link from 'next/link'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import TarjetaEpisodio from '@/components/mediateca/TarjetaEpisodio'
import { COUNTRIES } from '@/lib/geo/countries'
import { nombrePais, rutaPrograma } from '@/lib/mediateca/mediateca'

export const metadata: Metadata = {
  title: 'Mediateca: podcasts y vídeos de teatro | ObrasDeTeatro',
  description: 'Podcasts, entrevistas y vídeos sobre artes escénicas de España y Latinoamérica, reunidos en un solo lugar.',
  alternates: { canonical: '/mediateca' },
}

type Props = { searchParams: Promise<{ pais?: string; formato?: string }> }

/**
 * Mediateca pública: programas activos y últimos episodios. Accesible sin
 * sesión; la RLS solo deja ver programas activos y episodios publicados.
 */
export default async function MediatecaPage({ searchParams }: Props) {
  const sp = await searchParams
  const pais = sp.pais && COUNTRIES.some(c => c.code === sp.pais) ? sp.pais : undefined
  const formato = sp.formato === 'video' || sp.formato === 'audio' ? sp.formato : undefined

  const supabase = await createClient()
  const { data: programas } = await supabase
    .from('mediateca_programas')
    .select('id, slug, nombre, pais_code, imagen_url, youtube_channel_id')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  const visibles = (programas ?? []).filter(p => !pais || p.pais_code === pais)
  const porId = Object.fromEntries((programas ?? []).map(p => [p.id, p]))

  let consulta = supabase
    .from('mediateca_episodios')
    .select('id, slug, titulo, fecha_publicacion, duracion_segundos, imagen_url, youtube_video_id, audio_url, programa_id')
    .eq('estado', 'publicado')
  if (pais) consulta = consulta.in('programa_id', visibles.length ? visibles.map(p => p.id) : ['00000000-0000-0000-0000-000000000000'])
  if (formato === 'video') consulta = consulta.not('youtube_video_id', 'is', null)
  if (formato === 'audio') consulta = consulta.not('audio_url', 'is', null)
  const { data: episodios, error } = await consulta.order('fecha_publicacion', { ascending: false }).limit(36)

  const hayFiltros = Boolean(pais || formato)
  const paisesConProgramas = COUNTRIES.filter(c => (programas ?? []).some(p => p.pais_code === c.code))

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mediateca</h1>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Podcasts, entrevistas y vídeos sobre artes escénicas. Cada programa se escucha y se ve en su propia plataforma.
              </span>
            </div>
          </div>

          {visibles.length > 0 && (
            <section aria-labelledby="programas-titulo">
              <h2 id="programas-titulo" className="obras-stat-label" style={{ marginBottom: '10px' }}>Programas</h2>
              <ul className="med-programas">
                {visibles.map(p => (
                  <li key={p.id}>
                    <Link href={rutaPrograma(p.slug)} className="med-programa">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.imagen_url && <img src={p.imagen_url} alt="" loading="lazy" />}
                      <div>
                        <div className="med-programa-nombre">{p.nombre}</div>
                        {p.pais_code && <div className="med-programa-meta">{nombrePais(p.pais_code)}</div>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <form method="get" className="account-card" style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="ds-form-group" style={{ minWidth: '180px', marginBottom: 0 }}>
              <label className="ds-label" htmlFor="formato">Formato</label>
              <select id="formato" name="formato" className="ds-select" defaultValue={formato ?? ''}>
                <option value="">Vídeo y audio</option>
                <option value="video">Solo vídeo</option>
                <option value="audio">Solo audio</option>
              </select>
            </div>
            {paisesConProgramas.length > 1 && (
              <div className="ds-form-group" style={{ minWidth: '180px', marginBottom: 0 }}>
                <label className="ds-label" htmlFor="pais">País</label>
                <select id="pais" name="pais" className="ds-select" defaultValue={pais ?? ''}>
                  <option value="">Todos</option>
                  {paisesConProgramas.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: '13px' }}>Filtrar</button>
            {hayFiltros && <Link href="/mediateca" className="table-link" style={{ alignSelf: 'center' }}>Quitar filtros</Link>}
          </form>

          {error && <div className="ds-alert-error" style={{ marginBottom: '16px' }}>No se pudieron cargar los episodios. Inténtalo de nuevo en unos minutos.</div>}

          <h2 className="obras-stat-label" style={{ marginBottom: '10px' }}>Últimos episodios</h2>
          {(episodios ?? []).length === 0 ? (
            <div className="obras-empty">
              <p className="obras-empty-text" style={{ marginBottom: 0 }}>
                {hayFiltros ? 'No hay episodios con estos filtros.' : 'Muy pronto, los primeros podcasts y vídeos.'}
              </p>
            </div>
          ) : (
            <ul className="med-episodios">
              {(episodios ?? []).map(e => <TarjetaEpisodio key={e.id} e={e} programa={porId[e.programa_id] ?? null} />)}
            </ul>
          )}

          <p className="ds-form-hint" style={{ marginTop: '28px' }}>
            ¿Tienes un podcast o un canal sobre artes escénicas? Escríbenos a hola@obrasdeteatro.com.
          </p>
        </div>
      </main>
    </>
  )
}
