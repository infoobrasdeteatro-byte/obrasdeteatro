'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { etiquetaEstado, mensajeErrorCartelera } from '@/lib/cartelera/cartelera'

export type EspectaculoPropio = {
  id: string
  slug: string
  titulo: string
  compania_nombre: string
  cartel_url: string | null
  estado: string
  motivo_rechazo: string | null
  funciones: number
  proxima: string | null
  ciudades: string[]
  clics: number
}

const ESTILO: Record<string, React.CSSProperties | undefined> = {
  publicado: undefined,
  pendiente_revision: { background: '#fef3c7', color: '#92400e' },
  rechazado: { background: 'var(--red-light)', color: 'var(--red-h)' },
  retirado: { background: 'var(--red-light)', color: 'var(--red-h)' },
}

function Pildora({ estado }: { estado: string }) {
  const publicado = estado === 'publicado'
  return (
    <span className={`status-pill${publicado ? ' status-pill--published' : ''}`}
      style={ESTILO[estado] ?? (publicado ? undefined : { background: 'var(--subtle)', color: 'var(--muted)' })}>
      {etiquetaEstado(estado)}
    </span>
  )
}

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }).format(new Date(iso))

export default function MisEspectaculosList({ espectaculos }: { espectaculos: EspectaculoPropio[] }) {
  const router = useRouter()
  const [error, setError] = useState<Record<string, string>>({})

  const borrar = async (id: string) => {
    if (!confirm('¿Borrar este espectáculo con sus funciones y entradas? No se puede deshacer.')) return
    const { error: e } = await createClient().from('espectaculos').delete().eq('id', id)
    if (e) { setError(p => ({ ...p, [id]: mensajeErrorCartelera(e.message) })); return }
    router.refresh()
  }

  if (espectaculos.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text">Todavía no has publicado ningún espectáculo</p>
        <Link href="/mis-espectaculos/nuevo" className="ds-btn-primary"
          style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
          Publicar el primero
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {espectaculos.map(e => (
        <article key={e.id} className="account-card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '64px', aspectRatio: '2 / 3', borderRadius: '6px', overflow: 'hidden', background: 'var(--subtle)', flexShrink: 0 }}>
            {e.cartel_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.cartel_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>{e.titulo}</h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {e.compania_nombre} · {e.funciones} función{e.funciones === 1 ? '' : 'es'}
                  {e.proxima && ` · próxima: ${fechaCorta(e.proxima)}`}
                  {e.ciudades.length > 0 && ` · ${e.ciudades.slice(0, 3).join(', ')}`}
                  {e.clics > 0 && ` · ${e.clics} clic${e.clics === 1 ? '' : 's'} en «Entradas»`}
                </p>
              </div>
              <Pildora estado={e.estado} />
            </header>
            {e.estado === 'rechazado' && e.motivo_rechazo && (
              <div className="ds-alert-error" style={{ marginTop: '10px' }}>No aprobado: {e.motivo_rechazo}</div>
            )}
            {error[e.id] && <div className="ds-alert-error" style={{ marginTop: '10px' }}>{error[e.id]}</div>}
            {e.estado !== 'retirado' && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
                <Link href={`/mis-espectaculos/${e.id}/editar`} className="ds-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  Editar, funciones y entradas
                </Link>
                <button type="button" className="table-link table-link--danger" style={{ marginLeft: 'auto' }} onClick={() => borrar(e.id)}>
                  Borrar
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
