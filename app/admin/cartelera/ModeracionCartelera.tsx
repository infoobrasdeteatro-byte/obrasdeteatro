'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  etiquetaEstado, etiquetaGenero, etiquetaRol, etiquetaTipoOpcion, fechaFuncion, precioTexto, mensajeErrorCartelera,
} from '@/lib/cartelera/cartelera'

export type EspectaculoAdmin = {
  id: string
  slug: string
  titulo: string
  compania_nombre: string
  genero_id: string
  sinopsis: string | null
  duracion_min: number | null
  edad_minima: number | null
  estado: string
  motivo_filtro: string | null
  motivo_rechazo: string | null
  updated_at: string
  publicado_at: string | null
  cartel_url: string | null
  funciones: { id: string; inicio: string; zona_horaria: string; lugar_nombre: string | null; ciudad: string | null; pais_code: string | null; estado: string }[]
  opciones: { id: string; tipo: string; proveedor: string; url: string | null; precio_desde: number | null; moneda: string | null }[]
  equipo: { id: string; nombre: string; rol: string; personaje: string | null }[]
  persona: { nombre: string; slug: string | null; email: string; verificado: boolean; plan: string } | null
}

const PESTANAS = [
  { id: 'revision', label: 'En revisión', estados: ['pendiente_revision'] },
  { id: 'publicados', label: 'Publicados', estados: ['publicado'] },
  { id: 'otros', label: 'Finalizados y cancelados', estados: ['finalizado', 'cancelado'] },
  { id: 'rechazados', label: 'Rechazados y retirados', estados: ['rechazado', 'retirado'] },
] as const

const ESTILO_ESTADO: Record<string, React.CSSProperties> = {
  pendiente_revision: { background: '#fef3c7', color: '#92400e' },
  rechazado: { background: 'var(--red-light)', color: 'var(--red-h)' },
  retirado: { background: 'var(--red-light)', color: 'var(--red-h)' },
}

const LIMITE = 320

export default function ModeracionCartelera({ inicial }: { inicial: EspectaculoAdmin[] }) {
  const router = useRouter()
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]['id']>('revision')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [conMotivo, setConMotivo] = useState<{ id: string; accion: 'rechazado' | 'retirado' } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const cuenta = (estados: readonly string[]) => inicial.filter(e => estados.includes(e.estado)).length
  const actual = PESTANAS.find(p => p.id === pestana)!
  const lista = inicial.filter(e => (actual.estados as readonly string[]).includes(e.estado))

  /** Escribe con la sesión del moderador: la RLS y el trigger deciden de verdad. */
  const resolver = async (id: string, estado: 'publicado' | 'rechazado' | 'retirado', texto?: string) => {
    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })
    const cambios = estado === 'publicado'
      ? { estado, motivo_rechazo: null, motivo_filtro: null }
      : { estado, motivo_rechazo: texto?.trim() || null }
    const { data, error } = await createClient().from('espectaculos').update(cambios).eq('id', id).select('estado').single()
    setOcupado(null)
    if (error || !data) { setErrores(p => ({ ...p, [id]: mensajeErrorCartelera(error?.message ?? 'La base no devolvió la fila (RLS).') })); return }
    setConMotivo(null)
    setMotivo('')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div role="tablist" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {PESTANAS.map(p => (
          <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id}
            className={pestana === p.id ? 'ds-btn-primary' : 'ds-btn-secondary'}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={() => setPestana(p.id)}>
            {p.label} ({cuenta(p.estados)})
          </button>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>
          {pestana === 'revision' ? 'No hay espectáculos pendientes de revisión' : 'Nada por aquí'}
        </p></div>
      )}

      {lista.map(e => {
        const verMas = abierto === e.id
        const sinopsis = e.sinopsis ?? ''
        const enCurso = ocupado === e.id
        const pidiendoMotivo = conMotivo?.id === e.id
        const ahora = Date.now()
        const futuras = e.funciones.filter(f => f.estado !== 'cancelada' && new Date(f.inicio).getTime() > ahora)
        return (
          <article key={e.id} className="account-card" style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '110px', aspectRatio: '2 / 3', borderRadius: '6px', overflow: 'hidden', background: 'var(--subtle)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {e.cartel_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <a href={e.cartel_url} target="_blank" rel="noreferrer"><img src={e.cartel_url} alt={`Cartel de ${e.titulo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></a>
                : <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Sin cartel</span>}
            </div>

            <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', lineHeight: 1.25 }}>{e.titulo}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                    {e.compania_nombre} · {etiquetaGenero(e.genero_id)}
                    {e.duracion_min ? ` · ${e.duracion_min} min` : ''}{e.edad_minima != null ? ` · +${e.edad_minima}` : ''}
                  </p>
                  {e.persona && (
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      Publica:{' '}
                      {e.persona.slug ? <Link href={`/perfil/${e.persona.slug}`} className="table-link" target="_blank">{e.persona.nombre}</Link> : e.persona.nombre}
                      {' · '}{e.persona.email} · plan {e.persona.plan}{e.persona.verificado ? ' · verificado' : ' · sin verificar'}
                    </p>
                  )}
                </div>
                <span className="status-pill" style={ESTILO_ESTADO[e.estado] ?? { background: 'var(--subtle)', color: 'var(--text)' }}>
                  {etiquetaEstado(e.estado)}
                </span>
              </header>

              {e.motivo_filtro && e.estado === 'pendiente_revision' && (
                <div className="ds-alert-error" style={{ fontSize: '13px' }}>Retenido por el filtro automático: {e.motivo_filtro}</div>
              )}
              {e.motivo_rechazo && (e.estado === 'rechazado' || e.estado === 'retirado') && (
                <p style={{ fontSize: '13px', color: 'var(--red-h)' }}>Motivo: {e.motivo_rechazo}</p>
              )}

              {sinopsis && (
                <p style={{ fontSize: '14px', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                  {verMas || sinopsis.length <= LIMITE ? sinopsis : `${sinopsis.slice(0, LIMITE).trimEnd()}…`}
                  {sinopsis.length > LIMITE && (
                    <button type="button" className="table-link" style={{ marginLeft: '6px' }} onClick={() => setAbierto(verMas ? null : e.id)}>
                      {verMas ? 'Ver menos' : 'Ver todo'}
                    </button>
                  )}
                </p>
              )}

              <div style={{ fontSize: '13px' }}>
                <strong>Funciones ({e.funciones.length}, {futuras.length} por delante)</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px', color: 'var(--text)' }}>
                  {e.funciones.slice(0, 6).map(f => (
                    <li key={f.id} style={{ textTransform: 'none' }}>
                      {fechaFuncion(f.inicio, f.zona_horaria)} · {f.lugar_nombre}, {f.ciudad} ({f.pais_code}){f.estado !== 'programada' ? ` · ${f.estado}` : ''}
                    </li>
                  ))}
                  {e.funciones.length > 6 && <li>… y {e.funciones.length - 6} más</li>}
                  {e.funciones.length === 0 && <li style={{ color: 'var(--muted)' }}>Sin funciones</li>}
                </ul>
              </div>

              <div style={{ fontSize: '13px' }}>
                <strong>Entradas</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                  {e.opciones.map(o => (
                    <li key={o.id} style={{ overflowWrap: 'anywhere' }}>
                      {etiquetaTipoOpcion(o.tipo)}{precioTexto(o.precio_desde, o.moneda, o.tipo) ? ` · ${precioTexto(o.precio_desde, o.moneda, o.tipo)}` : ''}
                      {o.url && <> · <a href={o.url} target="_blank" rel="noreferrer nofollow" className="table-link">{o.url}</a> ({o.proveedor})</>}
                    </li>
                  ))}
                  {e.opciones.length === 0 && <li style={{ color: 'var(--muted)' }}>Sin opciones de entradas</li>}
                </ul>
              </div>

              {e.equipo.length > 0 && (
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {e.equipo.slice(0, 8).map(p => `${etiquetaRol(p.rol)}: ${p.nombre}${p.personaje ? ` (${p.personaje})` : ''}`).join(' · ')}
                  {e.equipo.length > 8 ? ' …' : ''}
                </p>
              )}

              {errores[e.id] && <div className="ds-alert-error">{errores[e.id]}</div>}

              {pidiendoMotivo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <label className="ds-label" htmlFor={`motivo-${e.id}`}>
                    {conMotivo!.accion === 'rechazado' ? 'Motivo del rechazo (lo ve quien lo publicó)' : 'Motivo de la retirada (lo ve quien lo publicó)'}
                  </label>
                  <textarea id={`motivo-${e.id}`} className="ds-textarea" rows={2} maxLength={500} value={motivo}
                    onChange={ev => setMotivo(ev.target.value)} placeholder="Por ejemplo: falta el cartel, el enlace de entradas no funciona…" />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="ds-btn-primary" disabled={enCurso || motivo.trim().length < 3}
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', background: 'var(--red-h)' }}
                      onClick={() => resolver(e.id, conMotivo!.accion, motivo)}>
                      {enCurso ? '…' : conMotivo!.accion === 'rechazado' ? 'Confirmar rechazo' : 'Confirmar retirada'}
                    </button>
                    <button type="button" className="table-link" onClick={() => { setConMotivo(null); setMotivo('') }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  {['pendiente_revision', 'rechazado', 'retirado'].includes(e.estado) && (
                    <button type="button" className="ds-btn-primary" disabled={enCurso}
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={() => resolver(e.id, 'publicado')}>
                      {enCurso ? '…' : e.estado === 'pendiente_revision' ? '✓ Aprobar y publicar' : 'Restaurar y publicar'}
                    </button>
                  )}
                  {e.estado === 'pendiente_revision' && (
                    <button type="button" className="ds-btn-secondary" disabled={enCurso} style={{ padding: '8px 16px', fontSize: '13px' }}
                      onClick={() => { setConMotivo({ id: e.id, accion: 'rechazado' }); setMotivo('') }}>
                      Rechazar
                    </button>
                  )}
                  {e.estado !== 'retirado' && (
                    <button type="button" className="table-link table-link--danger" disabled={enCurso} style={{ marginLeft: 'auto' }}
                      onClick={() => { setConMotivo({ id: e.id, accion: 'retirado' }); setMotivo('') }}>
                      Retirar
                    </button>
                  )}
                </div>
              )}
              {e.estado === 'pendiente_revision' && futuras.length === 0 && (
                <p className="ds-form-hint">Ojo: no tiene funciones por delante; si lo apruebas pasará a «Finalizado» esta noche.</p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
