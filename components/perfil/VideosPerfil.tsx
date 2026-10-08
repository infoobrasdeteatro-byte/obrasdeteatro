'use client'

import { useState } from 'react'
import Image from 'next/image'
import { miniaturaVideo, urlReproductor, type Plataforma } from '@/lib/perfil-multimedia/multimedia'

export type VideoPublico = { id: string; plataforma: Plataforma; videoId: string; titulo: string | null }

/**
 * Vídeos del perfil público. Al cargar la página solo hay una miniatura y un
 * botón de reproducir: el iframe (youtube-nocookie.com o player.vimeo.com con
 * dnt=1) se crea al pulsar. Así la página no carga reproductores ni cookies
 * de terceros hasta que alguien quiere ver un vídeo.
 */
export default function VideosPerfil({ videos }: { videos: VideoPublico[] }) {
  const [activos, setActivos] = useState<Set<string>>(new Set())
  if (videos.length === 0) return null

  return (
    <ul className="prof-videos">
      {videos.map(v => {
        const titulo = v.titulo ?? (v.plataforma === 'youtube' ? 'Vídeo de YouTube' : 'Vídeo de Vimeo')
        const miniatura = miniaturaVideo({ plataforma: v.plataforma, id: v.videoId })
        return (
          <li key={v.id} className="prof-video">
            <div className="prof-video-marco">
              {activos.has(v.id) ? (
                <iframe
                  src={urlReproductor({ plataforma: v.plataforma, id: v.videoId })}
                  title={titulo}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <button type="button" className="prof-video-reproducir" aria-label={`Reproducir: ${titulo}`}
                  onClick={() => setActivos(s => new Set(s).add(v.id))}>
                  {miniatura && <Image src={miniatura} alt="" fill sizes="(max-width: 640px) 100vw, 420px" style={{ objectFit: 'cover' }} loading="lazy" />}
                  <span className="prof-video-icono" aria-hidden="true">▶</span>
                </button>
              )}
            </div>
            {v.titulo && <p className="prof-video-titulo">{v.titulo}</p>}
          </li>
        )
      })}
    </ul>
  )
}
