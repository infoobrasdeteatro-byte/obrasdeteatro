import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import TopNav from '@/components/design-system/TopNav'
import { createClient } from '@/lib/supabase/server'
import Reproductor from '@/components/mediateca/Reproductor'
import TarjetaEpisodio from '@/components/mediateca/TarjetaEpisodio'
import {
  COLUMNAS_EPISODIO, duracionLegible, fechaEpisodio, reproductorIvoox,
  rutaEpisodio, rutaPrograma, urlYoutubeVideo,
} from '@/lib/mediateca/mediateca'

type Props = { params: Promise<{ programa: string; episodio: string }> }

const cargar = cache(async (programaSlug: string, episodioSlug: string) => {
  const supabase = await createClient()
  const { data: p } = await supabase.from('mediateca_programas').select('id, slug, nombre').eq('slug', programaSlug).eq('activo', true).maybeSingle()
  if (!p) return null
  const { data: e } = await supabase.from('mediateca_episodios').select(COLUMNAS_EPISODIO)
    .eq('programa_id', p.id).eq('slug', episodioSlug).eq('estado', 'publicado').maybeSingle()
  return e ? { p, e } : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { programa, episodio } = await params
  const r = await cargar(programa, episodio)
  if (!r) return { title: 'Mediateca | ObrasDeTeatro' }
  return {
    title: `${r.e.titulo} | ${r.p.nombre} | ObrasDeTeatro`,
    description: r.e.descripcion?.slice(0, 160) ?? `Episodio de ${r.p.nombre} en la Mediateca de ObrasDeTeatro.`,
    alternates: { canonical: rutaEpisodio(r.p.slug, r.e.slug) },
    openGraph: r.e.youtube_video_id ? { images: [`https://i.ytimg.com/vi/${r.e.youtube_video_id}/hqdefault.jpg`] } : undefined,
  }
}

export default async function EpisodioPage({ params }: Props) {
  const { programa, episodio } = await params
  const r = await cargar(programa, episodio)
  if (!r) notFound()
  const { p, e } = r

  const supabase = await createClient()
  const { data: otros } = await supabase.from('mediateca_episodios')
    .select('id, slug, titulo, fecha_publicacion, duracion_segundos, imagen_url, youtube_video_id, audio_url')
    .eq('programa_id', p.id).eq('estado', 'publicado').neq('id', e.id)
    .order('fecha_publicacion', { ascending: false }).limit(6)

  const ivoox = reproductorIvoox(e)
  const duracion = duracionLegible(e.duracion_segundos)

  return (
    <>
      <TopNav />
      <main style={{ background: 'var(--off)', minHeight: '100vh', padding: '32px 24px 64px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>

          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">{e.titulo}</h1>
              <Link href={rutaPrograma(p.slug)} className="page-back">← {p.nombre}</Link>
            </div>
          </div>

          <article className="account-card" style={{ marginBottom: '24px' }}>
            <Reproductor titulo={e.titulo} youtubeVideoId={e.youtube_video_id} ivoox={ivoox} audioUrl={e.audio_url} />

            <p className="obras-stat-label">{fechaEpisodio(e.fecha_publicacion)}{duracion && ` · ${duracion}`}</p>
            {e.descripcion && (
              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '10px' }}>{e.descripcion}</p>
            )}

            <div className="med-enlaces">
              {e.youtube_video_id && (
                <a href={urlYoutubeVideo(e.youtube_video_id)} target="_blank" rel="noopener" className="table-link">Ver en YouTube ↗</a>
              )}
              {e.enlace_audio && <a href={e.enlace_audio} target="_blank" rel="noopener" className="table-link">Escuchar en su plataforma ↗</a>}
            </div>
            <p className="ds-form-hint" style={{ marginTop: '12px' }}>
              Contenido de {p.nombre}, reproducido desde su plataforma original. Los derechos son de sus autores.
            </p>
          </article>

          {(otros ?? []).length > 0 && (
            <section>
              <h2 className="obras-stat-label" style={{ marginBottom: '10px' }}>Más de {p.nombre}</h2>
              <ul className="med-episodios">
                {(otros ?? []).map(o => <TarjetaEpisodio key={o.id} e={o} programa={p} />)}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
