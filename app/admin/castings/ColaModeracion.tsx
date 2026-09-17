'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type CastingPendiente = {
  id: string
  titulo: string
  nombreProyecto: string
  entidadOrganizadora: string
  descripcion: string
  sinopsis: string | null
  fechaApertura: string
  fechaCierre: string
  creadoEn: string
  /** Por qué lo retuvo el filtro automático. null = no lo retuvo el filtro. */
  motivoFiltro: string | null
  organizadorNombre: string | null
  organizadorTipo: string | null
}

const LIMITE_RESUMEN = 240

function formatearFecha(valor: string): string {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function IconoAprobar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconoAviso() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconoRechazar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function ColaModeracion({ pendientes }: { pendientes: CastingPendiente[] }) {
  const router = useRouter()
  const [expandido, setExpandido] = useState<string | null>(null)
  const [rechazando, setRechazando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [resueltos, setResueltos] = useState<Record<string, string>>({})

  /**
   * Escribe el nuevo estado con la sesión del usuario (cliente de navegador,
   * clave anónima): la petición viaja con su JWT, así que la RLS y el guard
   * del trigger deciden de verdad. El `.select()` posterior devuelve la fila
   * YA pasada por el trigger, que es lo que se muestra como resultado: si el
   * servidor hubiera corregido el estado, se vería aquí en vez de asumirse.
   */
  const resolver = async (id: string, estado: 'publicado' | 'rechazado', motivoRechazo?: string) => {
    setOcupado(id)
    setErrores(previos => {
      const siguiente = { ...previos }
      delete siguiente[id]
      return siguiente
    })

    const supabase = createClient()
    const cambios =
      estado === 'rechazado'
        ? { estado, motivo_rechazo: motivoRechazo ?? null }
        : { estado }

    const { data, error } = await supabase
      .from('castings')
      .update(cambios)
      .eq('id', id)
      .select('estado, publicado')
      .single()

    setOcupado(null)

    if (error) {
      setErrores(previos => ({ ...previos, [id]: error.message }))
      return
    }

    if (!data) {
      setErrores(previos => ({
        ...previos,
        [id]: 'La actualización no devolvió ninguna fila: la RLS no permitió escribir en este casting.',
      }))
      return
    }

    setRechazando(null)
    setMotivo('')
    setResueltos(previos => ({ ...previos, [id]: data.estado }))
    router.refresh()
  }

  if (pendientes.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>
          No hay castings pendientes de revisión
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {pendientes.map(casting => {
        const resumen = casting.sinopsis ?? casting.descripcion
        const necesitaCorte = resumen.length > LIMITE_RESUMEN
        const abierto = expandido === casting.id
        const textoVisible = !necesitaCorte || abierto ? resumen : `${resumen.slice(0, LIMITE_RESUMEN).trimEnd()}…`
        const enCurso = ocupado === casting.id
        const resultado = resueltos[casting.id]

        return (
          <article key={casting.id} className="account-card">

            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  {casting.titulo}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {casting.nombreProyecto} · {casting.entidadOrganizadora}
                </p>
              </div>
              <span className="status-pill status-pill--draft" style={{ flexShrink: 0 }}>
                Pendiente
              </span>
            </header>

            {/* Solo cuando lo retuvo el filtro automático. Un casting puede
                estar en la cola por otras razones, y entonces aquí no va nada. */}
            {casting.motivoFiltro && (
              <div className="ds-status-banner ds-status-banner--draft" style={{ marginTop: '16px' }}>
                <div>
                  <div className="ds-status-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconoAviso />
                    {casting.motivoFiltro}
                  </div>
                  <div className="ds-status-hint">Retenido por el filtro automático antes de publicarse.</div>
                </div>
              </div>
            )}

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', margin: '16px 0' }}>
              <div>
                <dt className="obras-stat-label">Organizador</dt>
                <dd style={{ fontSize: '13px', color: casting.organizadorNombre ? 'var(--text)' : 'var(--muted)' }}>
                  {casting.organizadorNombre ?? 'Sin identificar'}
                </dd>
              </div>
              <div>
                <dt className="obras-stat-label">Tipo de perfil</dt>
                <dd style={{ fontSize: '13px', color: casting.organizadorTipo ? 'var(--text)' : 'var(--muted)' }}>
                  {casting.organizadorTipo ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="obras-stat-label">Casting</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {formatearFecha(casting.fechaApertura)} – {formatearFecha(casting.fechaCierre)}
                </dd>
              </div>
              <div>
                <dt className="obras-stat-label">En cola desde</dt>
                <dd style={{ fontSize: '13px', color: 'var(--muted)' }}>{formatearFecha(casting.creadoEn)}</dd>
              </div>
            </dl>

            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {textoVisible}
            </p>
            {necesitaCorte && (
              <button
                type="button"
                onClick={() => setExpandido(abierto ? null : casting.id)}
                className="table-link"
                style={{ marginTop: '6px', padding: 0 }}
              >
                {abierto ? 'Ver menos' : 'Ver más'}
              </button>
            )}

            {errores[casting.id] && (
              <div className="ds-alert-error" style={{ marginTop: '16px' }}>
                {errores[casting.id]}
              </div>
            )}

            {resultado && (
              <div className="ds-alert-success" style={{ marginTop: '16px' }}>
                El servidor dejó este casting en <strong>{resultado}</strong>.
              </div>
            )}

            {rechazando === casting.id ? (
              <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                <label className="ds-label" htmlFor={`motivo-${casting.id}`}>
                  Motivo del rechazo
                </label>
                <textarea
                  id={`motivo-${casting.id}`}
                  className="ds-textarea"
                  style={{ minHeight: '72px' }}
                  value={motivo}
                  onChange={event => setMotivo(event.target.value)}
                  placeholder="Qué debe corregir el organizador antes de volver a enviarlo."
                />
                <p className="ds-form-hint">Lo verá el organizador junto a su casting.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="ds-btn-danger"
                    disabled={enCurso || motivo.trim().length === 0}
                    onClick={() => resolver(casting.id, 'rechazado', motivo.trim())}
                  >
                    {enCurso ? 'Rechazando…' : 'Confirmar rechazo'}
                  </button>
                  <button
                    type="button"
                    className="ds-btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                    disabled={enCurso}
                    onClick={() => {
                      setRechazando(null)
                      setMotivo('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="ds-btn-primary"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}
                  disabled={enCurso}
                  onClick={() => resolver(casting.id, 'publicado')}
                >
                  <IconoAprobar />
                  {enCurso ? 'Aprobando…' : 'Aprobar'}
                </button>
                <button
                  type="button"
                  className="ds-btn-secondary"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                  disabled={enCurso}
                  onClick={() => {
                    setRechazando(casting.id)
                    setMotivo('')
                  }}
                >
                  <IconoRechazar />
                  Rechazar
                </button>
              </div>
            )}

          </article>
        )
      })}
    </div>
  )
}
