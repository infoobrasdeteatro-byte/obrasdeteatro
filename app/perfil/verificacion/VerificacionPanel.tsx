'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { REQUISITOS, TIPOS_ENLACE, cumpleRequisitos, type Requisitos } from '@/lib/perfiles/verificacion'
import { solicitarVerificacion } from './acciones'

type Solicitud = { estado: string; enlace: string; motivo: string | null; created_at: string } | null

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export default function VerificacionPanel({ verificado, requisitos, codigo, ultima }: {
  verificado: boolean
  requisitos: Requisitos
  codigo: string
  ultima: Solicitud
}) {
  const [tipo, setTipo] = useState('instagram')
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [aprobadaAhora, setAprobadaAhora] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [pendiente, startTransition] = useTransition()

  const cumple = cumpleRequisitos(requisitos)
  const enRevision = enviado || ultima?.estado === 'pendiente'

  if (verificado || aprobadaAhora) {
    return (
      <div className="account-card verif-card">
        <p className="verif-sello">✓ Verificado</p>
        <h2 className="verif-titulo">Tu perfil profesional está verificado</h2>
        <p className="verif-texto">
          El sello aparece en tu ficha y en el directorio. Se mantiene mientras tengas un plan de pago activo;
          si lo cancelas se retira, y vuelve solo en cuanto reactives tu suscripción.
        </p>
      </div>
    )
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const r = await solicitarVerificacion(tipo, enlace)
      if ('error' in r) setError(r.error)
      else if (r.aprobada) setAprobadaAhora(true)
      else setEnviado(true)
    })
  }

  return (
    <div className="verif">
      <div className="account-card verif-card">
        <h2 className="verif-titulo">Perfil profesional verificado</h2>
        <p className="verif-texto">
          El sello «✓ Verificado» indica a programadores, directores de casting y compañías que tu perfil es real y
          que la presencia profesional que muestras es tuya. No te pedimos ningún documento de identidad.
        </p>

        <h3 className="verif-paso">1 · Requisitos</h3>
        <ul className="verif-requisitos">
          {REQUISITOS.map(q => {
            const ok = requisitos[q.clave] === true
            return (
              <li key={q.clave} className={ok ? 'verif-ok' : 'verif-falta'}>
                <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                <span>{q.texto}</span>
                {!ok && <Link href={q.href} className="verif-enlace">{q.clave === 'plan' ? 'Ver planes' : 'Completar'} →</Link>}
              </li>
            )
          })}
        </ul>
      </div>

      {enRevision ? (
        <div className="account-card verif-card verif-estado">
          <h3 className="verif-paso">Solicitud en revisión</h3>
          <p className="verif-texto">
            Hemos recibido tu solicitud{ultima?.estado === 'pendiente' ? ` del ${fecha(ultima.created_at)}` : ''}. No hemos podido comprobar
            el código de forma automática (algunas redes no lo permiten), así que el equipo la revisará en unos días y te avisaremos por
            correo. Mantén el código en tu red o tu web hasta entonces.
          </p>
        </div>
      ) : (
        <div className={`account-card verif-card${cumple ? '' : ' verif-bloqueado'}`} aria-disabled={!cumple}>
          {ultima?.estado === 'rechazada' && (
            <div className="ds-alert-error" style={{ marginBottom: '16px' }}>
              Tu última solicitud no se aprobó{ultima.motivo ? `: ${ultima.motivo}` : '.'} Puedes corregirlo y enviarla de nuevo.
            </div>
          )}

          <h3 className="verif-paso">2 · Tu código</h3>
          <p className="verif-texto">
            Ponlo en la biografía de una de tus redes profesionales o en una página de tu web. Si podemos leerlo
            automáticamente (sobre todo en webs propias), la verificación es inmediata; si no, la revisa el equipo.
            Puedes quitarlo cuando te confirmemos la verificación.
          </p>
          <div className="verif-codigo">
            <code>{codigo}</code>
            <button
              type="button"
              className="ds-btn-secondary"
              style={{ width: 'auto', padding: '6px 14px', fontSize: '13px' }}
              onClick={() => { navigator.clipboard?.writeText(codigo).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }).catch(() => {}) }}
            >
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <h3 className="verif-paso">3 · Envía el enlace</h3>
          <form onSubmit={enviar} className="verif-form">
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="ds-input" aria-label="Dónde has puesto el código" disabled={!cumple}>
              {TIPOS_ENLACE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="url"
              value={enlace}
              onChange={e => setEnlace(e.target.value)}
              placeholder="https://www.instagram.com/tu_perfil"
              className="ds-input"
              required
              disabled={!cumple}
              aria-label="Enlace a tu red o tu web"
            />
            <button type="submit" className="ds-btn-primary" disabled={!cumple || pendiente} style={{ width: 'auto', padding: '10px 18px' }}>
              {pendiente ? 'Enviando…' : 'Solicitar verificación'}
            </button>
          </form>
          {!cumple && <p className="verif-nota">Completa los requisitos para poder enviar la solicitud.</p>}
          {error && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{error}</div>}
        </div>
      )}
    </div>
  )
}
