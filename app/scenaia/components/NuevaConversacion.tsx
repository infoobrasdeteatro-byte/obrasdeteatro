import { mostrarNuevaConversacion, puedeEmpezarNueva } from '../conversacion'

/**
 * Boton "Nueva conversacion". No decide nada: si se muestra y si se puede
 * pulsar lo resuelven las funciones de `conversacion.ts`; que hacer al
 * pulsarlo, ScenaiaClient.
 *
 * Reutiliza los estilos del chat (`ds-btn-secondary`), como "Ver mas": no
 * introduce ninguno nuevo.
 */
export interface NuevaConversacionProps {
  readonly mensajes: readonly unknown[]
  /** Hay un turno en curso: el boton se muestra, pero no se puede pulsar. */
  readonly pendiente: boolean
  readonly onNueva: () => void
}

export default function NuevaConversacion({ mensajes, pendiente, onNueva }: NuevaConversacionProps) {
  if (!mostrarNuevaConversacion(mensajes)) return null

  const bloqueado = !puedeEmpezarNueva(mensajes, pendiente)

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
      <button
        type="button"
        className="ds-btn-secondary"
        onClick={onNueva}
        disabled={bloqueado}
        aria-disabled={bloqueado}
        style={bloqueado ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      >
        Nueva conversación
      </button>
    </div>
  )
}
