'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Specialty {
  id: string
  specialty: string
  is_primary: boolean
}

interface Props {
  profileId: string
  plan: string
  initialData: Specialty[]
}

const MAX_GRATUITO = 3

export default function EspecialidadesEditor({ profileId, plan, initialData }: Props) {
  const [specialties, setSpecialties] = useState<Specialty[]>(initialData)
  const [newText, setNewText]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [message, setMessage]         = useState('')
  const [isError, setIsError]         = useState(false)

  const isPremium = plan !== 'gratuito'
  const canAdd    = isPremium || specialties.length < MAX_GRATUITO

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newText.trim()
    if (!text || !canAdd) return

    setSaving(true)
    setMessage('')

    const supabase = createClient()
    const isFirst  = specialties.length === 0

    const { data, error } = await supabase
      .from('profile_specialties')
      .insert({ profile_id: profileId, specialty: text, is_primary: isFirst })
      .select('id, specialty, is_primary')
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setIsError(true)
    } else if (data) {
      setSpecialties(prev => [...prev, data])
      setNewText('')
      setIsError(false)
      setMessage('')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase  = createClient()
    const { error } = await supabase.from('profile_specialties').delete().eq('id', id)

    if (!error) {
      setSpecialties(prev => {
        const deleted    = prev.find(s => s.id === id)
        const next       = prev.filter(s => s.id !== id)
        if (deleted?.is_primary && next.length > 0) {
          supabase.from('profile_specialties').update({ is_primary: true }).eq('id', next[0].id).then(() => {})
          return next.map((s, i) => ({ ...s, is_primary: i === 0 }))
        }
        return next
      })
    }
    setDeletingId(null)
  }

  const handleSetPrimary = async (id: string) => {
    const supabase  = createClient()
    const current   = specialties.find(s => s.is_primary)

    if (current) {
      await supabase.from('profile_specialties').update({ is_primary: false }).eq('id', current.id)
    }
    await supabase.from('profile_specialties').update({ is_primary: true }).eq('id', id)
    setSpecialties(prev => prev.map(s => ({ ...s, is_primary: s.id === id })))
  }

  return (
    <div className="account-card">
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '24px', lineHeight: 1.6 }}>
        Define tus especialidades escénicas. La especialidad principal aparecerá destacada en tu perfil.
        {!isPremium && (
          <>
            {' '}· Plan Gratuito: hasta {MAX_GRATUITO} especialidades.{' '}
            <Link href="/precios" style={{ color: 'var(--black)', fontWeight: 500 }}>Ampliar →</Link>
          </>
        )}
      </p>

      {/* Lista actual */}
      {specialties.length > 0 && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {specialties.map(s => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                border: s.is_primary ? '1px solid var(--black)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: s.is_primary ? 'var(--off)' : 'var(--white)',
              }}
            >
              <span style={{ flex: 1, fontSize: '14px', color: 'var(--black)', fontFamily: 'var(--sans)' }}>
                {s.specialty}
              </span>

              {s.is_primary ? (
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', flexShrink: 0 }}>
                  Principal
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(s.id)}
                  style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}
                >
                  Marcar principal
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                aria-label={`Eliminar ${s.specialty}`}
                style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario añadir */}
      {canAdd ? (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div className="ds-form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="ds-label">Nueva especialidad</label>
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              className="ds-input"
              placeholder="Dirección escénica, dramaturgia contemporánea..."
              maxLength={120}
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newText.trim()}
            className="ds-btn-primary"
            style={{ width: 'auto', padding: '10px 16px', flexShrink: 0 }}
          >
            {saving ? '...' : 'Añadir'}
          </button>
        </form>
      ) : (
        <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--off)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
            Has alcanzado el límite de {MAX_GRATUITO} especialidades del plan Gratuito.
          </p>
          <Link href="/precios" className="ds-btn-secondary" style={{ width: 'auto', display: 'inline-block', padding: '8px 16px', fontSize: '13px' }}>
            Ampliar con Premium →
          </Link>
        </div>
      )}

      {message && (
        <div style={{ marginTop: '12px' }} className={isError ? 'ds-alert-error' : 'ds-alert-success'}>
          {message}
        </div>
      )}
    </div>
  )
}
