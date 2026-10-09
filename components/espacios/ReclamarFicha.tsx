'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginUrlWithNext } from '@/lib/auth/next-param'
import { ANCLA_RECLAMAR, MAX_MENSAJE, validarMensajeReclamacion } from '@/lib/espacios/espacios'

type Estado = 'cerrado' | 'abierto' | 'enviando' | 'enviado'

/**
 * «¿Gestionas este espacio? Reclámalo».
 *
 * La ficha es estática (cacheada): no sabe quién la mira. La sesión se mira
 * aquí, en el navegador, al pulsar:
 *   - sin sesión → login, que vuelve a la ficha con #reclamar y el formulario
 *     ya abierto;
 *   - con sesión → formulario corto (cargo y forma de contacto) que llama a
 *     POST /api/espacios/reclamaciones.
 */
export default function ReclamarFicha({ espacioId, slug }: { espacioId: string; slug: string }) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('cerrado')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const abrir = async () => {
    setError('')
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) {
      router.push(loginUrlWithNext(`/espacios/${slug}#${ANCLA_RECLAMAR}`))
      return
    }
    setEstado('abierto')
  }

  // Vuelta del login: la ficha se abre con #reclamar.
  useEffect(() => {
    if (window.location.hash !== `#${ANCLA_RECLAMAR}`) return
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setEstado(e => (e === 'cerrado' ? 'abierto' : e))
    })
  }, [])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const problema = validarMensajeReclamacion(mensaje)
    if (problema) { setError(problema); return }
    setError('')
    setEstado('enviando')
    try {
      const res = await fetch('/api/espacios/reclamaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacio_id: espacioId, mensaje }),
      })
      if (res.status === 401) {
        router.push(loginUrlWithNext(`/espacios/${slug}#${ANCLA_RECLAMAR}`))
        return
      }
      const datos = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof datos.error === 'string' ? datos.error : 'No se pudo enviar la reclamación.')
        setEstado('abierto')
        return
      }
      setEstado('enviado')
    } catch {
      setError('No se pudo enviar la reclamación. Comprueba la conexión.')
      setEstado('abierto')
    }
  }

  if (estado === 'enviado') {
    return (
      <div id={ANCLA_RECLAMAR} className="ds-alert-success" style={{ marginTop: '22px' }}>
        Hemos recibido tu reclamación. El equipo la revisará y te escribirá para confirmar que gestionas el espacio.
      </div>
    )
  }

  if (estado === 'cerrado') {
    return (
      <div id={ANCLA_RECLAMAR}>
        <button type="button" className="ds-btn-secondary" style={{ padding: '10px 18px', fontSize: '13px' }} onClick={abrir}>
          ¿Gestionas este espacio? Reclámalo
        </button>
      </div>
    )
  }

  return (
    <form id={ANCLA_RECLAMAR} className="account-card" style={{ marginTop: '22px', width: '100%' }} onSubmit={enviar}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', marginBottom: '8px' }}>
        Reclamar esta ficha
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '12px' }}>
        Si diriges o gestionas este espacio, cuéntanos tu cargo y cómo contactarte. Lo comprobaremos antes de darte acceso a la ficha.
      </p>
      <div className="ds-form-group">
        <label className="ds-label" htmlFor="reclamar-mensaje">Tu cargo y forma de contacto *</label>
        <textarea id="reclamar-mensaje" className="ds-textarea" rows={4} maxLength={MAX_MENSAJE}
          placeholder="Ej.: Directora de programación. Teléfono 600 000 000 o programacion@teatro.es"
          value={mensaje} onChange={e => setMensaje(e.target.value)} />
        <p className="ds-form-hint">{mensaje.length} / {MAX_MENSAJE} caracteres</p>
      </div>
      {error && <div className="ds-alert-error" style={{ marginTop: '10px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button type="submit" className="ds-btn-primary" disabled={estado === 'enviando'}
          style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}>
          {estado === 'enviando' ? 'Enviando…' : 'Enviar reclamación'}
        </button>
        <button type="button" className="ds-btn-secondary" disabled={estado === 'enviando'}
          style={{ padding: '9px 18px', fontSize: '13px' }} onClick={() => { setEstado('cerrado'); setError('') }}>
          Cancelar
        </button>
      </div>
      <p className="ds-form-hint" style={{ marginTop: '10px' }}>
        Tratamos estos datos solo para gestionar la reclamación. Más información en la{' '}
        <a href="/legal/privacidad" className="table-link">Política de Privacidad</a>.
      </p>
    </form>
  )
}
