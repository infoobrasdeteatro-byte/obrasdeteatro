'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { solicitarContacto, cancelarSolicitudContacto } from '../red/acciones'
import { MAX_MENSAJE_SOLICITUD, hrefTelefono, hrefWhatsapp, type EstadoContacto } from '@/lib/red/contacto'
import IconoContacto from '@/components/perfil/IconoContacto'

interface Props {
  perfilId: string
  slug: string
  nombre: string
  estado: EstadoContacto
  email: string | null
  telefono: string | null
  whatsapp: string | null
  tienePrivado: boolean
}

const fila: React.CSSProperties = {
  fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px',
}
const nota: React.CSSProperties = { fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.5, margin: 0 }

/** Correo (si es público), y teléfono/WhatsApp solo con solicitud aceptada. */
export default function ContactoPerfil({ perfilId, slug, nombre, estado: inicial, email, telefono, whatsapp, tienePrivado }: Props) {
  const [estado, setEstado] = useState<EstadoContacto>(inicial)
  const [abierto, setAbierto] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const enviar = () => startTransition(async () => {
    setError('')
    const r = await solicitarContacto(perfilId, mensaje)
    if (r.ok) { setEstado('pendiente'); setAbierto(false); setMensaje('') } else setError(r.error ?? 'No se pudo enviar.')
  })
  const cancelar = () => startTransition(async () => {
    const r = await cancelarSolicitudContacto(perfilId)
    if (r.ok) setEstado('ninguna')
  })

  const wa = whatsapp ? hrefWhatsapp(whatsapp) : null
  const ve = estado === 'propio' || estado === 'aceptada'

  return (
    <>
      {email && (
        <a href={`mailto:${email}`} style={fila}>
          <IconoContacto tipo="email" />
          {email}
        </a>
      )}

      {ve && telefono && (
        <a href={hrefTelefono(telefono)} style={fila}>
          <IconoContacto tipo="telefono" />
          {telefono}
        </a>
      )}
      {ve && whatsapp && (
        wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" style={fila}>
            <IconoContacto tipo="whatsapp" />
            WhatsApp · {whatsapp}
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>↗</span>
          </a>
        ) : (
          <span style={fila}><IconoContacto tipo="whatsapp" />WhatsApp · {whatsapp}</span>
        )
      )}

      {estado === 'propio' && (
        <p style={nota}>
          {tienePrivado
            ? 'Tu teléfono y tu WhatsApp solo los ven las personas que aceptas en '
            : 'Añade un teléfono o WhatsApp para que otros puedan solicitártelo. Gestiona las solicitudes en '}
          <Link href="/perfil/red" style={{ color: 'var(--black)' }}>Mi red</Link>
          {' · '}
          <Link href="/perfil/bloque/6" style={{ color: 'var(--black)' }}>Editar contacto</Link>
        </p>
      )}

      {estado === 'aceptada' && <p style={nota}>{nombre} ha compartido su contacto contigo.</p>}

      {tienePrivado && estado === 'anonimo' && (
        <p style={nota}>
          <Link href={`/auth/login?next=${encodeURIComponent(`/perfil/${slug}`)}`} style={{ color: 'var(--black)', fontWeight: 500 }}>
            Inicia sesión
          </Link>{' '}para solicitar su teléfono y WhatsApp.
        </p>
      )}

      {tienePrivado && estado === 'pendiente' && (
        <p style={nota}>
          Solicitud de contacto enviada. {nombre} decidirá si comparte su teléfono y WhatsApp.{' '}
          <button type="button" onClick={cancelar} disabled={pending}
            style={{ fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
            Retirar solicitud
          </button>
        </p>
      )}

      {tienePrivado && estado === 'ninguna' && !abierto && (
        <div>
          <button type="button" onClick={() => setAbierto(true)} className="ds-btn-secondary"
            style={{ width: 'auto', display: 'inline-flex', padding: '8px 16px', fontSize: '13px' }}>
            Solicitar teléfono y WhatsApp
          </button>
        </div>
      )}

      {tienePrivado && estado === 'ninguna' && abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px' }}>
          <label htmlFor="mensaje-contacto" style={{ ...nota, color: 'var(--text)' }}>
            Mensaje para {nombre} (opcional)
          </label>
          <textarea
            id="mensaje-contacto"
            value={mensaje}
            onChange={e => setMensaje(e.target.value.slice(0, MAX_MENSAJE_SOLICITUD))}
            rows={3}
            className="ds-input"
            placeholder="Cuéntale brevemente por qué quieres contactar: un proyecto, una producción, una gira…"
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={enviar} disabled={pending} className="ds-btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
              {pending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
            <button type="button" onClick={() => setAbierto(false)} disabled={pending}
              style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
            <span style={{ ...nota, marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '11px' }}>{mensaje.length}/{MAX_MENSAJE_SOLICITUD}</span>
          </div>
        </div>
      )}

      {error && <p style={{ ...nota, color: '#b91c1c' }}>{error}</p>}
    </>
  )
}
