'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ALTO, ANCHO, PAISES, PUNTOS, TIERRA } from '@/lib/portada/mapa-geo'
import {
  ETIQUETAS_ACTIVIDAD, TIPOS_ACTIVIDAD, enlaceActividad, paisInicial, type ActividadPais,
} from '@/lib/portada/actividad'
import { COUNTRIES } from '@/lib/geo/countries'

/**
 * «Comunidad hispana» de la portada: mapa real de los 20 países (Natural
 * Earth, lib/portada/mapa-geo) con un punto en cada capital. El tamaño del
 * punto crece con la actividad publicada en el país; al elegir un país
 * (punto, silueta o desplegable) se ven sus cifras y el enlace a cada
 * listado ya filtrado.
 *
 * Las cifras vienen de la rpc actividad_por_pais (lib/portada/datos). Si no
 * se pudieron leer, el mapa y los enlaces siguen funcionando, sin números.
 */

const ORDENADOS = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'es'))

export default function EcosistemaMapaHispano({ actividad }: { actividad: ActividadPais[] | null }) {
  const [elegido, setElegido] = useState(() => paisInicial(actividad))
  const [encima, setEncima] = useState<string | null>(null)

  const porCodigo = new Map((actividad ?? []).map(a => [a.code, a]))
  const maximo = Math.max(1, ...(actividad ?? []).map(a => a.total))
  const radio = (code: string) => {
    const t = porCodigo.get(code)?.total ?? 0
    return actividad ? 2.2 + 4.3 * Math.sqrt(t / maximo) : 3
  }
  const pais = COUNTRIES.find(c => c.code === elegido)!
  const cifras = porCodigo.get(elegido) ?? null
  const etiqueta = encima ?? elegido
  const [ex, ey] = PUNTOS[etiqueta]
  const nombreEtiqueta = COUNTRIES.find(c => c.code === etiqueta)?.name ?? etiqueta
  const totalPaisesActivos = actividad ? actividad.filter(a => a.total > 0).length : null

  const elegir = (code: string) => setElegido(code)
  const teclado = (code: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(code) }
  }

  return (
    <div>
      <div className="eco-sec-header">
        <div className="eco-sec-title">Comunidad hispana</div>
        {totalPaisesActivos !== null && (
          <span className="eco-mapa-resumen">{totalPaisesActivos} de 20 países con actividad</span>
        )}
      </div>
      <div className="eco-comunidad-card eco-reveal">
        <div className="eco-ecosystem-map">
          <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Mapa de los 20 países del ecosistema teatral hispano">
            <rect width={ANCHO} height={ALTO} fill="#17161c" />
            <path d={TIERRA} fill="#24232b" />
            {COUNTRIES.map(c => (
              <path
                key={c.code}
                d={PAISES[c.code]}
                className={`eco-mapa-pais${c.code === elegido ? ' is-elegido' : ''}`}
                onClick={() => elegir(c.code)}
                onMouseEnter={() => setEncima(c.code)}
                onMouseLeave={() => setEncima(null)}
                aria-hidden="true"
              />
            ))}
            {COUNTRIES.map(c => {
              const [x, y] = PUNTOS[c.code]
              const r = radio(c.code)
              const activo = !actividad || (porCodigo.get(c.code)?.total ?? 0) > 0
              return (
                <g
                  key={c.code}
                  className={`eco-mapa-punto${c.code === elegido ? ' is-elegido' : ''}${activo ? '' : ' is-vacio'}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${c.name}${porCodigo.has(c.code) ? `: ${porCodigo.get(c.code)!.total} publicaciones` : ''}`}
                  aria-pressed={c.code === elegido}
                  onClick={() => elegir(c.code)}
                  onKeyDown={teclado(c.code)}
                  onMouseEnter={() => setEncima(c.code)}
                  onMouseLeave={() => setEncima(null)}
                  onFocus={() => setEncima(c.code)}
                  onBlur={() => setEncima(null)}
                >
                  {/* Zona de toque más grande que el punto, para el móvil y Centroamérica. */}
                  <circle cx={x} cy={y} r={Math.max(r + 2, 5)} fill="transparent" />
                  {activo && <circle className="eco-map-node-ring" cx={x} cy={y} r={r} fill="none" stroke="#c8001a" strokeWidth="0.8" />}
                  <circle className="eco-mapa-punto-dot" cx={x} cy={y} r={r} />
                </g>
              )
            })}
            <g pointerEvents="none">
              <text x={ex + (ex > ANCHO - 70 ? -6 : 6)} y={ey < 18 ? ey + 14 : ey - 6} textAnchor={ex > ANCHO - 70 ? 'end' : 'start'}
                className="eco-mapa-etiqueta" stroke="#17161c" strokeWidth="2.5" paintOrder="stroke">{nombreEtiqueta}</text>
            </g>
            <text x="8" y={ALTO - 8} fontFamily="var(--sans)" fontSize="7" fill="rgba(255,255,255,0.28)" letterSpacing="0.6">
              Ecosistema teatral hispano · 20 países
            </text>
          </svg>
        </div>

        <div className="eco-mapa-panel">
          <select className="ds-select eco-mapa-selector" aria-label="Elige un país" value={elegido} onChange={e => elegir(e.target.value)}>
            {ORDENADOS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <ul className="eco-mapa-cifras" aria-live="polite">
            {TIPOS_ACTIVIDAD.map(t => {
              const n = cifras ? cifras[t] : null
              return (
                <li key={t}>
                  <Link href={enlaceActividad(t, { code: pais.code, nombre: pais.name })} className="eco-mapa-fila">
                    <span className="eco-mapa-fila-etiqueta">{ETIQUETAS_ACTIVIDAD[t]}</span>
                    <span className={`eco-mapa-fila-cifra${n === 0 ? ' is-cero' : ''}`}>{n === null ? 'Ver' : n}</span>
                    <span aria-hidden="true" className="eco-mapa-fila-flecha">→</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
