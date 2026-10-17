'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { mensajeErrorCartelera } from '@/lib/cartelera/cartelera'
import { sumarDias } from '@/lib/cartelera/listado'
import { diaCorto, type Destacado } from '@/lib/cartelera/destacados'

const ORIGEN: Record<string, string> = { plan: 'plan', compra: 'compra', moderacion: 'equipo' }

/**
 * Moderación destaca cualquier espectáculo publicado sin gastar cupo (origen
 * «moderacion»). Ámbito «portada»: entra siempre entre los 4 de la portada.
 * Escribe con la sesión del moderador: la RLS decide.
 */
export default function DestacarModeracion({ espectaculoId, destacados, hoy }: {
  espectaculoId: string; destacados: (Destacado & { ambito: string })[]; hoy: string
}) {
  const router = useRouter()
  const [desde, setDesde] = useState(hoy)
  const [dias, setDias] = useState(7)
  const [ambito, setAmbito] = useState<'ciudad' | 'portada'>('ciudad')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const vigentes = destacados.filter(d => d.hasta >= hoy).sort((a, b) => a.desde.localeCompare(b.desde))

  const destacar = async () => {
    setOcupado(true); setError(null)
    const { error: e } = await createClient().from('cartelera_destacados')
      .insert({ espectaculo_id: espectaculoId, desde, hasta: sumarDias(desde, dias - 1), ambito, origen: 'moderacion' })
    setOcupado(false)
    if (e) { setError(mensajeErrorCartelera(e.message)); return }
    router.refresh()
  }
  const quitar = async (id: string) => {
    if (!confirm('¿Quitar este destacado?')) return
    const { error: e } = await createClient().from('cartelera_destacados').delete().eq('id', id)
    if (e) { setError(mensajeErrorCartelera(e.message)); return }
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
      <span className="cart-fila-label">Destacado</span>
      {vigentes.length > 0 && (
        <ul className="dest-lista">
          {vigentes.map(d => (
            <li key={d.id}>
              <span className={`dest-pill${d.desde <= hoy ? ' dest-pill--on' : ''}`}>
                ★ {diaCorto(d.desde)} – {diaCorto(d.hasta)} · {d.ambito === 'portada' ? 'portada' : 'ciudad'} · {ORIGEN[d.origen] ?? d.origen}
              </span>
              <button type="button" className="table-link table-link--danger" onClick={() => quitar(d.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="ds-label" htmlFor={`md-desde-${espectaculoId}`}>Desde</label>
          <input id={`md-desde-${espectaculoId}`} type="date" className="ds-input" value={desde} min={hoy} onChange={e => setDesde(e.target.value || hoy)} />
        </div>
        <div>
          <label className="ds-label" htmlFor={`md-dias-${espectaculoId}`}>Días</label>
          <select id={`md-dias-${espectaculoId}`} className="ds-select" value={dias} onChange={e => setDias(Number(e.target.value))}>
            {[7, 14, 21, 28].map(n => <option key={n} value={n}>{n} días</option>)}
          </select>
        </div>
        <div>
          <label className="ds-label" htmlFor={`md-amb-${espectaculoId}`}>Dónde</label>
          <select id={`md-amb-${espectaculoId}`} className="ds-select" value={ambito} onChange={e => setAmbito(e.target.value as 'ciudad' | 'portada')}>
            <option value="ciudad">Cartelera y portada (rota)</option>
            <option value="portada">Fijo en la portada</option>
          </select>
        </div>
        <button type="button" className="ds-btn-secondary" disabled={ocupado} style={{ padding: '9px 16px', fontSize: '13px' }} onClick={destacar}>
          {ocupado ? '…' : '★ Destacar'}
        </button>
      </div>
      {error && <div className="ds-alert-error">{error}</div>}
    </div>
  )
}
