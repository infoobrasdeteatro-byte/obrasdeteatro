'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Postulación a un casting.
 *
 * No comprueba de antemano el plan de pago ni el duplicado: esas dos reglas
 * viven en la base (política "Postulación propia - creación" y el UNIQUE
 * (casting_id, applicant_id)) y allí deciden. Si la escritura falla, se
 * traduce el error; no se adivina el resultado antes de intentarlo.
 *
 * El único adelanto es "ya te postulaste", que la ficha resuelve con una
 * consulta previa — y eso es comodidad de lectura, no una regla replicada.
 */
export default function PostularseForm({
  castingId,
  applicantId,
}: {
  castingId: string
  applicantId: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [carta, setCarta] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [enviada, setEnviada] = useState(false)

  const enviar = async () => {
    setError('')
    setEnviando(true)

    const supabase = createClient()
    const { error: errorInsert } = await supabase
      .from('casting_applications')
      .insert({
        casting_id: castingId,
        applicant_id: applicantId,
        cover_letter: carta.trim() === '' ? null : carta.trim(),
        portfolio_url: portfolio.trim() === '' ? null : portfolio.trim(),
      })

    setEnviando(false)

    if (errorInsert) {
      setError(traducir(errorInsert.message))
      return
    }

    setEnviada(true)
    router.refresh()
  }

  if (enviada) {
    return (
      <div className="ds-alert-success">
        <strong style={{ display: 'block', marginBottom: '2px' }}>Postulación enviada</strong>
        La organización recibirá tu candidatura. Ya no puedes volver a postularte a este casting.
      </div>
    )
  }

  if (!abierto) {
    return (
      <button type="button" className="ds-btn-primary"
        style={{ width: 'auto', padding: '12px 28px' }}
        onClick={() => setAbierto(true)}>
        Postularme
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      <button type="button" className="ds-btn-primary" disabled={enviando}
        style={{ width: 'auto', padding: '12px 28px' }}
        onClick={enviar}>
        {enviando ? 'Enviando…' : 'Enviar postulación'}
      </button>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="cover_letter">Mensaje (opcional)</label>
        <textarea id="cover_letter" className="ds-textarea" rows={4} maxLength={2000}
          value={carta} onChange={e => setCarta(e.target.value)}
          placeholder="Por qué te interesa este casting." />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="portfolio_url">Enlace a tu portfolio (opcional)</label>
        <input id="portfolio_url" className="ds-input" type="url" maxLength={500}
          value={portfolio} onChange={e => setPortfolio(e.target.value)}
          placeholder="https://" />
        <p className="ds-form-hint">Book, videobook, web personal… Puedes enviar la postulación sin rellenar nada.</p>
      </div>

      {error && <div className="ds-alert-error">{error}</div>}

      <button type="button" className="table-link" style={{ alignSelf: 'flex-start' }}
        onClick={() => setAbierto(false)} disabled={enviando}>
        Cancelar
      </button>

    </div>
  )
}

function traducir(mensaje: string): string {
  if (mensaje.includes('duplicate key') || mensaje.includes('unique')) {
    return 'Ya te habías postulado a este casting.'
  }
  if (mensaje.includes('row-level security')) {
    return 'Postularse requiere un plan de pago. Revisa tu plan para presentarte a castings.'
  }
  return `No se pudo enviar la postulación: ${mensaje}`
}
