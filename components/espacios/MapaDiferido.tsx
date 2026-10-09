'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { PuntoMapa } from '@/lib/espacios/mapa'

// MapLibre solo se descarga cuando hace falta: este import no entra en el
// bundle de la página y ni siquiera se pide hasta que el hueco del mapa se
// acerca a la pantalla.
const MapaEspacios = dynamic(() => import('./MapaEspacios'), {
  ssr: false,
  loading: () => <div className="esp-mapa esp-mapa--cargando">Cargando mapa…</div>,
})

/**
 * Hueco del mapa con su alto reservado (sin saltos de maquetación). Monta
 * MapaEspacios cuando el hueco está a menos de 300 px de verse.
 */
export default function MapaDiferido({ puntos, alto = 420 }: { puntos: PuntoMapa[]; alto?: number }) {
  const hueco = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = hueco.current
    if (!el || visible) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) { setVisible(true); obs.disconnect() }
    }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])

  if (puntos.length === 0) return null

  return (
    <div ref={hueco} style={{ minHeight: alto }}>
      {visible
        ? <MapaEspacios puntos={puntos} alto={alto} />
        : <div className="esp-mapa esp-mapa--cargando" style={{ height: alto }}>Mapa</div>}
    </div>
  )
}
