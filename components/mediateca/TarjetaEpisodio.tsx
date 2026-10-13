import Link from 'next/link'
import { duracionLegible, fechaEpisodio, rutaEpisodio } from '@/lib/mediateca/mediateca'

export type EpisodioTarjeta = {
  id: string
  slug: string
  titulo: string
  fecha_publicacion: string
  duracion_segundos: number | null
  imagen_url: string | null
  youtube_video_id: string | null
  audio_url: string | null
}

export default function TarjetaEpisodio({ e, programa }: { e: EpisodioTarjeta; programa: { slug: string; nombre: string } | null }) {
  if (!programa) return null
  const imagen = e.youtube_video_id ? `https://i.ytimg.com/vi/${e.youtube_video_id}/hqdefault.jpg` : e.imagen_url
  const tipo = e.youtube_video_id && e.audio_url ? 'VÍDEO · AUDIO' : e.youtube_video_id ? 'VÍDEO' : 'AUDIO'
  const duracion = duracionLegible(e.duracion_segundos)
  return (
    <li className="med-episodio">
      <Link href={rutaEpisodio(programa.slug, e.slug)}>
        <div className="med-episodio-imagen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imagen && <img src={imagen} alt="" loading="lazy" decoding="async" />}
          <span className="med-episodio-tipo">{tipo}</span>
        </div>
        <div className="med-episodio-cuerpo">
          <div className="med-episodio-programa">{programa.nombre}</div>
          <h3 className="med-episodio-titulo">{e.titulo}</h3>
          <p className="med-episodio-meta">{fechaEpisodio(e.fecha_publicacion)}{duracion && ` · ${duracion}`}</p>
        </div>
      </Link>
    </li>
  )
}
