'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { estiloMapa, urlWorker, type PuntoMapa } from '@/lib/espacios/mapa'

/**
 * Mapa de MapLibre GL con teselas vectoriales de OpenFreeMap (sin clave).
 * La atribución (OpenFreeMap, © OpenMapTiles, © OpenStreetMap) la pone el
 * propio estilo en el control de atribución, que se deja siempre visible.
 *
 * No se importa directamente: lo carga MapaDiferido cuando el mapa entra en
 * pantalla, así la librería (~250 KB comprimida) no pesa en la carga de la
 * página.
 *
 * Con varios puntos encuadra todos y, al pulsar uno, abre una ventana con el
 * nombre, el tipo y el enlace a la ficha. Con un solo punto (ficha) centra en
 * él sin ventana.
 */
export default function MapaEspacios({ puntos, alto }: { puntos: PuntoMapa[]; alto: number }) {
  const contenedor = useRef<HTMLDivElement>(null)
  // El mapa se crea una vez por conjunto de puntos, no en cada render.
  const clave = JSON.stringify(puntos)

  useEffect(() => {
    const puntos = JSON.parse(clave) as PuntoMapa[]
    if (!contenedor.current || puntos.length === 0) return
    maplibregl.setWorkerUrl(urlWorker(maplibregl.getVersion()))

    const unico = puntos.length === 1
    const mapa = new maplibregl.Map({
      container: contenedor.current,
      style: estiloMapa(),
      center: [puntos[0].lon, puntos[0].lat],
      zoom: unico ? 15 : 5,
      attributionControl: { compact: false },
      cooperativeGestures: true,
      maxZoom: 18,
    })
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    if (!unico) {
      const limites = new maplibregl.LngLatBounds()
      for (const p of puntos) limites.extend([p.lon, p.lat])
      mapa.fitBounds(limites, { padding: 40, maxZoom: 14, duration: 0 })
    }

    mapa.on('load', () => {
      mapa.addSource('espacios', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: puntos.map(p => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
            properties: { nombre: p.nombre, tipo: p.tipo, url: p.url },
          })),
        },
      })
      mapa.addLayer({
        id: 'espacios-puntos',
        type: 'circle',
        source: 'espacios',
        paint: {
          'circle-radius': unico ? 9 : 6,
          'circle-color': '#c8001a',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      if (unico) return

      mapa.on('click', 'espacios-puntos', ev => {
        const f = ev.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        const props = f.properties as { nombre: string; tipo: string; url: string }
        // Contenido con nodos y textContent: nada de HTML con datos dentro.
        const caja = document.createElement('div')
        caja.className = 'esp-mapa-popup'
        const tipo = document.createElement('p')
        tipo.className = 'esp-tarjeta-tipo'
        tipo.textContent = props.tipo
        const nombre = document.createElement('p')
        nombre.className = 'esp-mapa-popup-nombre'
        nombre.textContent = props.nombre
        const enlace = document.createElement('a')
        enlace.href = props.url
        enlace.className = 'table-link'
        enlace.textContent = 'Ver ficha →'
        caja.append(tipo, nombre, enlace)
        new maplibregl.Popup({ offset: 10, maxWidth: '260px' })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setDOMContent(caja)
          .addTo(mapa)
      })
      mapa.on('mouseenter', 'espacios-puntos', () => { mapa.getCanvas().style.cursor = 'pointer' })
      mapa.on('mouseleave', 'espacios-puntos', () => { mapa.getCanvas().style.cursor = '' })
    })

    return () => mapa.remove()
  }, [clave])

  return <div ref={contenedor} className="esp-mapa" style={{ height: alto }} role="region" aria-label="Mapa de espacios escénicos" />
}
