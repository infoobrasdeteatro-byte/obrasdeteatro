'use client'

import { useState } from 'react'
import { urlReproductor } from '@/lib/perfil-multimedia/multimedia'

type Props = {
  titulo: string
  youtubeVideoId: string | null
  /** Reproductor de iVoox ya construido, o null. */
  ivoox: string | null
  audioUrl: string | null
}

/**
 * Reproductor de un episodio. Nada de terceros se carga hasta que alguien
 * pulsa: el vídeo (youtube-nocookie) y el reproductor de iVoox se crean al
 * hacer clic. El audio directo usa <audio preload="none">, que no descarga
 * nada hasta darle a reproducir.
 */
export default function Reproductor({ titulo, youtubeVideoId, ivoox, audioUrl }: Props) {
  const [video, setVideo] = useState(false)
  const [audio, setAudio] = useState(false)

  return (
    <div className="med-reproductor">
      {youtubeVideoId && (
        <div className="prof-video-marco">
          {video ? (
            <iframe
              src={urlReproductor({ plataforma: 'youtube', id: youtubeVideoId })}
              title={titulo}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" className="prof-video-reproducir" aria-label={`Ver el vídeo: ${titulo}`} onClick={() => setVideo(true)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`} alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span className="prof-video-icono" aria-hidden="true">▶</span>
            </button>
          )}
        </div>
      )}

      {ivoox ? (
        <div className="med-audio-marco">
          {audio ? (
            <iframe src={ivoox} title={`Audio: ${titulo}`} loading="lazy" allow="autoplay" />
          ) : (
            <button type="button" className="ds-btn-secondary" style={{ padding: '10px 18px', fontSize: '13px' }} onClick={() => setAudio(true)}>
              🎧 Escuchar en audio
            </button>
          )}
        </div>
      ) : audioUrl ? (
        <div className="med-audio-marco">
          <audio controls preload="none" src={audioUrl} aria-label={`Audio: ${titulo}`} />
        </div>
      ) : null}

      {(youtubeVideoId || ivoox) && (
        <p className="med-nota">Al reproducir se carga el reproductor de {youtubeVideoId && ivoox ? 'YouTube o iVoox' : youtubeVideoId ? 'YouTube' : 'iVoox'}.</p>
      )}
    </div>
  )
}
