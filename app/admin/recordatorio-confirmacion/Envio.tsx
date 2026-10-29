'use client'

import { useState } from 'react'
import { enviarConfirmacionATodos, enviarPruebaConfirmacion } from './acciones'

export default function Envio({ pendientes }: { pendientes: number }) {
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState<'prueba' | 'todos' | null>(null)

  const prueba = async () => {
    setOcupado('prueba'); setAviso(null)
    const texto = await enviarPruebaConfirmacion()
    setOcupado(null)
    setAviso({ ok: texto.startsWith('Prueba enviada'), texto })
  }
  const todos = async () => {
    if (!window.confirm(`Se enviará el recordatorio a ${pendientes} cuentas. ¿Continuar?`)) return
    setOcupado('todos'); setAviso(null)
    const r = await enviarConfirmacionATodos(pendientes)
    setOcupado(null)
    setAviso(r)
  }

  return (
    <section className="account-card" style={{ marginBottom: '20px' }}>
      {aviso && <div className={aviso.ok ? 'ds-alert-success' : 'ds-alert-error'} style={{ marginBottom: '14px' }}>{aviso.texto}</div>}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="ds-btn-secondary" disabled={ocupado !== null} style={{ padding: '9px 18px', fontSize: '13px' }} onClick={prueba}>
          {ocupado === 'prueba' ? 'Enviando…' : 'Enviarme una prueba'}
        </button>
        <button type="button" className="ds-btn-primary" disabled={ocupado !== null || pendientes === 0} style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }} onClick={todos}>
          {ocupado === 'todos' ? 'Enviando…' : `Enviar a ${pendientes} ${pendientes === 1 ? 'cuenta' : 'cuentas'}`}
        </button>
      </div>
      <p className="ds-form-hint" style={{ marginTop: '10px' }}>
        El botón del correo lleva a /auth/confirmar, donde la persona pide un enlace nuevo: así no caduca aunque lo abra días después.
        Cada cuenta recibe el recordatorio una sola vez.
      </p>
    </section>
  )
}
