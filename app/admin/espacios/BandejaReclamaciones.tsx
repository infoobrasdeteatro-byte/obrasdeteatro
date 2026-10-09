'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fechaHora } from '@/components/shared/formato'

export type ReclamacionAdmin = {
  id: string
  espacio_id: string
  profile_id: string
  mensaje: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  created_at: string
  resuelta_at: string | null
  espacio: { nombre: string; slug: string } | null
  persona: { nombre: string; slug: string | null; email: string } | null
}

/**
 * Bandeja de reclamaciones de fichas. Aprobar cambia el estado a «aprobada»
 * y el trigger espacios_reclamaciones_aprobar rellena gestionado_por del
 * espacio con el perfil de quien reclamó. Rechazar solo cambia el estado.
 *
 * Con la sesión del moderador (política «Moderación gestiona
 * reclamaciones»). Antes de aprobar hay que comprobar por otro canal que la
 * persona gestiona el espacio: aquí solo se registra la decisión.
 */
export default function BandejaReclamaciones({ inicial }: { inicial: ReclamacionAdmin[] }) {
  const router = useRouter()
  const [lista, setLista] = useState(inicial)
  const [verResueltas, setVerResueltas] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const pendientes = lista.filter(r => r.estado === 'pendiente')
  const visibles = verResueltas ? lista : pendientes

  const resolver = async (r: ReclamacionAdmin, estado: 'aprobada' | 'rechazada') => {
    const nombre = r.espacio?.nombre ?? 'este espacio'
    const pregunta = estado === 'aprobada'
      ? `¿Aprobar? ${r.persona?.nombre ?? 'Esta persona'} pasará a gestionar «${nombre}». Confírmalo antes por otro canal.`
      : `¿Rechazar la reclamación de «${nombre}»?`
    if (!window.confirm(pregunta)) return

    setError('')
    setAviso('')
    setOcupado(r.id)
    const { data, error: err } = await createClient()
      .from('espacios_reclamaciones')
      .update({ estado })
      .eq('id', r.id)
      .eq('estado', 'pendiente')
      .select('id, estado, resuelta_at')
    setOcupado(null)
    if (err) { setError(err.message); return }
    if (!data || data.length === 0) { setError('Ya no estaba pendiente: recarga la página.'); return }

    setLista(l => l.map(x => (x.id === r.id ? { ...x, estado, resuelta_at: data[0].resuelta_at } : x)))
    setAviso(estado === 'aprobada'
      ? `Aprobada: «${nombre}» queda gestionado por ${r.persona?.nombre ?? 'quien lo reclamó'}. Avísale por correo.`
      : `Rechazada la reclamación de «${nombre}».`)
    router.refresh()
  }

  return (
    <section aria-labelledby="reclamaciones-titulo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <h2 id="reclamaciones-titulo" style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)' }}>
          Reclamaciones {pendientes.length > 0 && <span className="status-pill status-pill--draft">{pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}</span>}
        </h2>
        <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input type="checkbox" checked={verResueltas} onChange={e => setVerResueltas(e.target.checked)} />
          Ver también las resueltas
        </label>
      </div>

      {aviso && <div className="ds-alert-success" style={{ marginBottom: '12px' }}>{aviso}</div>}
      {error && <div className="ds-alert-error" style={{ marginBottom: '12px' }}>{error}</div>}

      {visibles.length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>No hay reclamaciones pendientes.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibles.map(r => (
            <article key={r.id} className="account-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '15px', color: 'var(--black)', fontWeight: 500 }}>
                    {r.espacio
                      ? <a href={`/espacios/${r.espacio.slug}`} target="_blank" rel="noopener" className="table-link">{r.espacio.nombre}</a>
                      : 'Espacio eliminado'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {r.persona
                      ? <>
                          {r.persona.slug
                            ? <a href={`/perfil/${r.persona.slug}`} target="_blank" rel="noopener" className="table-link">{r.persona.nombre}</a>
                            : r.persona.nombre}
                          {' · '}{r.persona.email}
                        </>
                      : 'Perfil desconocido'}
                    {' · '}{fechaHora(r.created_at)}
                  </p>
                </div>
                <span className={`status-pill ${r.estado === 'aprobada' ? 'status-pill--published' : 'status-pill--draft'}`}>
                  {r.estado === 'pendiente' ? 'Pendiente' : r.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.55, marginTop: '10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {r.mensaje}
              </p>
              {r.estado === 'pendiente' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="ds-btn-primary" disabled={ocupado !== null}
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '13px' }} onClick={() => resolver(r, 'aprobada')}>
                    {ocupado === r.id ? 'Guardando…' : 'Aprobar'}
                  </button>
                  <button type="button" className="ds-btn-secondary" disabled={ocupado !== null}
                    style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => resolver(r, 'rechazada')}>
                    Rechazar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
