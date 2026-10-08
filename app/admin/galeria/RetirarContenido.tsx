'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { retirarElemento, type ElementoRetirable } from '@/lib/perfil-multimedia/retirada'

export type FilaAdmin = {
  clave: string
  elemento: ElementoRetirable
  tipoEtiqueta: string
  descripcion: string
  miniatura: string | null
  enlace: string | null
  perfilNombre: string
  perfilSlug: string | null
  creado: string
}

/** Lista de lo último subido con un botón «Retirar» por elemento. */
export default function RetirarContenido({ filas }: { filas: FilaAdmin[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; texto: string }>>({})

  const retirar = async (f: FilaAdmin) => {
    setOcupado(f.clave)
    // El cliente tipado es más estricto que la interfaz mínima que pide retirarElemento.
    const error = await retirarElemento(createClient() as unknown as Parameters<typeof retirarElemento>[0], f.elemento)
    setOcupado(null)
    setConfirmando(null)
    setMensajes(m => ({ ...m, [f.clave]: error ? { ok: false, texto: error } : { ok: true, texto: 'Retirado.' } }))
    if (!error) router.refresh()
  }

  if (filas.length === 0) {
    return <div className="obras-empty"><p className="obras-empty-text" style={{ marginBottom: 0 }}>No hay contenido subido.</p></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {filas.map(f => {
        const m = mensajes[f.clave]
        return (
          <article key={f.clave} className="account-card" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '96px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: 'var(--subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {f.miniatura
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={f.miniatura} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.tipoEtiqueta}</span>}
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.tipoEtiqueta} · {f.creado}</p>
              <p style={{ fontSize: '14px', color: 'var(--black)' }}>{f.descripcion}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {f.perfilSlug ? <a href={`/perfil/${f.perfilSlug}`} className="table-link" target="_blank" rel="noopener">{f.perfilNombre}</a> : f.perfilNombre}
                {f.enlace && <> · <a href={f.enlace} className="table-link" target="_blank" rel="noopener nofollow">ver original ↗</a></>}
              </p>
              {m && <p style={{ fontSize: '12px', color: m.ok ? '#166534' : 'var(--red)', marginTop: '4px' }}>{m.texto}</p>}
            </div>
            {!(m?.ok) && (confirmando === f.clave ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="ds-btn-danger" disabled={ocupado === f.clave} style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => retirar(f)}>
                  {ocupado === f.clave ? 'Retirando…' : 'Confirmar retirada'}
                </button>
                <button type="button" className="ds-btn-secondary" disabled={ocupado === f.clave} style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => setConfirmando(null)}>Cancelar</button>
              </div>
            ) : (
              <button type="button" className="ds-btn-secondary" style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => setConfirmando(f.clave)}>Retirar</button>
            ))}
          </article>
        )
      })}
    </div>
  )
}
