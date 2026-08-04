'use client'

import { useState } from 'react'

/**
 * AEC-003B Fase 4 (DA-005). Reautenticación y consentimiento informado se
 * presentan como dos bloques distintos a propósito -- acreditan cosas
 * diferentes (identidad y comprensión/aceptación) y deben mantenerse
 * conceptualmente independientes aunque compartan el mismo flujo.
 *
 * Corrección tras el cierre de la Fase 6: "Verificar" solo comprueba que el
 * usuario está en condiciones de continuar (llama a /preparar, no ejecuta
 * nada irreversible). El botón "Confirmar eliminación definitiva" es el
 * único punto de la interfaz que invoca /api/cuenta/eliminar/ejecutar --
 * el Evento Arquitectónico Atómico. Ambas llamadas reenvían la misma
 * contraseña, consistente con que la reautenticación debe tomarse en el
 * mismo momento, no heredarse de una verificación anterior.
 */
type ResultadoPreparar =
  | { estado: 'idle' }
  | { estado: 'cargando' }
  | { estado: 'listo' }
  | { estado: 'bloqueado_condiciones'; detalle: string[] }
  | { estado: 'error'; mensaje: string }

type ResultadoEjecutar =
  | { estado: 'idle' }
  | { estado: 'cargando' }
  | { estado: 'extinguida' }
  | { estado: 'ya_extinguida' }
  | { estado: 'error'; mensaje: string }

const MENSAJES_PREPARAR: Record<string, string> = {
  no_hay_solicitud: 'No hay ninguna solicitud de eliminación en curso.',
  consentimiento_no_otorgado: 'Debes confirmar que entiendes las consecuencias antes de continuar.',
  reautenticacion_requerida: 'Introduce tu contraseña actual para continuar.',
  contrasena_incorrecta: 'La contraseña no es correcta.',
}

const MENSAJES_EJECUTAR: Record<string, string> = {
  no_hay_solicitud: 'No hay ninguna solicitud de eliminación en curso.',
  consentimiento_no_otorgado: 'Debes confirmar que entiendes las consecuencias antes de continuar.',
  reautenticacion_fallida: 'La contraseña no es correcta.',
  condiciones_no_cumplidas: 'Ya no se cumplen las condiciones necesarias. Vuelve a comprobarlo con "Verificar".',
  error_stripe: 'No se pudo resolver tu suscripción. Inténtalo de nuevo más tarde.',
  error_plano2: 'No se pudo completar la extinción. Inténtalo de nuevo -- la operación es segura para reintentar.',
  error_plano1: 'No se pudo completar la extinción. Inténtalo de nuevo -- la operación es segura para reintentar.',
  error_confirmacion_final: 'No se pudo confirmar el estado final. Inténtalo de nuevo -- la operación es segura para reintentar.',
}

export default function PrepararExtincionPanel() {
  const [consentimiento, setConsentimiento] = useState(false)
  const [password, setPassword] = useState('')
  const [preparar, setPreparar] = useState<ResultadoPreparar>({ estado: 'idle' })
  const [ejecutar, setEjecutar] = useState<ResultadoEjecutar>({ estado: 'idle' })

  const verificar = async () => {
    setPreparar({ estado: 'cargando' })

    const res = await fetch('/api/cuenta/eliminar/preparar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, consentimiento }),
    })
    const data = await res.json()

    if (res.ok && data.ok) {
      setPreparar({ estado: 'listo' })
      return
    }

    if (data.code === 'condiciones_no_cumplidas') {
      const detalle = (data.diagnostico?.condiciones ?? [])
        .filter((c: { cumple: boolean }) => !c.cumple)
        .map((c: { detalle: string }) => c.detalle)
      setPreparar({ estado: 'bloqueado_condiciones', detalle })
      return
    }

    setPreparar({ estado: 'error', mensaje: MENSAJES_PREPARAR[data.code] ?? 'No se pudo completar la verificación.' })
  }

  const confirmarEliminacion = async () => {
    setEjecutar({ estado: 'cargando' })

    const res = await fetch('/api/cuenta/eliminar/ejecutar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, consentimiento }),
    })
    const data = await res.json()

    if (res.ok && data.ok && data.estado === 'identidad_extinguida') {
      setEjecutar({ estado: 'extinguida' })
      return
    }
    if (res.ok && data.ok && data.estado === 'ya_extinguida') {
      setEjecutar({ estado: 'ya_extinguida' })
      return
    }

    setEjecutar({ estado: 'error', mensaje: MENSAJES_EJECUTAR[data.code] ?? 'No se pudo completar la eliminación.' })
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', maxWidth: '420px', marginTop: '12px' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '16px', color: 'var(--black)', marginBottom: '14px' }}>
        Continuar con la eliminación
      </h2>

      {/* Bloque 1 -- Consentimiento informado (acredita comprensión y aceptación) */}
      <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '8px' }}>
          Consentimiento informado
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '10px' }}>
          Al continuar, tu identidad quedará extinguida de forma permanente: dejarás de poder acceder a tu cuenta y tus datos personales identificativos (nombre, correo, biografía, contacto) dejarán de estar disponibles. El contenido que hayas compartido con otras personas (conversaciones, obras publicadas, organizaciones) no se elimina y sigue formando parte del ecosistema.
        </p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
          <input type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)} style={{ marginTop: '3px' }} />
          Entiendo y acepto estas consecuencias.
        </label>
      </div>

      {/* Bloque 2 -- Reautenticación (acredita identidad) */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '8px' }}>
          Verificación de identidad
        </p>
        <input
          type="password"
          placeholder="Tu contraseña actual"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="ds-input"
        />
      </div>

      <button
        onClick={verificar}
        disabled={preparar.estado === 'cargando'}
        className="ds-btn-primary"
      >
        {preparar.estado === 'cargando' ? 'Verificando...' : 'Verificar'}
      </button>

      {preparar.estado === 'listo' && (
        <>
          <p className="auth-message auth-message--success" style={{ marginTop: '12px' }}>
            Verificación completada correctamente. Puedes confirmar la eliminación definitiva.
          </p>
          <button
            onClick={confirmarEliminacion}
            disabled={ejecutar.estado === 'cargando' || ejecutar.estado === 'extinguida' || ejecutar.estado === 'ya_extinguida'}
            className="ds-btn-danger"
            style={{ marginTop: '10px' }}
          >
            {ejecutar.estado === 'cargando' ? 'Eliminando...' : 'Confirmar eliminación definitiva'}
          </button>
        </>
      )}
      {preparar.estado === 'bloqueado_condiciones' && (
        <div className="auth-message auth-message--error" style={{ marginTop: '12px' }}>
          <p style={{ marginBottom: '6px' }}>No puedes continuar todavía:</p>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {preparar.detalle.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
      {preparar.estado === 'error' && (
        <p className="auth-message auth-message--error" style={{ marginTop: '12px' }}>{preparar.mensaje}</p>
      )}

      {ejecutar.estado === 'extinguida' && (
        <p className="auth-message auth-message--success" style={{ marginTop: '12px' }}>
          Tu identidad ha sido extinguida. Esta sesión dejará de funcionar.
        </p>
      )}
      {ejecutar.estado === 'ya_extinguida' && (
        <p className="auth-message auth-message--success" style={{ marginTop: '12px' }}>
          Esta identidad ya estaba extinguida.
        </p>
      )}
      {ejecutar.estado === 'error' && (
        <p className="auth-message auth-message--error" style={{ marginTop: '12px' }}>{ejecutar.mensaje}</p>
      )}
    </div>
  )
}
