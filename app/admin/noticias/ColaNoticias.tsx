'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fecha, fechaHora } from '@/components/shared/formato'
import { enlaceSeguro } from '@/lib/noticias/presentacion'
import EditarCandidata from './EditarCandidata'
import type { CategoriaOpcion } from './edicion'

export type NoticiaPanel = {
  id: string
  titular: string
  resumen: string
  categoria: string
  categoriaId: string
  pais: string
  paisCode: string
  fuente: string
  fuenteActiva: boolean
  urlOriginal: string
  fechaOriginal: string | null
  creadaEn: string
  publicadaEn: string | null
  origen: string
  lote: string | null
}

type Accion = 'publicar' | 'descartar' | 'retirar'

/**
 * Cola de candidatas (Editar / Publicar / Descartar) y lista de publicadas
 * (Retirar). Las publicadas no se editan: se retiran.
 *
 * Escribe con la sesión del moderador (cliente de navegador): la política
 * «Moderación gestiona noticias» y el trigger noticias_guarda() deciden de
 * verdad. Si el trigger rechaza (límite diario, fuente inactiva, transición no
 * permitida) se muestra su mensaje tal cual: ya está redactado para leerse.
 */
export default function ColaNoticias({
  modo,
  noticias,
  categorias = [],
}: {
  modo: 'candidatas' | 'publicadas'
  noticias: NoticiaPanel[]
  /** Para el modo «Editar» de las candidatas. */
  categorias?: CategoriaOpcion[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<Record<string, string>>({})
  const [conMotivo, setConMotivo] = useState<{ id: string; accion: 'descartar' | 'retirar' } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [resueltas, setResueltas] = useState<Record<string, string>>({})

  const ejecutar = async (id: string, accion: Accion, motivoTexto?: string) => {
    setOcupada(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })

    const cambios =
      accion === 'publicar' ? { estado: 'publicada' }
      : accion === 'descartar' ? { estado: 'descartada', motivo_descarte: motivoTexto ?? null }
      : { estado: 'retirada', motivo_retirada: motivoTexto ?? null }

    const { data, error } = await createClient()
      .from('noticias')
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

    setConMotivo(null)
    setMotivo('')
    setResueltas(p => ({
      ...p,
      [id]: data.estado === 'publicada' ? 'Publicada. Ya aparece en /noticias.'
        : data.estado === 'descartada' ? 'Descartada.'
        : data.estado === 'retirada' ? 'Retirada de la sección pública.'
        : `Quedó en ${data.estado}.`,
    }))
    router.refresh()
  }

  if (noticias.length === 0) {
    return (
      <div className="obras-empty" style={{ padding: '32px 24px' }}>
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>
          {modo === 'candidatas' ? 'No hay candidatas esperando revisión.' : 'Todavía no hay noticias publicadas.'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {noticias.map(n => {
        const enCurso = ocupada === n.id
        const resuelta = resueltas[n.id]
        const enlace = enlaceSeguro(n.urlOriginal)
        const pidiendoMotivo = conMotivo?.id === n.id

        return (
          <article key={n.id} className="account-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>{n.categoria}</span>
              <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--text)' }}>{n.pais}</span>
              <span className="status-pill" style={{ background: 'var(--subtle)', color: 'var(--muted)' }}>
                {n.origen === 'manual' ? 'Alta manual' : 'Importada'}
              </span>
              {modo === 'candidatas' && !n.fuenteActiva && (
                <span className="status-pill" style={{ background: 'var(--red-light)', color: 'var(--red-h)' }}>
                  Fuente sin permiso: no se puede publicar
                </span>
              )}
            </div>

            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
              {n.titular}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, marginTop: '8px' }}>{n.resumen}</p>

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '14px' }}>
              <div>
                <dt className="obras-stat-label">Fuente</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{n.fuente}</dd>
              </div>
              <div>
                <dt className="obras-stat-label">Fecha original</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>{fecha(n.fechaOriginal)}</dd>
              </div>
              <div>
                <dt className="obras-stat-label">{modo === 'candidatas' ? 'Entró en cola' : 'Publicada'}</dt>
                <dd style={{ fontSize: '13px', color: 'var(--text)' }}>
                  {fechaHora(modo === 'candidatas' ? n.creadaEn : n.publicadaEn)}
                </dd>
              </div>
              {n.lote && (
                <div>
                  <dt className="obras-stat-label">Lote</dt>
                  <dd style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{n.lote}</dd>
                </div>
              )}
            </dl>

            {errores[n.id] && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{errores[n.id]}</div>}
            {resuelta && <div className="ds-alert-success" style={{ marginTop: '12px' }}>{resuelta}</div>}
            {!resuelta && avisos[n.id] && <div className="ds-alert-success" style={{ marginTop: '12px' }}>{avisos[n.id]}</div>}

            {modo === 'candidatas' && editando === n.id ? (
              <EditarCandidata
                id={n.id}
                inicial={{ titular: n.titular, resumen: n.resumen, categoria_id: n.categoriaId, pais_code: n.paisCode }}
                categorias={categorias}
                onCancelar={() => setEditando(null)}
                onGuardada={() => {
                  setEditando(null)
                  setAvisos(p => ({ ...p, [n.id]: 'Cambios guardados. Sigue como candidata.' }))
                  router.refresh()
                }}
              />
            ) : pidiendoMotivo ? (
              <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                <label className="ds-label" htmlFor={`motivo-${n.id}`}>
                  {conMotivo.accion === 'descartar' ? 'Motivo del descarte' : 'Motivo de la retirada'}
                </label>
                <textarea id={`motivo-${n.id}`} className="ds-textarea" style={{ minHeight: '72px' }} maxLength={500}
                  value={motivo} onChange={e => setMotivo(e.target.value)}
                  placeholder={conMotivo.accion === 'descartar'
                    ? 'Fuera de ámbito, repetida, poco relevante…'
                    : 'Solicitud de retirada del medio, error en el resumen…'} />
                <p className="ds-form-hint">Queda en el registro de noticias. No se muestra al público.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button type="button" className="ds-btn-danger"
                    disabled={enCurso || motivo.trim().length === 0}
                    onClick={() => ejecutar(n.id, conMotivo.accion, motivo.trim())}>
                    {enCurso ? '…' : conMotivo.accion === 'descartar' ? 'Confirmar descarte' : 'Confirmar retirada'}
                  </button>
                  <button type="button" className="ds-btn-secondary" disabled={enCurso}
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                    onClick={() => { setConMotivo(null); setMotivo('') }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                {modo === 'candidatas' ? (
                  <>
                    <button type="button" className="ds-btn-primary" disabled={enCurso || Boolean(resuelta)}
                      style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
                      onClick={() => ejecutar(n.id, 'publicar')}>
                      {enCurso ? '…' : 'Publicar'}
                    </button>
                    <button type="button" className="ds-btn-secondary" disabled={enCurso || Boolean(resuelta)}
                      style={{ padding: '9px 18px', fontSize: '13px' }}
                      onClick={() => { setEditando(n.id); setConMotivo(null) }}>
                      Editar
                    </button>
                    <button type="button" className="ds-btn-secondary" disabled={enCurso || Boolean(resuelta)}
                      style={{ padding: '9px 18px', fontSize: '13px' }}
                      onClick={() => { setConMotivo({ id: n.id, accion: 'descartar' }); setMotivo(''); setEditando(null) }}>
                      Descartar
                    </button>
                  </>
                ) : (
                  <button type="button" className="ds-btn-secondary" disabled={enCurso || Boolean(resuelta)}
                    style={{ padding: '9px 18px', fontSize: '13px' }}
                    onClick={() => { setConMotivo({ id: n.id, accion: 'retirar' }); setMotivo('') }}>
                    Retirar
                  </button>
                )}

                {enlace && (
                  <a href={enlace} target="_blank" rel="noopener noreferrer nofollow"
                    className="table-link" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    Ver la original ↗
                  </a>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

/** Los mensajes del trigger ya están en castellano: pasan tal cual. */
function traducir(mensaje: string): string {
  if (mensaje.includes('row-level security')) {
    return 'Tu cuenta no tiene permiso de moderación sobre esta noticia.'
  }
  return mensaje
}
