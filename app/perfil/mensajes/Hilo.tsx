'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { enviarMensaje, marcarLeida } from './acciones'
import { MAX_MENSAJE, fechaMensaje, type MotivoEscribir } from '@/lib/mensajes/mensajes'

export type Otro = { id: string; nombre: string; slug: string | null; avatar: string | null; publico: boolean }
type Mensaje = { id: string; mio: boolean; texto: string; created_at: string; leido: boolean }

/** Cada cuánto se buscan mensajes nuevos con la conversación abierta y visible. */
const REFRESCO_MS = 20000

export default function Hilo({ conversacionId, otro, mensajes, puede, aviso, motivo }: {
  conversacionId: string | null; otro: Otro; mensajes: Mensaje[]; puede: boolean; aviso: string | null; motivo: MotivoEscribir
}) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const fondo = useRef<HTMLDivElement>(null)

  // Al abrir y con cada mensaje nuevo: bajar al final y marcar como leída.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' })
    if (conversacionId && mensajes.some(m => !m.mio && !m.leido)) void marcarLeida(conversacionId)
  }, [conversacionId, mensajes])

  // Mensajes nuevos: se refresca la página cada 20 s mientras se ve.
  useEffect(() => {
    if (!conversacionId) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh() }, REFRESCO_MS)
    return () => clearInterval(t)
  }, [conversacionId, router])

  const enviar = () => {
    if (!texto.trim() || pending) return
    startTransition(async () => {
      setError('')
      const r = await enviarMensaje(otro.id, texto)
      if (!r.ok) { setError(r.error); return }
      setTexto('')
      if (r.conversacion !== conversacionId) router.replace(`/perfil/mensajes?c=${r.conversacion}`)
      else router.refresh()
    })
  }

  return (
    <div className="msj-hilo">
      <header className="msj-hilo-cabecera">
        <Link href="/perfil/mensajes" className="msj-volver" aria-label="Volver a las conversaciones">←</Link>
        {otro.avatar
          ? <Image src={otro.avatar} alt="" width={36} height={36} className="red-avatar msj-avatar" />
          : <span className="red-avatar red-avatar--inicial msj-avatar" aria-hidden="true">{otro.nombre.charAt(0).toUpperCase()}</span>}
        {otro.publico && otro.slug
          ? <Link href={`/perfil/${otro.slug}`} className="red-nombre">{otro.nombre}</Link>
          : <span className="red-nombre">{otro.nombre}</span>}
      </header>

      <div className="msj-mensajes" aria-live="polite">
        {mensajes.length === 0 && (
          <p className="msj-vacio msj-vacio--centro">
            {puede ? `Escribe tu primer mensaje a ${otro.nombre}.` : 'Todavía no hay mensajes.'}
          </p>
        )}
        {mensajes.map(m => (
          <div key={m.id} className={`msj-burbuja${m.mio ? ' msj-burbuja--mia' : ''}`}>
            <p>{m.texto}</p>
            <span className="msj-hora">
              {fechaMensaje(m.created_at)}{m.mio && m.leido ? ' · Leído' : ''}
            </span>
          </div>
        ))}
        <div ref={fondo} />
      </div>

      {puede ? (
        <form className="msj-escribir" onSubmit={e => { e.preventDefault(); enviar() }}>
          <label htmlFor="msj-texto" className="msj-oculto">Mensaje para {otro.nombre}</label>
          <textarea
            id="msj-texto"
            className="ds-input"
            rows={2}
            value={texto}
            maxLength={MAX_MENSAJE}
            placeholder={`Escribe a ${otro.nombre}…`}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          />
          <button type="submit" className="ds-btn-primary" disabled={pending || !texto.trim()}>
            {pending ? 'Enviando…' : 'Enviar'}
          </button>
          {error && <p className="red-error msj-error">{error}</p>}
        </form>
      ) : (
        <div className="msj-aviso">
          <p>{aviso}</p>
          {motivo === 'plan' && <Link href="/precios" className="ds-btn-secondary">Ver planes</Link>}
          {(motivo === 'plan' || motivo === 'solo_contactos') && otro.slug && (
            <Link href={`/perfil/${otro.slug}`} className="ds-btn-secondary">Conectar con {otro.nombre}</Link>
          )}
        </div>
      )}
    </div>
  )
}
