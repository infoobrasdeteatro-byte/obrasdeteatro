import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import TarjetaEpisodio from '@/components/mediateca/TarjetaEpisodio'
import SpotifyPrograma from '@/components/mediateca/SpotifyPrograma'
import { COLUMNAS_PROGRAMA, nombrePais, reproductorSpotify, rutaPrograma, urlYoutubeCanal } from '@/lib/mediateca/mediateca'

type Props = { params: Promise<{ programa: string }> }

const cargar = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase.from('mediateca_programas').select(COLUMNAS_PROGRAMA).eq('slug', slug).eq('activo', true).maybeSingle()
  return data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await cargar((await params).programa)
  if (!p) return { title: 'Mediateca | ObrasDeTeatro' }
  return {
    title: `${p.nombre} | Mediateca | ObrasDeTeatro`,
    description: p.descripcion?.slice(0, 160) ?? `Episodios de ${p.nombre} en la Mediateca de ObrasDeTeatro.`,
    alternates: { canonical: rutaPrograma(p.slug) },
  }
}

export default async function ProgramaPage({ params }: Props) {
  const p = await cargar((await params).programa)
  if (!p) notFound()

  const supabase = await createClient()
  const [{ data: episodios }, { data: colaborador }] = await Promise.all([
    supabase.from('mediateca_episodios')
      .select('id, slug, titulo, fecha_publicacion, duracion_segundos, imagen_url, youtube_video_id, audio_url')
      .eq('programa_id', p.id).eq('estado', 'publicado')
      .order('fecha_publicacion', { ascending: false }).limit(300),
    p.colaborador_id
      ? supabase.from('colaboradores').select('nombre').eq('id', p.colaborador_id).eq('activo', true).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const spotify = reproductorSpotify(p.spotify_url)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{p.nombre}</h1>
              <Link href="/mediateca" className="page-back">← Mediateca</Link>
            </div>
            {colaborador && <span className="status-pill status-pill--published">Medio colaborador</span>}
          </div>

          <section className="account-card" style={{ marginBottom: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imagen_url && <img src={p.imagen_url} alt="" style={{ width: '120px', height: '120px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />}
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              {p.pais_code && <p className="obras-stat-label">{nombrePais(p.pais_code)}</p>}
              {p.descripcion && <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '6px' }}>{p.descripcion}</p>}
              <div className="med-enlaces">
                {p.youtube_channel_id && (
                  <a href={urlYoutubeCanal(p.youtube_channel_id)} target="_blank" rel="noopener" className="ds-btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>YouTube ↗</a>
                )}
                {p.spotify_url && (
                  <a href={p.spotify_url} target="_blank" rel="noopener" className="ds-btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>Spotify ↗</a>
                )}
                {p.url_web && (
                  <a href={p.url_web} target="_blank" rel="noopener" className="ds-btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>Web ↗</a>
                )}
              </div>
            </div>
          </section>

          {spotify && <SpotifyPrograma src={spotify} nombre={p.nombre} />}

          <h2 className="obras-stat-label" style={{ marginBottom: '10px' }}>Episodios ({(episodios ?? []).length})</h2>
          {(episodios ?? []).length === 0 ? (
            <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>Todavía no hay episodios.</p></div>
          ) : (
            <ul className="med-episodios">
              {(episodios ?? []).map(e => <TarjetaEpisodio key={e.id} e={e} programa={p} />)}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
