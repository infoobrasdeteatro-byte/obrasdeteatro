'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  clasificarIntento, crearEsperaConfirmacion, urlEntrada, type EsperaConfirmacion as Espera, type EstadoEspera,
} from '@/lib/auth/espera-confirmacion'

/**
 * «Revisa tu email para confirmar tu cuenta»: espera la confirmación y entra
 * sola cuando se confirma, desde cualquier aparato (ver
 * lib/auth/espera-confirmacion.ts). La contraseña solo vive en memoria de
 * esta pestaña (nunca en almacenamiento) y se suelta al entrar o al salir.
 */
export default function EsperaConfirmacion({ email, password, next }: { email: string; password: string; next: string | null }) {
  const espera = useRef<Espera | null>(null)
  const [estado, setEstado] = useState<EstadoEspera>('esperando')
  const [aviso, setAviso] = useState('')
  const [comprobando, setComprobando] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let credenciales: { email: string; password: string } | null = { email, password }
    const e = crearEsperaConfirmacion({
      async intentar() {
        const c = credenciales
        if (!c) return 'parar'
        const { error } = await supabase.auth.signInWithPassword({ email: c.email, password: c.password })
        return clasificarIntento(error)
      },
      visible: () => document.visibilityState === 'visible',
      ahora: () => Date.now(),
      programar(fn, ms) { const t = window.setTimeout(fn, ms); return () => window.clearTimeout(t) },
      alCambiarVisibilidad(fn) {
        document.addEventListener('visibilitychange', fn)
        return () => document.removeEventListener('visibilitychange', fn)
      },
      alEstado: setEstado,
      alEntrar() {
        credenciales = null
        window.location.assign(urlEntrada(next))
      },
    })
    espera.current = e
    e.iniciar()
    return () => { e.detener(); credenciales = null }
  }, [email, password, next])

  const entrar = async () => {
    if (!espera.current) return
    setComprobando(true); setAviso('')
    const r = await espera.current.comprobarAhora()
    setComprobando(false)
    if (r === 'esperar') setAviso('Todavía no vemos confirmado tu correo. Abre el enlace del email y vuelve a pulsar.')
    else if (r === 'frenar') setAviso('Demasiados intentos seguidos. Espera un minuto y vuelve a pulsar.')
  }

  const entrando = estado === 'entrando'

  return (
    <>
      <h1 className="auth-title">Revisa tu email para confirmar tu cuenta</h1>
      <p className="auth-tagline">
        Te hemos enviado un enlace a <strong>{email}</strong>. Puedes abrirlo aquí o en el móvil: esta página entrará sola en cuanto confirmes tu cuenta.
      </p>

      <p className="auth-message auth-message--success" role="status" aria-live="polite">
        {entrando ? 'Cuenta confirmada. Entrando…'
          : estado === 'agotada' ? 'Hemos dejado de comprobarlo automáticamente. Cuando hayas confirmado, pulsa «Ya he confirmado, entrar».'
          : estado === 'detenida' ? 'No hemos podido entrar automáticamente. Inicia sesión con tu correo y tu contraseña.'
          : 'Esperando la confirmación…'}
      </p>

      {estado === 'detenida' ? (
        <Link href="/auth/login" className="ds-btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>
          Iniciar sesión
        </Link>
      ) : (
        <button type="button" onClick={entrar} disabled={comprobando || entrando} className="ds-btn-primary" style={{ marginTop: '8px', width: '100%' }}>
          {comprobando ? 'Comprobando…' : 'Ya he confirmado, entrar'}
        </button>
      )}
      {aviso && <p className="auth-message auth-message--error">{aviso}</p>}

      <div className="auth-footer">
        <p>
          ¿No te ha llegado? Revisa la carpeta de spam o{' '}
          <Link href={`/auth/confirmar?email=${encodeURIComponent(email)}`}>pide un enlace nuevo</Link>.
        </p>
      </div>
    </>
  )
}
