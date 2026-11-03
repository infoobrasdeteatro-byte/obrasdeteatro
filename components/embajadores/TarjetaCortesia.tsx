'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renunciarCortesia } from '@/app/perfil/centro/cortesia-acciones'
import {
  ASUNTO_COLEGAS, enlaceCorreo, enlaceGmail, enlaceOutlook, enlaceReferido, enlaceWhatsapp, mensajeColegas as textoColegas,
  progresoEmbajador, recompensaEmbajador, tituloEmbajador, tituloHonor,
} from '@/lib/embajadores/textos'

/** Escalera del embajador (mi_embajador): solo sus cifras. */
export type Escalera = { registrados: number; activos: number; puntos: number; honor: boolean }

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Centro Profesional: membresía de cortesía. Embajador/a: su distintivo, hasta
 * cuándo, su enlace personal para colegas, sus cifras (registrados, activos,
 * puntos) y la barra hasta el siguiente escalón. Referido/a: sus tres meses
 * de Premium o, si es una organización, del plan Empresas (en «ustedes»).
 */
export default function TarjetaCortesia({ tipo, plan, hasta, genero, codigo, bienvenida, escalera = null }: {
  tipo: string; plan: string; hasta: string; genero: string | null; codigo: string | null; bienvenida: boolean; escalera?: Escalera | null
}) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)
  const [pending, startTransition] = useTransition()
  const enlace = codigo ? enlaceReferido(codigo) : null
  const mensajeColegas = enlace ? textoColegas(enlace) : ''
  // «Compartir…» solo en el móvil (pantalla táctil con menú de compartir del sistema).
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [correoAbierto, setCorreoAbierto] = useState(false)
  useEffect(() => {
    setPuedeCompartir(typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches)
  }, [])
  const compartir = async () => {
    try { await navigator.share({ title: ASUNTO_COLEGAS, text: mensajeColegas }) } catch { /* cancelado */ }
  }

  const copiar = async () => {
    if (!enlace) return
    try { await navigator.clipboard.writeText(enlace) } catch { /* sin portapapeles */ }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }
  const renunciar = () => {
    const pregunta = tipo === 'embajador'
      ? '¿Seguro que quieres renunciar a tu membresía de Embajador/a de Escena? Tu perfil pasará al plan que te corresponda y conservarás todo lo publicado.'
      : plan === 'empresas'
        ? '¿Seguro que quieren terminar ahora sus meses del plan Empresas?'
        : '¿Seguro que quieres terminar ahora tus meses de Premium?'
    if (!window.confirm(pregunta)) return
    startTransition(async () => { await renunciarCortesia(); router.refresh() })
  }

  if (tipo === 'referido') {
    // Organizaciones (plan Empresas), en «ustedes»: vale en los 20 países.
    const org = plan === 'empresas'
    return (
      <section className="account-card cortesia">
        <p className="cortesia-eyebrow">Invitación</p>
        <h2 className="cortesia-titulo">{org ? 'Empresas' : 'Premium'} por invitación</h2>
        <p className="cortesia-p">
          {org
            ? <>Disfrutan del plan Empresas hasta el <strong>{fecha(hasta)}</strong>. Sin tarjeta y sin compromiso: al terminar, si lo desean, podrán suscribirse.</>
            : <>Disfrutas de Premium hasta el <strong>{fecha(hasta)}</strong>. Sin tarjeta y sin compromiso: al terminar, si lo deseas, podrás suscribirte.</>}
        </p>
      </section>
    )
  }

  const honor = escalera?.honor ?? false
  const titulo = honor ? tituloHonor(genero) : tituloEmbajador(genero)
  const progreso = escalera ? progresoEmbajador(escalera.puntos) : null
  return (
    <section className="account-card cortesia">
      <p className="cortesia-eyebrow">{bienvenida ? 'Bienvenida' : 'Tu distintivo'}</p>
      <h2 className="cortesia-titulo">{titulo}</h2>
      <p className="cortesia-p">
        {bienvenida && <>Gracias por aceptar la invitación. </>}
        {honor || hasta.startsWith('infinity')
          ? <>Tu membresía {plan === 'destacado' ? 'Destacado' : 'Premium'} por cortesía es <strong>para siempre</strong>. Gracias por todo lo que has hecho por la comunidad.</>
          : <>Tu membresía {plan === 'destacado' ? 'Destacado' : 'Premium'} por cortesía está activa hasta el <strong>{fecha(hasta)}</strong>.
            {' '}Tu actividad la renueva: cada escalón que alcanzas con tus colegas le suma meses. Sin tarjeta y sin compromiso.</>}
      </p>
      {enlace && (
        <div className="cortesia-enlace">
          <p className="cortesia-p" style={{ marginBottom: '8px' }}>
            <strong>Tu enlace personal para colegas.</strong> Quien se registre con él tendrá tres meses gratis de Premium, o del plan Empresas si es una organización.
          </p>
          <div className="compartir-url">
            <input readOnly value={enlace} aria-label="Tu enlace personal" onFocus={e => e.currentTarget.select()} />
            <button type="button" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar enlace'}</button>
          </div>
          <div className="cortesia-botones">
            {puedeCompartir && <button type="button" className="ds-btn-secondary cortesia-wa" onClick={compartir}>Compartir…</button>}
            <a className="ds-btn-secondary cortesia-wa" href={enlaceWhatsapp(mensajeColegas)} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a>
            <button type="button" className="ds-btn-secondary cortesia-wa" aria-expanded={correoAbierto} onClick={() => setCorreoAbierto(v => !v)}>
              Enviar por correo
            </button>
          </div>
          {correoAbierto && (
            <div className="cortesia-correo">
              <span>Enviar con:</span>
              <a href={enlaceGmail(ASUNTO_COLEGAS, mensajeColegas)} target="_blank" rel="noopener noreferrer">Gmail</a>
              <a href={enlaceOutlook(ASUNTO_COLEGAS, mensajeColegas)} target="_blank" rel="noopener noreferrer">Outlook</a>
              <a href={enlaceCorreo(ASUNTO_COLEGAS, mensajeColegas)}>Otro programa de correo</a>
            </div>
          )}
          {escalera && (
            <>
              <div className="elenco-cifras">
                <div><b>{escalera.registrados}</b><span>colegas registrados</span></div>
                <div><b>{escalera.activos}</b><span>colegas activos</span></div>
                <div><b>{escalera.puntos}</b><span>puntos</span></div>
              </div>
              {progreso ? (
                <>
                  <p className="cortesia-cifra" style={{ marginTop: 0 }}>
                    {escalera.puntos} de {progreso.siguiente} puntos para tu siguiente escalón: {recompensaEmbajador(progreso.siguiente, genero)}.
                  </p>
                  <div className="elenco-progreso" role="progressbar" aria-valuemin={progreso.anterior} aria-valuemax={progreso.siguiente} aria-valuenow={escalera.puntos}
                    aria-label="Puntos hasta el siguiente escalón">
                    <span style={{ width: `${Math.round(progreso.progreso * 100)}%` }} />
                  </div>
                </>
              ) : (
                <p className="cortesia-cifra">Has completado la escalera: eres {tituloHonor(genero)}.</p>
              )}
              <p className="cortesia-cifra">
                Colega activo: profesional con el correo confirmado, foto y al menos una profesión (1 punto); organización con el perfil completo y su logo, o sala con su ficha reclamada (3 puntos). Las cuentas de público general no suman.
              </p>
            </>
          )}
        </div>
      )}
      <button type="button" className="red-enlace" disabled={pending} onClick={renunciar}>Renunciar a la membresía</button>
    </section>
  )
}
