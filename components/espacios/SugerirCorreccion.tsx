'use client'

import { useState } from 'react'
import { CAMPO_TRAMPA, MAX_SUGERENCIA, validarSugerencia } from '@/lib/espacios/espacios'

type Estado = 'cerrado' | 'abierto' | 'enviando' | 'enviado'

/**
 * «Sugerir una corrección», abierto a cualquiera, con o sin sesión. Llama a
 * POST /api/espacios/sugerencias; el antispam (campo trampa, 3 por hora por
 * conexión y reglas de moderación) lo deciden la ruta y la base.
 *
 * El campo trampa va fuera de pantalla y sin tabulación: una persona no lo
 * ve ni lo rellena; un robot que rellena todo, sí.
 */
export default function SugerirCorreccion({ espacioId }: { espacioId: string }) {
  const [estado, setEstado] = useState<Estado>('cerrado')
  const [texto, setTexto] = useState('')
  const [email, setEmail] = useState('')
  const [trampa, setTrampa] = useState('')
  const [error, setError] = useState('')

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const problema = validarSugerencia(texto, email)
    if (problema) { setError(problema); return }
    setError('')
    setEstado('enviando')
    try {
      const res = await fetch('/api/espacios/sugerencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacio_id: espacioId, texto, email, [CAMPO_TRAMPA]: trampa }),
      })
      const datos = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof datos.error === 'string' ? datos.error : 'No se pudo enviar la sugerencia.')
        setEstado('abierto')
        return
      }
      setEstado('enviado')
    } catch {
      setError('No se pudo enviar la sugerencia. Comprueba la conexión.')
      setEstado('abierto')
    }
  }

  if (estado === 'enviado') {
    return <div className="ds-alert-success">Gracias. La Redacción revisará tu sugerencia y corregirá la ficha si procede.</div>
  }

  if (estado === 'cerrado') {
    return (
      <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
        ¿Algún dato está mal o falta algo?{' '}
        <button type="button" className="table-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
          onClick={() => setEstado('abierto')}>
          Sugerir una corrección
        </button>
      </p>
    )
  }

  return (
    <form onSubmit={enviar} style={{ position: 'relative' }}>
      <h2 className="esp-bloque-titulo">Sugerir una corrección</h2>
      <div className="ds-form-group">
        <label className="ds-label" htmlFor="sug-texto">¿Qué hay que corregir o añadir? *</label>
        <textarea id="sug-texto" className="ds-textarea" rows={4} maxLength={MAX_SUGERENCIA}
          placeholder="Ej.: el teléfono de taquilla ha cambiado, ahora es…"
          value={texto} onChange={ev => setTexto(ev.target.value)} />
        <p className="ds-form-hint">{texto.length} / {MAX_SUGERENCIA} caracteres</p>
      </div>
      <div className="ds-form-group" style={{ marginTop: '10px' }}>
        <label className="ds-label" htmlFor="sug-email">Tu email (opcional)</label>
        <input id="sug-email" type="email" className="ds-input" maxLength={254} autoComplete="email"
          value={email} onChange={ev => setEmail(ev.target.value)} />
        <p className="ds-form-hint">Solo para responderte si hace falta. No se publica.</p>
      </div>
      <div className="esp-trampa" aria-hidden="true">
        <label htmlFor="sug-trampa">No rellenes este campo</label>
        <input id="sug-trampa" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" value={trampa} onChange={ev => setTrampa(ev.target.value)} />
      </div>
      {error && <div className="ds-alert-error" style={{ marginTop: '10px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button type="submit" className="ds-btn-primary" disabled={estado === 'enviando'} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}>
          {estado === 'enviando' ? 'Enviando…' : 'Enviar sugerencia'}
        </button>
        <button type="button" className="ds-btn-secondary" disabled={estado === 'enviando'} style={{ padding: '9px 18px', fontSize: '13px' }}
          onClick={() => { setEstado('cerrado'); setError('') }}>
          Cancelar
        </button>
      </div>
      <p className="ds-form-hint" style={{ marginTop: '10px' }}>
        Más información sobre el tratamiento de tus datos en la{' '}
        <a href="/legal/privacidad" className="table-link">Política de Privacidad</a>.
      </p>
    </form>
  )
}
