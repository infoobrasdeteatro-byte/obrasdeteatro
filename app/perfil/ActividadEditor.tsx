'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Bloque 6 · «Última actividad». Visible por defecto; el titular puede
 * ocultarla. En la ficha solo se muestra el tramo (hoy, esta semana, este
 * mes o hace más de un mes), nunca la fecha exacta.
 */
export default function ActividadEditor({ profileId, inicial }: { profileId: string; inicial: boolean }) {
  const [visible, setVisible] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  const cambiar = async (v: boolean) => {
    setVisible(v); setGuardando(true); setMensaje(null)
    const { error } = await createClient().from('profiles').update({ mostrar_actividad: v }).eq('id', profileId)
    setGuardando(false)
    if (error) { setVisible(!v); setMensaje({ ok: false, texto: 'No se pudo guardar. Inténtalo de nuevo.' }) }
    else setMensaje({ ok: true, texto: v ? 'Tu última actividad se muestra en tu perfil.' : 'Tu última actividad ya no se muestra.' })
  }

  return (
    <div className="account-card ds-form" style={{ marginTop: '24px' }}>
      <p className="ds-label" style={{ marginBottom: '6px' }}>Última actividad</p>
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '16px', lineHeight: 1.6 }}>
        Tu ficha puede indicar si has estado activo/a hoy, esta semana o este mes. Nunca se muestra la fecha ni la hora exactas.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
        <input type="checkbox" checked={visible} disabled={guardando} onChange={e => cambiar(e.target.checked)} />
        Mostrar mi última actividad en mi perfil público
      </label>
      {mensaje && <div className={mensaje.ok ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginTop: '12px' }}>{mensaje.texto}</div>}
    </div>
  )
}
