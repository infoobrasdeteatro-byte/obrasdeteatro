'use client'

import { useState } from 'react'

/**
 * AEC-003B Fase 4 (DA-005). Reautenticación y consentimiento informado se
 * presentan como dos bloques distintos a propósito -- acreditan cosas
 * diferentes (identidad y comprensión/aceptación) y deben mantenerse
 * conceptualmente independientes aunque compartan el mismo flujo.
 *
 * No ejecuta ninguna acción irreversible: solo comprueba que el usuario
 * está en condiciones de continuar. La ejecución real llega en fases
 * posteriores de este mismo expediente.
 */
type Resultado =
  | { estado: 'idle' }
  | { estado: 'cargando' }
  | { estado: 'listo' }
  | { estado: 'bloqueado_condiciones'; detalle: string[] }
  | { estado: 'error'; mensaje: string }

export default function PrepararExtincionPanel() {
  const [consentimiento, setConsentimiento] = useState(false)
  const [password, setPassword] = useState('')
  const [resultado, setResultado] = useState<Resultado>({ estado: 'idle' })

  const verificar = async () => {
    setResultado({ estado: 'cargando' })

    const res = await fetch('/api/cuenta/eliminar/preparar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, consentimiento }),
    })
    const data = await res.json()

    if (res.ok && data.ok) {
      setResultado({ estado: 'listo' })
      return
    }

    if (data.code === 'condiciones_no_cumplidas') {
      const detalle = (data.diagnostico?.condiciones ?? [])
        .filter((c: { cumple: boolean }) => !c.cumple)
        .map((c: { detalle: string }) => c.detalle)
      setResultado({ estado: 'bloqueado_condiciones', detalle })
      return
    }

    const mensajes: Record<string, string> = {
      no_hay_solicitud: 'No hay ninguna solicitud de eliminación en curso.',
      consentimiento_no_otorgado: 'Debes confirmar que entiendes las consecuencias antes de continuar.',
      reautenticacion_requerida: 'Introduce tu contraseña actual para continuar.',
      contrasena_incorrecta: 'La contraseña no es correcta.',
    }
    setResultado({ estado: 'error', mensaje: mensajes[data.code] ?? 'No se pudo completar la verificación.' })
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
        disabled={resultado.estado === 'cargando'}
        className="ds-btn-primary"
      >
        {resultado.estado === 'cargando' ? 'Verificando...' : 'Verificar'}
      </button>

      {resultado.estado === 'listo' && (
        <p className="auth-message auth-message--success" style={{ marginTop: '12px' }}>
          Verificación completada correctamente. La eliminación definitiva se activará en una fase posterior de este proyecto.
        </p>
      )}
      {resultado.estado === 'bloqueado_condiciones' && (
        <div className="auth-message auth-message--error" style={{ marginTop: '12px' }}>
          <p style={{ marginBottom: '6px' }}>No puedes continuar todavía:</p>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {resultado.detalle.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
      {resultado.estado === 'error' && (
        <p className="auth-message auth-message--error" style={{ marginTop: '12px' }}>{resultado.mensaje}</p>
      )}
    </div>
  )
}
