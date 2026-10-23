'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { emailValido, telefonoValido } from '@/lib/red/contacto'

interface Props {
  profileId: string
  /** Correo de la cuenta: se propone como correo de contacto si aún no hay. */
  emailCuenta: string | null
  inicial: { email: string | null; email_publico: boolean; telefono: string | null; whatsapp: string | null } | null
}

/**
 * Bloque 6 · Contacto. El correo se ve en el perfil si el titular lo marca.
 * El teléfono y el WhatsApp nunca se muestran: se comparten solo con quien
 * los pida y el titular acepte (Mi red).
 */
export default function ContactoEditor({ profileId, emailCuenta, inicial }: Props) {
  const [email, setEmail] = useState(inicial?.email ?? emailCuenta ?? '')
  const [emailPublico, setEmailPublico] = useState(inicial?.email_publico ?? false)
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [whatsapp, setWhatsapp] = useState(inicial?.whatsapp ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const error = (texto: string) => { setMessage(texto); setIsError(true) }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const em = email.trim(), tel = telefono.trim(), wa = whatsapp.trim()
    if (em && !emailValido(em)) return error('Revisa el correo de contacto.')
    if (emailPublico && !em) return error('Escribe un correo para poder mostrarlo en tu perfil.')
    if (tel && !telefonoValido(tel)) return error('Revisa el teléfono: solo números, espacios y el prefijo +.')
    if (wa && !telefonoValido(wa)) return error('Revisa el WhatsApp: solo números, espacios y el prefijo +.')

    setLoading(true)
    const { error: err } = await createClient().from('perfil_contacto').upsert({
      profile_id: profileId,
      email: em || null,
      email_publico: emailPublico && Boolean(em),
      telefono: tel || null,
      whatsapp: wa || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })
    setLoading(false)
    if (err) return error('No se pudo guardar el contacto. Inténtalo de nuevo.')
    setMessage('Contacto guardado')
    setIsError(false)
  }

  return (
    <form onSubmit={handleGuardar} className="account-card ds-form" style={{ marginTop: '24px' }}>
      <p className="ds-label" style={{ marginBottom: '6px' }}>Contacto</p>
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '24px', lineHeight: 1.6 }}>
        Tú decides qué se ve. El correo puede ser público; el teléfono y el WhatsApp nunca se muestran:
        otros usuarios pueden solicitarlos y solo los verá quien tú aceptes en <Link href="/perfil/red" style={{ color: 'var(--black)', fontWeight: 500 }}>Mi red</Link>.
      </p>

      <div className="ds-form-group">
        <label className="ds-label ds-label-sub" htmlFor="contacto-email">Correo de contacto</label>
        <input id="contacto-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="ds-input" placeholder="tu@correo.com" autoComplete="email" />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
          <input type="checkbox" checked={emailPublico} onChange={e => setEmailPublico(e.target.checked)} />
          Mostrar este correo en mi perfil público
        </label>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
          Privado · solo bajo solicitud
        </p>
        <div className="ds-form-group" style={{ marginBottom: 0 }}>
          <label className="ds-label ds-label-sub" htmlFor="contacto-telefono">Teléfono</label>
          <input id="contacto-telefono" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className="ds-input" placeholder="+34 600 000 000" autoComplete="tel" />
        </div>
        <div className="ds-form-group" style={{ marginBottom: 0 }}>
          <label className="ds-label ds-label-sub" htmlFor="contacto-whatsapp">WhatsApp</label>
          <input id="contacto-whatsapp" type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="ds-input" placeholder="+34 600 000 000" />
          {telefono.trim() && !whatsapp.trim() && (
            <button type="button" onClick={() => setWhatsapp(telefono)} style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Usar el mismo número que el teléfono
            </button>
          )}
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.5 }}>
            Con el prefijo del país (+34, +57…) para que el botón de WhatsApp funcione.
          </p>
        </div>
      </div>

      <button type="submit" disabled={loading} className="ds-btn-primary">
        {loading ? 'Guardando...' : 'Guardar contacto'}
      </button>

      {message && <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>{message}</div>}
    </form>
  )
}
