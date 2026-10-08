'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export type FotoPublica = { id: string; url: string; alt: string; pie: string | null; credito: string | null }

/**
 * Galería del perfil público: cuadrícula de miniaturas (next/image, lazy) y
 * visor a pantalla completa con <dialog>.
 *
 * Teclado: cada miniatura es un botón; en el visor, ← y → pasan de foto,
 * Esc cierra (lo da <dialog>) y el foco vuelve a la miniatura de la que se
 * partió.
 */
export default function GaleriaFotos({ fotos }: { fotos: FotoPublica[] }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const miniaturas = useRef<(HTMLButtonElement | null)[]>([])
  const [actual, setActual] = useState<number | null>(null)

  const abrir = (i: number) => {
    setActual(i)
    dialogo.current?.showModal()
  }

  const cerrar = useCallback(() => {
    dialogo.current?.close()
  }, [])

  const mover = useCallback((paso: number) => {
    setActual(i => (i === null ? i : (i + paso + fotos.length) % fotos.length))
  }, [fotos.length])

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    const alCerrar = () => {
      setActual(i => {
        if (i !== null) miniaturas.current[i]?.focus()
        return null
      })
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); mover(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1) }
    }
    d.addEventListener('close', alCerrar)
    d.addEventListener('keydown', alTeclear)
    return () => {
      d.removeEventListener('close', alCerrar)
      d.removeEventListener('keydown', alTeclear)
    }
  }, [mover])

  if (fotos.length === 0) return null
  const foto = actual !== null ? fotos[actual] : null

  return (
    <>
      <ul className="prof-galeria">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button type="button" className="prof-galeria-miniatura" onClick={() => abrir(i)}
              ref={el => { miniaturas.current[i] = el }}
              aria-label={`Ver a pantalla completa: ${f.alt}`}>
              <Image src={f.url} alt={f.alt} fill sizes="(max-width: 640px) 50vw, 280px" style={{ objectFit: 'cover' }} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialogo} className="prof-visor" aria-label="Visor de fotos">
        {foto && (
          <figure className="prof-visor-figura">
            <div className="prof-visor-imagen">
              <Image src={foto.url} alt={foto.alt} fill sizes="100vw" style={{ objectFit: 'contain' }} />
            </div>
            {(foto.pie || foto.credito) && (
              <figcaption className="prof-visor-pie">
                {foto.pie}
                {foto.credito && <span className="prof-visor-credito">{foto.pie ? ' · ' : ''}{foto.credito}</span>}
              </figcaption>
            )}
          </figure>
        )}
        <p className="prof-visor-contador" aria-live="polite">
          {actual !== null && `${actual + 1} de ${fotos.length}`}
        </p>
        {fotos.length > 1 && (
          <>
            <button type="button" className="prof-visor-boton prof-visor-anterior" onClick={() => mover(-1)} aria-label="Foto anterior">‹</button>
            <button type="button" className="prof-visor-boton prof-visor-siguiente" onClick={() => mover(1)} aria-label="Foto siguiente">›</button>
          </>
        )}
        <button type="button" className="prof-visor-boton prof-visor-cerrar" onClick={cerrar} aria-label="Cerrar el visor" autoFocus>×</button>
      </dialog>
    </>
  )
}
