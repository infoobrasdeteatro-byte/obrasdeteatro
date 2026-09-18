'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fecha, fechaHora } from '@/components/shared/formato'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'

export type ConvocatoriaPendiente = {
  id: string
  title: string
  description: string | null
  category: string | null
  location: string | null
  deadline: string | null
  prize: string | null
  creadaEn: string | null
  entradaEnCola: string | null
  motivoFiltro: string | null
  organizadorNombre: string | null
  organizadorTipo: string | null
}

/** Horas que una convocatoria lleva esperando en la cola. */
function horasEsperando(entrada: string | null): number | null {
  if (!entrada) return null
  const t = new Date(entrada).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 3_600_000)
}

function IconoAviso() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function ColaModeracion({ pendientes }: { pendientes: ConvocatoriaPendiente[] }) {
  const router = useRouter()
  const [expandida, setExpandida] = useState<string | null>(null)
  const [rechazando, setRechazando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [resueltas, setResueltas] = useState<Record<string, string>>({})

  /**
   * Aprueba o rechaza escribiendo con la sesión del moderador (cliente de
   * navegador, clave anónima): la petición viaja con su JWT, así que la
   * política «Moderación gestiona convocatorias» y el guard del trigger
   * deciden de verdad. El `.select()` posterior devuelve la fila YA pasada por
   * el trigger, que es lo que se muestra: si el servidor hubiera corregido el
   * estado, se vería aquí en vez de asumirse.
   *
   * Al rechazar se guarda `motivo_rechazo` en el mismo UPDATE. Sin él, el
   * organizador vería el rechazo pero no el porqué, que era el hueco que esta
   * pantalla tenía frente a la cola de castings.
   */
  const resolver = async (id: string, estado: 'publicado' | 'rechazado', motivoRechazo?: string) => {
    setOcupada(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })

    const supabase = createClient()
    const cambios = estado === 'rechazado'
      ? { estado, motivo_rechazo: motivoRechazo ?? null }
      : { estado }

    const { data, error } = await supabase
      .from('calls')
      .update(cambios)
      .eq('id', id)
      .select('estado')
      .single()

    setOcupada(null)

    if (error) {
      setErrores(p => ({ ...p, [id]: traducir(error.message) }))
      return
    }

    if (!data) {
      setErrores(p => ({ ...p, [id]: 'La actualización no devolvió ninguna fila: revisa tu rol de moderación.' }))
      return
    }

    setRechazando(null)
    setMotivo('')
    setResueltas(p => ({
      ...p,
      [id]: data.estado === 'publicado'
        ? 'Aprobada y publicada.'
        : data.estado === 'rechazado'
          ? 'Rechazada. El organizador verá el motivo.'
          : `Quedó en ${data.estado}.`,
    }))

    router.refresh()
  }

  if (pendientes.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>
          No hay convocatorias esperando revisión.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {pendientes.map(c => {
        const horas = horasEsperando(c.entradaEnCola)
        const retrasada = horas !== null && horas >= 48
        const enCurso = ocupada === c.id
        const resuelta = resueltas[c.id]

        return (
          <article key={c.id} className="account-card">

            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  {c.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {c.organizadorNombre ?? 'Organizador sin identificar'}
                  {c.organizadorTipo && ` · ${c.organizadorTipo}`}
                </p>
              </div>
              {/* El SLA de 48 h no publica nada solo: por decisión de producto,
                  pasado el plazo la convocatoria sigue pendiente y solo se
                  marca como retrasada. */}
              {retrasada && (
                <span className="status-pill" style={{ background: 'var(--red-light)', color: 'var(--red-h)', flexShrink: 0 }}>
                  {horas} h esperando
                </span>
              )}
            </header>

            {/* Lo que señaló el filtro automático. No es un rechazo ni una
                retención definitiva: aquí solo indica qué mirar primero. */}
            {c.motivoFiltro && (
              <div className="ds-status-banner ds-status-banner--draft" style={{ marginTop: '14px' }}>
                <div>
                  <div className="ds-status-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconoAviso />
                    {c.motivoFiltro}
                  </div>
                  <div className="ds-status-hint">
                    Señalado por el filtro automático. Conviene leer el texto completo antes de aprobar.
                  </div>
                </div>
              </div>
            )}

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '14px' }}>
              <div>
                <dt className="obras-stat-label">Categoría</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{etiquetaCategoria(c.category)}</dd>
              </div>
              <div>
                <dt className="obras-stat-label">Lugar</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{c.location ?? '—'}</dd>
              </div>
              <div>
                <dt className="obras-stat-label">Fecha límite</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {c.deadline ? fecha(c.deadline) : 'Sin fecha límite'}
                </dd>
              </div>
              <div>
                <dt className="obras-stat-label">En cola desde</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{fechaHora(c.entradaEnCola)}</dd>
              </div>
            </dl>

            {c.prize && (
              <p style={{ fontSize: '13px', color: 'var(--text)', marginTop: '12px' }}>
                <span className="obras-stat-label">Dotación</span><br />{c.prize}
              </p>
            )}

            {c.description && (
              <div style={{ marginTop: '14px' }}>
                <button type="button" className="table-link"
                  onClick={() => setExpandida(expandida === c.id ? null : c.id)}>
                  {expandida === c.id ? 'Ocultar descripción' : 'Leer la descripción completa'}
                </button>
                {expandida === c.id && (
                  <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                    {c.description}
                  </p>
                )}
              </div>
            )}

            {errores[c.id] && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{errores[c.id]}</div>}
            {resuelta && <div className="ds-alert-success" style={{ marginTop: '12px' }}>{resuelta}</div>}

            {rechazando === c.id ? (
              <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                <label className="ds-label" htmlFor={`motivo-${c.id}`}>Motivo del rechazo</label>
                <textarea id={`motivo-${c.id}`} className="ds-textarea" style={{ minHeight: '72px' }}
                  value={motivo} onChange={e => setMotivo(e.target.value)}
                  placeholder="Qué debe corregir el organizador antes de volver a enviarla." />
                <p className="ds-form-hint">Lo verá el organizador junto a su convocatoria.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button type="button" className="ds-btn-danger"
                    disabled={enCurso || motivo.trim().length === 0}
                    onClick={() => resolver(c.id, 'rechazado', motivo.trim())}>
                    {enCurso ? 'Rechazando…' : 'Confirmar rechazo'}
                  </button>
                  <button type="button" className="ds-btn-secondary" disabled={enCurso}
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                    onClick={() => { setRechazando(null); setMotivo('') }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="ds-btn-primary" disabled={enCurso || Boolean(resuelta)}
                  style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => resolver(c.id, 'publicado')}>
                  {enCurso ? '…' : 'Aprobar y publicar'}
                </button>

                <button type="button" className="ds-btn-secondary" disabled={enCurso || Boolean(resuelta)}
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => { setRechazando(c.id); setMotivo('') }}>
                  Rechazar
                </button>

                <Link href={`/convocatoria/${c.id}`} className="table-link" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                  Ver ficha
                </Link>
              </div>
            )}

          </article>
        )
      })}
    </div>
  )
}

function traducir(mensaje: string): string {
  if (mensaje.includes('convocatorias publicadas por mes natural')) {
    return `No se puede aprobar: ${mensaje}`
  }
  if (mensaje.includes('requiere plan Destacado o Empresa')) return mensaje
  if (mensaje.includes('row-level security')) {
    return 'Tu cuenta no tiene permiso de moderación sobre esta convocatoria.'
  }
  return mensaje
}
