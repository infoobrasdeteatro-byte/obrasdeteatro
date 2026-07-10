'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram',  placeholder: 'https://instagram.com/tu_usuario' },
  { key: 'linkedin',  label: 'LinkedIn',   placeholder: 'https://linkedin.com/in/tu_usuario' },
  { key: 'twitter',   label: 'X (Twitter)', placeholder: 'https://x.com/tu_usuario' },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'https://facebook.com/tu_pagina' },
  { key: 'tiktok',    label: 'TikTok',     placeholder: 'https://tiktok.com/@tu_usuario' },
  { key: 'youtube',   label: 'YouTube',    placeholder: 'https://youtube.com/@tu_canal' },
] as const

type SocialKey = typeof SOCIAL_PLATFORMS[number]['key']
type SocialLinks = Partial<Record<SocialKey, string>>

interface Props {
  profileId: string
  plan: string
  initialWebsite: string | null
  initialSocial: SocialLinks | null
}

export default function RedesEditor({ profileId, plan, initialWebsite, initialSocial }: Props) {
  const [website, setWebsite] = useState(initialWebsite ?? '')
  const [social, setSocial]   = useState<SocialLinks>(initialSocial ?? {})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const isPremium = plan !== 'gratuito'

  const handleSocialChange = (key: SocialKey, value: string) => {
    setSocial(prev => {
      const next = { ...prev }
      if (value.trim()) {
        next[key] = value
      } else {
        delete next[key]
      }
      return next
    })
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const cleanSocial: SocialLinks = {}
    for (const [k, v] of Object.entries(social)) {
      if (v?.trim()) cleanSocial[k as SocialKey] = v.trim()
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        website_url:  website.trim() || null,
        social_links: Object.keys(cleanSocial).length > 0 ? cleanSocial : null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', profileId)

    if (error) {
      setMessage('Error al guardar: ' + error.message)
      setIsError(true)
    } else {
      setMessage('Redes actualizadas correctamente')
      setIsError(false)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleGuardar} className="account-card ds-form">
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '24px', lineHeight: 1.6 }}>
        Añade tu web profesional y redes sociales. Aparecerán en tu perfil público como enlaces de contacto.
      </p>

      {/* Web profesional — todos los planes */}
      <div className="ds-form-group">
        <label className="ds-label">Web profesional</label>
        <input
          type="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          className="ds-input"
          placeholder="https://tu-web.com"
        />
      </div>

      {/* Redes sociales — premium */}
      {isPremium ? (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <p className="ds-label" style={{ marginBottom: '16px' }}>Redes sociales</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SOCIAL_PLATFORMS.map(p => (
              <div className="ds-form-group" key={p.key} style={{ marginBottom: 0 }}>
                <label className="ds-label ds-label-sub">{p.label}</label>
                <input
                  type="url"
                  value={social[p.key] ?? ''}
                  onChange={e => handleSocialChange(p.key, e.target.value)}
                  className="ds-input"
                  placeholder={p.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: '20px',
        }}>
          <div style={{
            padding: '20px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--off)',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
              Redes sociales · Premium
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '16px' }}>
              Conecta Instagram, LinkedIn, X, YouTube y más en tu perfil profesional. Disponible a partir del plan Premium.
            </p>
            <Link
              href="/precios"
              className="ds-btn-secondary"
              style={{ width: 'auto', display: 'inline-block', padding: '8px 16px', fontSize: '13px' }}
            >
              Ver planes →
            </Link>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="ds-btn-primary">
        {loading ? 'Guardando...' : 'Guardar redes'}
      </button>

      {message && (
        <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>
          {message}
        </div>
      )}
    </form>
  )
}
