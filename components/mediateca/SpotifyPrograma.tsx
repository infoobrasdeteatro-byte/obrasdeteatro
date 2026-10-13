'use client'

import { useState } from 'react'

/** Reproductor de Spotify del programa, que solo se carga al pulsar (sin cookies de terceros antes). */
export default function SpotifyPrograma({ src, nombre }: { src: string; nombre: string }) {
  const [activo, setActivo] = useState(false)
  return (
    <section className="med-spotify" style={{ marginBottom: '24px' }}>
      {activo ? (
        <iframe src={src} title={`${nombre} en Spotify`} allow="autoplay; encrypted-media" />
      ) : (
        <button type="button" className="ds-btn-secondary" style={{ padding: '10px 18px', fontSize: '13px' }} onClick={() => setActivo(true)}>
          Escuchar en Spotify
        </button>
      )}
    </section>
  )
}
