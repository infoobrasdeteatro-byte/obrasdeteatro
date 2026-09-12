'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type ActorInfo = {
  fotoPrincipal: string | null
  biografia: string | null
  experiencia: string | null
  formacion: string | null
  idiomas: string[] | null
  otrasHabilidades: string | null
  habilidades: string[]
  disponibilidad: string[]
  email: string | null
  telefono: string | null
  whatsapp: string | null
  redes: { red: string; valor: string }[]
}

export type PostulacionRecibida = {
  id: string
  castingId: string
  castingTitulo: string
  status: string
  appliedAt: string | null
  coverLetter: string | null
  portfolioUrl: string | null
  notes: string | null
  nombre: string | null
  slug: string | null
  actor: ActorInfo | null
}

const ESTADOS: Record<string, { etiqueta: string; clase: string; estilo?: React.CSSProperties }> = {
  pending:  { etiqueta: 'Pendiente',    clase: 'status-pill status-pill--draft' },
  reviewed: { etiqueta: 'Revisada',     clase: 'status-pill', estilo: { background: 'var(--subtle)', color: 'var(--text)' } },
  selected: { etiqueta: 'Seleccionada', clase: 'status-pill status-pill--published' },
  rejected: { etiqueta: 'Descartada',   clase: 'status-pill', estilo: { background: 'var(--red-light)', color: 'var(--red-h)' } },
}

function fechaHora(valor: string | null): string {
  if (!valor) return '—'
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BandejaList({ postulaciones }: { postulaciones: PostulacionRecibida[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState<Record<string, string>>({})

  const cambiar = async (id: string, status: string) => {
    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('casting_applications')
      .update({
        status,
        notes: notas[id]?.trim() ? notas[id].trim() : undefined,
        reviewer_id: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('status')
      .single()

    setOcupado(null)

    if (error || !data) {
      setErrores(p => ({ ...p, [id]: error?.message ?? 'No se pudo actualizar: no tienes permiso sobre esta postulación.' }))
      return
    }

    router.refresh()
  }

  if (postulaciones.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>
          No hay postulaciones que coincidan con estos filtros.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {postulaciones.map(p => {
        const estado = ESTADOS[p.status] ?? { etiqueta: p.status, clase: 'status-pill' }
        const a = p.actor
        const sinContacto = !a || (!a.email && !a.telefono && !a.whatsapp && a.redes.length === 0)
        const enCurso = ocupado === p.id

        return (
          <article key={p.id} className="account-card">

            <header style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              {a?.fotoPrincipal ? (
                <Image src={a.fotoPrincipal} alt="" width={56} height={56}
                  style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} unoptimized />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--subtle)', flexShrink: 0 }} />
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.3px' }}>
                  {p.nombre ?? 'Postulante sin identificar'}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                  {p.castingTitulo} · {fechaHora(p.appliedAt)}
                </p>
              </div>

              <span className={estado.clase} style={{ ...estado.estilo, flexShrink: 0 }}>{estado.etiqueta}</span>
            </header>

            {p.coverLetter && (
              <div style={{ marginTop: '14px' }}>
                <span className="obras-stat-label">Mensaje</span>
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                  {p.coverLetter}
                </p>
              </div>
            )}

            {p.portfolioUrl && (
              <p style={{ marginTop: '10px', fontSize: '13px' }}>
                <span className="obras-stat-label">Portfolio</span><br />
                <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--red)', textDecoration: 'none' }}>
                  {p.portfolioUrl}
                </a>
              </p>
            )}

            {a && (
              <>
                <Campo etiqueta="Biografía" valor={a.biografia} />
                <Campo etiqueta="Experiencia" valor={a.experiencia} />
                <Campo etiqueta="Formación" valor={a.formacion} />
                <Lista etiqueta="Habilidades" valores={a.habilidades} extra={a.otrasHabilidades} />
                <Lista etiqueta="Idiomas" valores={a.idiomas ?? []} />
                <Lista etiqueta="Disponibilidad" valores={a.disponibilidad} />
              </>
            )}

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <span className="obras-stat-label">Contacto</span>
              {sinContacto ? (
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  Esta persona no ha hecho público ningún medio de contacto. Respóndele desde la
                  plataforma cuando exista la mensajería.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                  {a?.email && <li>✉ {a.email}</li>}
                  {a?.telefono && <li>☎ {a.telefono}</li>}
                  {a?.whatsapp && <li>WhatsApp: {a.whatsapp}</li>}
                  {a?.redes.map(r => (
                    <li key={r.red}>
                      {r.red}:{' '}
                      <a href={r.valor.startsWith('http') ? r.valor : `https://${r.valor}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--red)', textDecoration: 'none' }}>
                        {r.valor}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {p.notes && (
              <div style={{ marginTop: '14px' }}>
                <span className="obras-stat-label">Valoración interna</span>
                <p style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{p.notes}</p>
              </div>
            )}

            {errores[p.id] && <div className="ds-alert-error" style={{ marginTop: '14px' }}>{errores[p.id]}</div>}

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <label className="ds-label" htmlFor={`notas-${p.id}`}>Valoración interna (opcional)</label>
              <textarea id={`notas-${p.id}`} className="ds-textarea" rows={2} maxLength={2000}
                placeholder="Solo la ves tú."
                value={notas[p.id] ?? ''}
                onChange={e => setNotas(prev => ({ ...prev, [p.id]: e.target.value }))} />

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button type="button" className="ds-btn-secondary" disabled={enCurso}
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => cambiar(p.id, 'reviewed')}>
                  Marcar revisada
                </button>
                <button type="button" className="ds-btn-primary" disabled={enCurso}
                  style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => cambiar(p.id, 'selected')}>
                  Seleccionar
                </button>
                <button type="button" className="table-link table-link--danger" disabled={enCurso}
                  style={{ marginLeft: 'auto' }}
                  onClick={() => cambiar(p.id, 'rejected')}>
                  Descartar
                </button>
              </div>
            </div>

          </article>
        )
      })}
    </div>
  )
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div style={{ marginTop: '12px' }}>
      <span className="obras-stat-label">{etiqueta}</span>
      <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '4px' }}>{valor}</p>
    </div>
  )
}

function Lista({ etiqueta, valores, extra }: { etiqueta: string; valores: string[]; extra?: string | null }) {
  if (valores.length === 0 && !extra) return null
  return (
    <div style={{ marginTop: '12px' }}>
      <span className="obras-stat-label">{etiqueta}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
        {valores.map(v => (
          <span key={v} className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>{v}</span>
        ))}
        {extra && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{extra}</span>}
      </div>
    </div>
  )
}
