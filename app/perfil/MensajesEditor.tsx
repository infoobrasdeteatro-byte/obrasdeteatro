'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Campo = 'mensajes_solo_contactos' | 'avisos_mensajes_email'

/**
 * Bloque 6 · Mensajes: limitar los mensajes a los contactos conectados y
 * activar o desactivar el aviso por correo de mensajes nuevos.
 */
export default function MensajesEditor({ profileId, soloContactos, avisosEmail }: {
  profileId: string; soloContactos: boolean; avisosEmail: boolean
}) {
  const [valores, setValores] = useState<Record<Campo, boolean>>({
    mensajes_solo_contactos: soloContactos,
    avisos_mensajes_email: avisosEmail,
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  const cambiar = async (campo: Campo, v: boolean) => {
    setValores(x => ({ ...x, [campo]: v })); setGuardando(true); setMensaje(null)
    const cambio = campo === 'mensajes_solo_contactos' ? { mensajes_solo_contactos: v } : { avisos_mensajes_email: v }
    const { error } = await createClient().from('profiles').update(cambio).eq('id', profileId)
    setGuardando(false)
    if (error) {
      setValores(x => ({ ...x, [campo]: !v }))
      setMensaje({ ok: false, texto: 'No se pudo guardar. Inténtalo de nuevo.' })
    } else {
      setMensaje({ ok: true, texto: 'Preferencias de mensajes guardadas.' })
    }
  }

  const fila: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', cursor: 'pointer', lineHeight: 1.5 }

  return (
    <div className="account-card ds-form" style={{ marginTop: '24px' }}>
      <p className="ds-label" style={{ marginBottom: '6px' }}>Mensajes</p>
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '16px', lineHeight: 1.6 }}>
        Tus contactos conectados siempre pueden escribirte. Puedes decidir si también te escriben otros profesionales con plan de pago.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={fila}>
          <input type="checkbox" checked={valores.mensajes_solo_contactos} disabled={guardando}
            onChange={e => cambiar('mensajes_solo_contactos', e.target.checked)} style={{ marginTop: '3px' }} />
          Solo recibir mensajes de mis contactos
        </label>
        <label style={fila}>
          <input type="checkbox" checked={valores.avisos_mensajes_email} disabled={guardando}
            onChange={e => cambiar('avisos_mensajes_email', e.target.checked)} style={{ marginTop: '3px' }} />
          Avisarme por correo cuando reciba un mensaje (como mucho uno cada 6 horas por conversación)
        </label>
      </div>
      {mensaje && <div className={mensaje.ok ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginTop: '12px' }}>{mensaje.texto}</div>}
    </div>
  )
}
