'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { suscribirse, type EstadoSuscripcion } from '@/app/boletin/acciones'

/**
 * Recuadro de suscripción al boletín. Correo + casilla de consentimiento
 * (RGPD) + trampa oculta para robots. El alta real llega con el correo de
 * confirmación (doble opt-in).
 */
export default function FormularioBoletin({ nombre, origen, compacto = false }: { nombre: string; origen: 'portada' | 'pie' | 'otro'; compacto?: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoSuscripcion, FormData>(suscribirse, null)

  if (estado?.ok) {
    return <div className="ds-alert-success" role="status">{estado.mensaje}</div>
  }

  return (
    <form action={accion} className={compacto ? 'boletin-form boletin-form--compacto' : 'boletin-form'}>
      <input type="hidden" name="origen" value={origen} />
      <div className="boletin-trampa" aria-hidden="true">
        <label>Web <input type="text" name="web" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="boletin-fila">
        <label className="visually-hidden" htmlFor={`boletin-email-${origen}`}>Tu correo electrónico</label>
        <input id={`boletin-email-${origen}`} type="email" name="email" required maxLength={254} placeholder="Tu correo electrónico"
          className="ds-input" autoComplete="email" />
        <button type="submit" className="ds-btn-primary" disabled={enviando} style={{ width: 'auto', padding: '10px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {enviando ? 'Enviando…' : 'Suscribirme'}
        </button>
      </div>
      <label className="boletin-consentimiento">
        <input type="checkbox" name="consentimiento" required />
        <span>
          Quiero recibir {nombre} y acepto la <Link href="/legal/privacidad" className="table-link">política de privacidad</Link>.
          Puedo darme de baja cuando quiera.
        </span>
      </label>
      {estado && !estado.ok && <div className="ds-alert-error" role="alert" style={{ marginTop: '8px' }}>{estado.mensaje}</div>}
    </form>
  )
}
