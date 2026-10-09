'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fechaHora } from '@/components/shared/formato'

export type SugerenciaAdmin = {
  id: string
  espacio_id: string
  profile_id: string | null
  texto: string
  email: string | null
  estado: 'pendiente' | 'atendida' | 'descartada'
  motivo_filtro: string | null
  created_at: string
  resuelta_at: string | null
  espacio: { nombre: string; slug: string } | null
  persona: { nombre: string; slug: string | null; email: string } | null
}

const ETIQUETA = { pendiente: 'Pendiente', atendida: 'Atendida', descartada: 'Descartada' } as const

/**
 * Sugerencias de corrección. «Atendida» cuando se ha corregido la ficha (o
 * se ha respondido); «Descartada» si no procede. Las que el filtro de
 * moderacion_reglas descartó al entrar se ven con su motivo y se pueden
 * recuperar a pendiente.
 *
 * Con la sesión del moderador (política «Moderación gestiona sugerencias»).
 */
export default function BandejaSugerencias({ inicial }: { inicial: SugerenciaAdmin[] }) {
  const router = useRouter()
  const [lista, setLista] = useState(inicial)
  const [verResueltas, setVerResueltas] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState('')

  const pendientes = lista.filter(s => s.estado === 'pendiente')
  const visibles = verResueltas ? lista : pendientes

  const cambiar = async (s: SugerenciaAdmin, estado: SugerenciaAdmin['estado']) => {
    setError('')
    setOcupado(s.id)
    const { data, error: err } = await createClient()
      .from('espacios_sugerencias')
      .update({ estado })
      .eq('id', s.id)
      .select('estado, resuelta_at')
    setOcupado(null)
    if (err) { setError(err.message); return }
    if (!data || data.length === 0) { setError('No se pudo cambiar: recarga la página.'); return }
    setLista(l => l.map(x => (x.id === s.id ? { ...x, estado, resuelta_at: data[0].resuelta_at } : x)))
    router.refresh()
  }

  return (
    <section aria-labelledby="sugerencias-titulo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <h2 id="sugerencias-titulo" style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)' }}>Sugerencias de corrección</h2>
        <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input type="checkbox" checked={verResueltas} onChange={e => setVerResueltas(e.target.checked)} />
          Ver también las atendidas y descartadas
        </label>
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '12px' }}>{error}</div>}

      {visibles.length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>No hay sugerencias pendientes.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibles.map(s => (
            <article key={s.id} className="account-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '15px', color: 'var(--black)', fontWeight: 500 }}>
                    {s.espacio
                      ? <a href={`/espacios/${s.espacio.slug}`} target="_blank" rel="noopener" className="table-link">{s.espacio.nombre}</a>
                      : 'Espacio eliminado'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {s.persona ? `${s.persona.nombre} (${s.persona.email})` : 'Visitante sin sesión'}
                    {s.email && <> · responder a <a href={`mailto:${s.email}`} className="table-link">{s.email}</a></>}
                    {' · '}{fechaHora(s.created_at)}
                  </p>
                </div>
                <span className={`status-pill ${s.estado === 'atendida' ? 'status-pill--published' : 'status-pill--draft'}`}>{ETIQUETA[s.estado]}</span>
              </div>
              {s.motivo_filtro && (
                <p className="ds-form-hint" style={{ marginTop: '8px', color: 'var(--red)' }}>Descartada al entrar por el filtro: {s.motivo_filtro}</p>
              )}
              <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.55, marginTop: '10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{s.texto}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {s.estado !== 'atendida' && (
                  <button type="button" className="ds-btn-primary" disabled={ocupado !== null}
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '13px' }} onClick={() => cambiar(s, 'atendida')}>
                    {ocupado === s.id ? 'Guardando…' : 'Marcar atendida'}
                  </button>
                )}
                {s.estado !== 'descartada' && (
                  <button type="button" className="ds-btn-secondary" disabled={ocupado !== null}
                    style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => cambiar(s, 'descartada')}>
                    Descartar
                  </button>
                )}
                {s.estado !== 'pendiente' && (
                  <button type="button" className="ds-btn-secondary" disabled={ocupado !== null}
                    style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => cambiar(s, 'pendiente')}>
                    Volver a pendiente
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
