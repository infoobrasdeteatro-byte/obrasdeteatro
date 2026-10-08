'use client'

import { useEffect, useRef } from 'react'

/**
 * Selector de imagen con aspecto de botón secundario («Elegir imagen») y el
 * nombre del archivo al lado.
 *
 * El <input type="file"> sigue en la página (visualmente oculto, pero
 * enfocable): el teclado y los lectores de pantalla lo usan como siempre, y
 * el botón es su <label>. Cuando el archivo vuelve a null (tras subirlo con
 * éxito), se vacía también el input: si no, el navegador conservaría el
 * nombre anterior.
 */
export default function SelectorImagen({
  id,
  archivo,
  onCambio,
  etiqueta = 'Elegir imagen',
  invalido = false,
  descripcion,
  deshabilitado = false,
}: {
  id: string
  archivo: File | null
  onCambio: (archivo: File | null) => void
  etiqueta?: string
  invalido?: boolean
  descripcion?: string
  deshabilitado?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!archivo && input.current) input.current.value = ''
  }, [archivo])

  return (
    <div className="selector-imagen">
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="selector-imagen-input"
        disabled={deshabilitado}
        aria-invalid={invalido || undefined}
        aria-describedby={descripcion}
        onChange={e => onCambio(e.target.files?.[0] ?? null)}
      />
      <label htmlFor={id} className={`ds-btn-secondary selector-imagen-boton${invalido ? ' selector-imagen-boton--error' : ''}`}>
        {etiqueta}
      </label>
      <span className="selector-imagen-nombre" aria-live="polite">
        {archivo ? archivo.name : 'Ningún archivo elegido'}
      </span>
    </div>
  )
}
