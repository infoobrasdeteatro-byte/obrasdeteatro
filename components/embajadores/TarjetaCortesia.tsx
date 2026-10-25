'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renunciarCortesia } from '@/app/perfil/centro/cortesia-acciones'
import { enlaceReferido, enlaceWhatsapp, tituloEmbajador } from '@/lib/embajadores/textos'

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Centro Profesional: membresía de cortesía. Embajador/a: su distintivo, hasta
 * cuándo, su enlace personal para colegas y cuántos han entrado (solo sus
 * cifras). Referido/a: su mes de Premium.
 */
export default function TarjetaCortesia({ tipo, plan, hasta, genero, codigo, referidos, bienvenida }: {
  tipo: string; plan: string; hasta: string; genero: string | null; codigo: string | null; referidos: number; bienvenida: boolean
}) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)
  const [pending, startTransition] = useTransition()
  const enlace = codigo ? enlaceReferido(codigo) : null
  const mensajeColegas = enlace
    ? `Te invito a ObrasDeTeatro®, la plataforma profesional del teatro en español. Con mi enlace tienes un mes de Premium gratis, sin tarjeta: ${enlace}`
    : ''

  const copiar = async () => {
    if (!enlace) return
    try { await navigator.clipboard.writeText(enlace) } catch { /* sin portapapeles */ }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }
  const renunciar = () => {
    const pregunta = tipo === 'embajador'
      ? '¿Seguro que quieres renunciar a tu membresía de Embajador/a de Escena? Tu perfil pasará al plan que te corresponda y conservarás todo lo publicado.'
      : '¿Seguro que quieres terminar ahora tu mes de Premium?'
    if (!window.confirm(pregunta)) return
    startTransition(async () => { await renunciarCortesia(); router.refresh() })
  }

  if (tipo === 'referido') {
    return (
      <section className="account-card cortesia">
        <p className="cortesia-eyebrow">Invitación</p>
        <h2 className="cortesia-titulo">Premium por invitación</h2>
        <p className="cortesia-p">Disfrutas de un mes de Premium hasta el <strong>{fecha(hasta)}</strong>. Sin tarjeta y sin compromiso: al terminar, si lo deseas, podrás suscribirte.</p>
      </section>
    )
  }

  const titulo = tituloEmbajador(genero)
  return (
    <section className="account-card cortesia">
      <p className="cortesia-eyebrow">{bienvenida ? 'Bienvenida' : 'Tu distintivo'}</p>
      <h2 className="cortesia-titulo">{titulo}</h2>
      <p className="cortesia-p">
        {bienvenida && <>Gracias por aceptar la invitación. </>}
        Tu membresía {plan === 'destacado' ? 'Destacado' : 'Premium'} por cortesía está activa hasta el <strong>{fecha(hasta)}</strong>.
        Sin tarjeta y sin compromiso: al terminar, si lo deseas, podrás continuar con tu suscripción.
      </p>
      {enlace && (
        <div className="cortesia-enlace">
          <p className="cortesia-p" style={{ marginBottom: '8px' }}>
            <strong>Tu enlace personal para colegas.</strong> Quien se registre con él tendrá un mes de Premium gratis.
          </p>
          <div className="compartir-url">
            <input readOnly value={enlace} aria-label="Tu enlace personal" onFocus={e => e.currentTarget.select()} />
            <button type="button" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar enlace'}</button>
          </div>
          <a className="ds-btn-secondary cortesia-wa" href={enlaceWhatsapp(mensajeColegas)} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a>
          <p className="cortesia-cifra">
            {referidos === 0 ? 'Todavía no se ha registrado nadie con tu enlace.' : `Has invitado a ${referidos} colega${referidos === 1 ? '' : 's'}.`}
          </p>
        </div>
      )}
      <button type="button" className="red-enlace" disabled={pending} onClick={renunciar}>Renunciar a la membresía</button>
    </section>
  )
}
