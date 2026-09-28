import { textoDelPie, hayMasObras } from '../listado'
import type { PaginaDelListado } from '../listado'

/**
 * SCENAIA-004B §4.8 -- pie de una respuesta de listado: que obras se estan
 * mostrando y, si el servidor ofrece mas, el boton "Ver mas".
 *
 * No decide nada: el texto y si hay mas obras los resuelven las funciones de
 * `listado.ts` a partir de `listingPage`. Si la respuesta no es la ultima del
 * chat, quien lo pinta no pasa `onVerMas` y el boton no aparece.
 *
 * Reutiliza los estilos del chat (`scenaia-notice`, `ds-btn-secondary`): no
 * introduce ninguno nuevo.
 */
export interface ListingFooterProps {
  readonly pagina: PaginaDelListado
  /** Solo en la ultima respuesta. Sin el, no hay boton. */
  readonly onVerMas?: (() => void) | null
  /** Hay una peticion en curso: el boton se muestra, pero no se puede pulsar. */
  readonly bloqueado?: boolean
}

export default function ListingFooter({ pagina, onVerMas = null, bloqueado = false }: ListingFooterProps) {
  const conBoton = onVerMas !== null && hayMasObras(pagina)

  return (
    <div>
      <p className="scenaia-notice" role="status" aria-live="polite">
        {textoDelPie(pagina)}
      </p>
      {conBoton && (
        <button
          type="button"
          className="ds-btn-secondary"
          onClick={onVerMas}
          disabled={bloqueado}
          aria-disabled={bloqueado}
          style={{ marginTop: '6px', ...(bloqueado ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
        >
          Ver más
        </button>
      )}
    </div>
  )
}
