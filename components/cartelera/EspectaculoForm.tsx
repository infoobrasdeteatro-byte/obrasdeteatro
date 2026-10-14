'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  GENEROS, IDIOMAS, CAMPOS_VACIOS, validarEspectaculo, aFilaEspectaculo, mensajeErrorCartelera, type CamposEspectaculo,
} from '@/lib/cartelera/cartelera'

/**
 * Datos del espectáculo, para el alta y la edición. Al crear se guarda como
 * borrador y se pasa a la página de edición, donde se añaden el cartel, las
 * funciones, las entradas y la ficha artística, y se envía a publicar.
 */
export default function EspectaculoForm({
  userId,
  inicial,
  espectaculo,
}: {
  userId: string
  inicial?: CamposEspectaculo
  espectaculo?: { id: string; estado: string }
}) {
  const router = useRouter()
  const editando = Boolean(espectaculo)
  const [c, setC] = useState<CamposEspectaculo>(inicial ?? CAMPOS_VACIOS)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const set = <K extends keyof CamposEspectaculo>(k: K, v: CamposEspectaculo[K]) => setC(p => ({ ...p, [k]: v }))
  const visible = espectaculo?.estado === 'publicado' || espectaculo?.estado === 'finalizado'

  const guardar = async () => {
    setError(''); setExito('')
    const problema = validarEspectaculo(c)
    if (problema) { setError(problema); return }
    setGuardando(true)
    const supabase = createClient()
    const fila = aFilaEspectaculo(c)

    if (!editando) {
      const { data, error: e } = await supabase
        .from('espectaculos')
        .insert({ ...fila, user_id: userId, estado: 'borrador' })
        .select('id')
        .single()
      setGuardando(false)
      if (e || !data) { setError(mensajeErrorCartelera(e?.message)); return }
      router.push(`/mis-espectaculos/${data.id}/editar?nuevo=1`)
      return
    }

    const { data, error: e } = await supabase
      .from('espectaculos')
      .update(fila)
      .eq('id', espectaculo!.id)
      .select('estado')
      .single()
    setGuardando(false)
    if (e || !data) { setError(mensajeErrorCartelera(e?.message)); return }
    setExito(visible && data.estado === 'pendiente_revision'
      ? 'Cambios guardados. Como has cambiado el texto, el equipo lo revisa antes de volver a mostrarlo.'
      : 'Cambios guardados.')
    router.refresh()
  }

  return (
    <form className="account-card" onSubmit={e => { e.preventDefault(); guardar() }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Seccion titulo="El espectáculo" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="titulo">Título *</label>
        <input id="titulo" className="ds-input" required maxLength={160}
          value={c.titulo} onChange={e => set('titulo', e.target.value)} placeholder="La casa de Bernarda Alba" />
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="compania_nombre">Compañía o quien lo presenta *</label>
          <input id="compania_nombre" className="ds-input" required maxLength={160}
            value={c.compania_nombre} onChange={e => set('compania_nombre', e.target.value)} placeholder="Compañía Teatro del Sur" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="genero_id">Género *</label>
          <select id="genero_id" className="ds-select" value={c.genero_id} onChange={e => set('genero_id', e.target.value)}>
            {GENEROS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="duracion_min">Duración (minutos)</label>
          <input id="duracion_min" className="ds-input" inputMode="numeric"
            value={c.duracion_min} onChange={e => set('duracion_min', e.target.value)} placeholder="90" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="edad_minima">Edad recomendada (desde)</label>
          <input id="edad_minima" className="ds-input" inputMode="numeric"
            value={c.edad_minima} onChange={e => set('edad_minima', e.target.value)} placeholder="Sin indicar = todos los públicos" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="idioma">Idioma</label>
          <select id="idioma" className="ds-select" value={c.idioma} onChange={e => set('idioma', e.target.value)}>
            {IDIOMAS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="sinopsis">Sinopsis</label>
        <textarea id="sinopsis" className="ds-textarea" rows={7} maxLength={4000}
          value={c.sinopsis} onChange={e => set('sinopsis', e.target.value)}
          placeholder="De qué trata, qué va a ver el público y por qué no se lo puede perder." />
      </div>

      {error && <div className="ds-alert-error">{error}</div>}
      {exito && <div className="ds-alert-success">{exito}</div>}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
        <button type="submit" className={editando ? 'ds-btn-secondary' : 'ds-btn-primary'} disabled={guardando}
          style={{ width: 'auto', padding: '11px 22px', fontSize: '13px' }}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Continuar: cartel y funciones →'}
        </button>
      </div>
      {!editando && (
        <p className="ds-form-hint">
          Se guarda como borrador. En el siguiente paso añades el cartel, las funciones y dónde comprar
          las entradas, y lo envías a publicar.
        </p>
      )}
      {visible && (
        <p className="ds-form-hint">
          Si cambias el título, la compañía o la sinopsis de un espectáculo publicado, puede volver a revisión
          antes de mostrarse de nuevo.
        </p>
      )}
    </form>
  )
}

export function Seccion({ titulo }: { titulo: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginTop: '8px' }}>
      <span className="obras-stat-label">{titulo}</span>
    </div>
  )
}
