'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { etiquetaTipo, etiquetaEstado, fechasFormacion, lugarFormacion, mensajeErrorFormacion } from '@/lib/formacion/formacion'

export type FormacionPropia = {
  id: string
  slug: string
  titulo: string
  tipo: string
  modalidad: string
  ciudad: string | null
  pais_code: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: string
  motivo_retirada: string | null
  created_at: string
}

const ESTILO_ESTADO: Record<string, { clase: string; estilo?: React.CSSProperties }> = {
  publicado: { clase: 'status-pill status-pill--published' },
  borrador: { clase: 'status-pill', estilo: { background: 'var(--subtle)', color: 'var(--muted)' } },
  finalizado: { clase: 'status-pill', estilo: { background: 'var(--subtle)', color: 'var(--text)' } },
  cancelado: { clase: 'status-pill', estilo: { background: 'var(--subtle)', color: 'var(--muted)' } },
  retirado: { clase: 'status-pill', estilo: { background: 'var(--red-light)', color: 'var(--red-h)' } },
}

export function PildoraEstado({ estado }: { estado: string }) {
  const e = ESTILO_ESTADO[estado] ?? ESTILO_ESTADO.borrador
  return <span className={e.clase} style={e.estilo}>{etiquetaEstado(estado)}</span>
}

export default function MisFormacionesList({ formaciones, puedeCrear }: { formaciones: FormacionPropia[]; puedeCrear: boolean }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  /** Cambia el estado y enseña lo que la base respondió. */
  const cambiar = async (id: string, cambio: { estado: string } | 'borrar') => {
    if (cambio === 'borrar' && !confirm('¿Borrar esta formación? No se puede deshacer.')) return
    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })
    const supabase = createClient()
    const { error } = cambio === 'borrar'
      ? await supabase.from('formaciones').delete().eq('id', id)
      : await supabase.from('formaciones').update(cambio).eq('id', id)
    setOcupado(null)
    if (error) { setErrores(p => ({ ...p, [id]: mensajeErrorFormacion(error.message) })); return }
    router.refresh()
  }

  if (formaciones.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text">Todavía no has publicado ninguna formación</p>
        {puedeCrear && (
          <Link href="/mis-formaciones/nueva" className="ds-btn-primary"
            style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
            Publicar la primera
          </Link>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {formaciones.map(f => {
        const enCurso = ocupado === f.id
        const fechas = fechasFormacion(f)
        return (
          <article key={f.id} className="account-card">
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  {f.titulo}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {etiquetaTipo(f.tipo)} · {lugarFormacion(f)}{fechas && ` · ${fechas}`}
                </p>
              </div>
              <PildoraEstado estado={f.estado} />
            </header>

            {f.estado === 'retirado' && (
              <div className="ds-status-banner ds-status-banner--draft" style={{ marginTop: '14px' }}>
                <div>
                  <div className="ds-status-title">El equipo de ObrasDeTeatro ha retirado esta formación</div>
                  <div className="ds-status-hint">
                    {f.motivo_retirada ? `Motivo: ${f.motivo_retirada}. ` : ''}
                    Si crees que es un error, escríbenos a hola@obrasdeteatro.com.
                  </div>
                </div>
              </div>
            )}

            {errores[f.id] && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{errores[f.id]}</div>}

            {f.estado !== 'retirado' && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <Link href={`/mis-formaciones/${f.id}/editar`} className="ds-btn-secondary" style={{ padding: '9px 18px', fontSize: '13px' }}>
                  Editar
                </Link>
                {f.estado === 'publicado' && (
                  <Link href={`/formacion/${f.slug}`} className="table-link" style={{ alignSelf: 'center' }}>Ver ficha pública</Link>
                )}
                {(f.estado === 'borrador' || f.estado === 'cancelado') && (
                  <button type="button" className="ds-btn-primary" disabled={enCurso}
                    style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
                    onClick={() => cambiar(f.id, { estado: 'publicado' })}>
                    {enCurso ? 'Publicando…' : 'Publicar'}
                  </button>
                )}
                {f.estado === 'publicado' && (
                  <button type="button" className="ds-btn-secondary" disabled={enCurso}
                    style={{ padding: '9px 18px', fontSize: '13px' }}
                    onClick={() => cambiar(f.id, { estado: 'cancelado' })}>
                    {enCurso ? '…' : 'Cancelar formación'}
                  </button>
                )}
                <button type="button" className="table-link table-link--danger" disabled={enCurso}
                  style={{ marginLeft: 'auto' }} onClick={() => cambiar(f.id, 'borrar')}>
                  Borrar
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
