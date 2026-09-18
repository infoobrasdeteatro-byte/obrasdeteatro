'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EstadoPill from '@/components/shared/EstadoPill'

export type ReportePendiente = {
  id: string
  castingId: string
  motivo: string
  creadoEn: string | null
  reportante: string | null
  castingTitulo: string
  castingEstado: string
  organizador: string | null
}

function fechaHora(valor: string | null): string {
  if (!valor) return '—'
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ColaReportes({ reportes }: { reportes: ReportePendiente[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [motivos, setMotivos] = useState<Record<string, string>>({})
  const [rechazando, setRechazando] = useState<string | null>(null)

  /** Marca el reporte como resuelto. No toca el casting. */
  const marcarRevisado = async (id: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return supabase
      .from('casting_reportes')
      .update({ estado: 'revisado', revisado_por: user?.id ?? null, revisado_en: new Date().toISOString() })
      .eq('id', id)
      .select('estado')
      .single()
  }

  const descartar = async (id: string) => {
    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })

    const { data, error } = await marcarRevisado(id)
    setOcupado(null)

    if (error || !data) {
      setErrores(p => ({ ...p, [id]: error?.message ?? 'No se pudo actualizar el reporte.' }))
      return
    }
    router.refresh()
  }

  /**
   * Resuelve el reporte Y rechaza el casting. Son dos escrituras, y el orden
   * importa: primero el casting -- que es la que puede fallar, porque pasa por
   * el guard del trigger -- y solo si sale bien se marca el reporte. Al reves
   * podria quedar un reporte cerrado sobre un casting que sigue publicado.
   */
  const rechazarCasting = async (id: string, castingId: string) => {
    const motivo = motivos[id]?.trim()
    if (!motivo) {
      setErrores(p => ({ ...p, [id]: 'Escribe el motivo del rechazo: lo verá el organizador.' }))
      return
    }

    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })

    const supabase = createClient()
    const { data: casting, error: errorCasting } = await supabase
      .from('castings')
      .update({ estado: 'rechazado', motivo_rechazo: motivo })
      .eq('id', castingId)
      .select('estado')
      .single()

    if (errorCasting || !casting) {
      setOcupado(null)
      setErrores(p => ({ ...p, [id]: errorCasting?.message ?? 'No se pudo rechazar el casting.' }))
      return
    }

    const { error: errorReporte } = await marcarRevisado(id)
    setOcupado(null)

    if (errorReporte) {
      setErrores(p => ({
        ...p,
        [id]: `El casting quedó en ${casting.estado}, pero el reporte no se pudo marcar como revisado: ${errorReporte.message}`,
      }))
      return
    }

    setRechazando(null)
    router.refresh()
  }

  if (reportes.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>
          No hay reportes pendientes de revisión
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {reportes.map(r => {
        const enCurso = ocupado === r.id
        const publicado = r.castingEstado === 'publicado'

        return (
          <article key={r.id} className="account-card">

            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  {publicado ? (
                    <Link href={`/castings/${r.castingId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {r.castingTitulo}
                    </Link>
                  ) : (
                    r.castingTitulo
                  )}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>
                  Organiza: {r.organizador ?? 'sin identificar'}
                </p>
              </div>
              <EstadoPill estado={r.castingEstado} />
            </header>

            <div className="ds-status-banner ds-status-banner--draft" style={{ marginTop: '14px' }}>
              <div>
                <div className="ds-status-title">{r.motivo}</div>
                <div className="ds-status-hint">
                  Reportado por {r.reportante ?? 'un usuario'} · {fechaHora(r.creadoEn)}
                </div>
              </div>
            </div>

            {!publicado && (
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '10px' }}>
                Este casting ya no está publicado. El reporte sigue abierto y hay que resolverlo igualmente.
              </p>
            )}

            {errores[r.id] && <div className="ds-alert-error" style={{ marginTop: '14px' }}>{errores[r.id]}</div>}

            {rechazando === r.id ? (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <label className="ds-label" htmlFor={`motivo-${r.id}`}>Motivo del rechazo</label>
                <textarea id={`motivo-${r.id}`} className="ds-textarea" rows={2} maxLength={2000}
                  placeholder="Lo verá el organizador junto a su casting."
                  value={motivos[r.id] ?? ''}
                  onChange={e => setMotivos(p => ({ ...p, [r.id]: e.target.value }))} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button type="button" className="ds-btn-danger" disabled={enCurso}
                    onClick={() => rechazarCasting(r.id, r.castingId)}>
                    {enCurso ? 'Rechazando…' : 'Confirmar rechazo'}
                  </button>
                  <button type="button" className="ds-btn-secondary" disabled={enCurso}
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                    onClick={() => setRechazando(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="ds-btn-secondary" disabled={enCurso}
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => descartar(r.id)}>
                  {enCurso ? 'Guardando…' : 'Descartar reporte'}
                </button>
                <button type="button" className="table-link table-link--danger" disabled={enCurso}
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setRechazando(r.id); setMotivos(p => ({ ...p, [r.id]: p[r.id] ?? '' })) }}>
                  Rechazar casting
                </button>
              </div>
            )}

          </article>
        )
      })}
    </div>
  )
}
