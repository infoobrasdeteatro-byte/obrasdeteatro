'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLES, etiquetaRol, validarPersona, separarNombres, mensajeErrorCartelera } from '@/lib/cartelera/cartelera'
import { Seccion } from './EspectaculoForm'

export type PersonaPropia = { id: string; nombre: string; rol: string; personaje: string | null; orden: number }

/** Reparto y equipo artístico, en el orden en que se añaden. */
export default function FichaArtisticaEditor({ espectaculoId, personas }: { espectaculoId: string; personas: PersonaPropia[] }) {
  const router = useRouter()
  const [c, setC] = useState({ nombre: '', rol: 'reparto', personaje: '' })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const anadir = async () => {
    setError('')
    const problema = validarPersona(c)
    if (problema) { setError(problema); return }
    setOcupado(true)
    const base = personas.length ? Math.max(...personas.map(p => p.orden)) + 10 : 10
    const nombres = separarNombres(c.nombre)
    // El personaje solo tiene sentido con un nombre; con varios, cada uno sin personaje.
    const personaje = c.rol === 'reparto' && nombres.length === 1 ? c.personaje.trim() || null : null
    const { error: e } = await createClient().from('espectaculo_personas').insert(
      nombres.map((nombre, i) => ({ espectaculo_id: espectaculoId, nombre, rol: c.rol, personaje, orden: base + i * 10 })),
    )
    setOcupado(false)
    if (e) { setError(mensajeErrorCartelera(e.message)); return }
    setC(p => ({ ...p, nombre: '', personaje: '' }))
    router.refresh()
  }

  const borrar = async (id: string) => {
    const { error: e } = await createClient().from('espectaculo_personas').delete().eq('id', id)
    if (e) setError(mensajeErrorCartelera(e.message))
    router.refresh()
  }

  return (
    <section className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Seccion titulo="Ficha artística" />
      {personas.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {personas.map(p => (
            <li key={p.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--muted)', minWidth: '110px' }}>{etiquetaRol(p.rol)}</span>
              <span style={{ flex: 1 }}><strong>{p.nombre}</strong>{p.personaje ? ` (${p.personaje})` : ''}</span>
              <button type="button" className="table-link table-link--danger" onClick={() => borrar(p.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="per_rol">Papel</label>
          <select id="per_rol" className="ds-select" value={c.rol} onChange={e => setC(p => ({ ...p, rol: e.target.value }))}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="per_nombre">Nombre</label>
          <input id="per_nombre" className="ds-input" maxLength={2000} value={c.nombre}
            onChange={e => setC(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre y apellidos (varios, separados por comas)" />
        </div>
        {c.rol === 'reparto' && separarNombres(c.nombre).length <= 1 && (
          <div className="ds-form-group">
            <label className="ds-label" htmlFor="per_personaje">Personaje</label>
            <input id="per_personaje" className="ds-input" maxLength={120} value={c.personaje}
              onChange={e => setC(p => ({ ...p, personaje: e.target.value }))} placeholder="Opcional" />
          </div>
        )}
      </div>
      <p className="ds-form-hint" style={{ marginTop: '-6px' }}>
        Puedes añadir varias personas con el mismo papel de una vez, separando los nombres con comas
        (por ejemplo, todo el reparto). El personaje se indica de uno en uno.
      </p>
      {error && <div className="ds-alert-error">{error}</div>}
      <div>
        <button type="button" className="ds-btn-secondary" disabled={ocupado}
          style={{ padding: '9px 18px', fontSize: '13px' }} onClick={anadir}>
          {ocupado ? 'Añadiendo…' : '+ Añadir a la ficha'}
        </button>
      </div>
    </section>
  )
}
