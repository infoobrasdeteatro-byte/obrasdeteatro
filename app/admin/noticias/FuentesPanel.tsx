'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { enlaceSeguro, nombrePais } from '@/lib/noticias/presentacion'

export type FuentePanel = {
  id: string
  nombre: string
  dominio: string
  url_web: string | null
  pais_code: string
  tipo_fuente: string
  estado_permiso: string
  url_licencia: string | null
  activa: boolean
}

const PERMISOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'concedido', label: 'Concedido' },
  { value: 'denegado', label: 'Denegado' },
  { value: 'no_necesario', label: 'No necesario' },
] as const

const TIPO: Record<string, string> = {
  medio_con_permiso: 'Medio (requiere permiso)',
  fuente_publica_reutilizable: 'Fuente pública reutilizable',
}

/**
 * Estado de permiso y activación de cada fuente. Pensado para el día a día:
 * cuando un medio contesta, se marca «Concedido» y se activa.
 *
 * La regla «solo activa con permiso concedido o no necesario» es una CHECK de
 * la tabla (noticias_fuentes_activa_con_permiso). La interfaz desactiva la
 * casilla cuando no se cumple, pero quien decide es la base.
 */
export default function FuentesPanel({ fuentes }: { fuentes: FuentePanel[] }) {
  const router = useRouter()
  const [edicion, setEdicion] = useState<Record<string, { estado_permiso: string; activa: boolean }>>({})
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardadas, setGuardadas] = useState<Record<string, boolean>>({})

  const valor = (f: FuentePanel) => edicion[f.id] ?? { estado_permiso: f.estado_permiso, activa: f.activa }
  const permite = (permiso: string) => permiso === 'concedido' || permiso === 'no_necesario'

  const cambiar = (f: FuentePanel, cambios: Partial<{ estado_permiso: string; activa: boolean }>) => {
    const siguiente = { ...valor(f), ...cambios }
    // Si el permiso deja de permitirlo, la fuente no puede seguir activa.
    if (!permite(siguiente.estado_permiso)) siguiente.activa = false
    setEdicion(p => ({ ...p, [f.id]: siguiente }))
    setGuardadas(p => ({ ...p, [f.id]: false }))
  }

  const guardar = async (f: FuentePanel) => {
    const v = valor(f)
    setOcupada(f.id)
    setErrores(p => { const s = { ...p }; delete s[f.id]; return s })

    const { error } = await createClient()
      .from('noticias_fuentes')
      .update({ estado_permiso: v.estado_permiso, activa: v.activa })
      .eq('id', f.id)
      .select('id')
      .single()

    setOcupada(null)
    if (error) {
      setErrores(p => ({
        ...p,
        [f.id]: error.message.includes('noticias_fuentes_activa_con_permiso')
          ? 'Una fuente solo puede estar activa con permiso concedido o no necesario.'
          : error.message.includes('row-level security')
            ? 'Tu cuenta no tiene permiso de moderación sobre las fuentes.'
            : error.message,
      }))
      return
    }
    setEdicion(p => { const s = { ...p }; delete s[f.id]; return s })
    setGuardadas(p => ({ ...p, [f.id]: true }))
    router.refresh()
  }

  if (fuentes.length === 0) {
    return (
      <div className="obras-empty" style={{ padding: '32px 24px' }}>
        <p className="obras-empty-text" style={{ marginBottom: 0 }}>No hay fuentes registradas.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {fuentes.map(f => {
        const v = valor(f)
        const cambiada = Boolean(edicion[f.id])
        const web = enlaceSeguro(f.url_web)
        const licencia = enlaceSeguro(f.url_licencia)

        return (
          <article key={f.id} className="account-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--black)' }}>
                  {f.nombre}{' '}
                  <span className={`status-pill ${f.activa ? 'status-pill--published' : ''}`}
                    style={f.activa ? undefined : { background: 'var(--subtle)', color: 'var(--muted)' }}>
                    {f.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {web ? <a href={web} target="_blank" rel="noopener noreferrer nofollow" className="table-link">{f.dominio}</a> : f.dominio}
                  {' · '}{nombrePais(f.pais_code)}{' · '}{TIPO[f.tipo_fuente] ?? f.tipo_fuente}
                  {licencia && <>{' · '}<a href={licencia} target="_blank" rel="noopener noreferrer nofollow" className="table-link">licencia</a></>}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <label className="ds-label" htmlFor={`permiso-${f.id}`} style={{ margin: 0 }}>Permiso</label>
                <select id={`permiso-${f.id}`} className="ds-select" style={{ width: 'auto' }}
                  value={v.estado_permiso} onChange={e => cambiar(f, { estado_permiso: e.target.value })}>
                  {PERMISOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>

                <label htmlFor={`activa-${f.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                    cursor: permite(v.estado_permiso) ? 'pointer' : 'not-allowed',
                    color: permite(v.estado_permiso) ? 'var(--text)' : 'var(--muted)' }}>
                  <input type="checkbox" id={`activa-${f.id}`} checked={v.activa}
                    disabled={!permite(v.estado_permiso)}
                    onChange={e => cambiar(f, { activa: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--black)' }} />
                  Activa
                </label>

                <button type="button" className="ds-btn-primary" disabled={!cambiada || ocupada === f.id}
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => guardar(f)}>
                  {ocupada === f.id ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>

            {errores[f.id] && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{errores[f.id]}</div>}
            {guardadas[f.id] && !cambiada && <div className="ds-alert-success" style={{ marginTop: '12px' }}>Fuente actualizada.</div>}
          </article>
        )
      })}
    </div>
  )
}
