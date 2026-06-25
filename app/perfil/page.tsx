import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import BlockCard, { type BlockStatus } from '@/components/dashboard/BlockCard'

// ── Label maps ──────────────────────────────────────────────────────────────

const TIPO_PERFIL_LABEL: Record<string, string> = {
  actor:        'Actor / Actriz',
  director:     'Director/a',
  dramaturgo:   'Dramaturgo/a',
  compania:     'Compañía de teatro',
  productora:   'Productora',
  teatro:       'Teatro / Sala',
  festival:     'Festival',
  escuela:      'Escuela de artes escénicas',
  institucion:  'Institución pública',
  profesional:  'Profesional escénico',
  publico:      'Público general',
}

const PLAN_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  gratuito:  { label: 'Gratuito',  color: '#6b7280', bg: '#f3f4f6' },
  premium:   { label: 'Premium',   color: '#1d4ed8', bg: '#eff6ff' },
  destacado: { label: 'Destacado', color: '#b45309', bg: '#fef3c7' },
  empresas:  { label: 'Empresas',  color: '#6d28d9', bg: '#f5f3ff' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return ''
  try {
    return code
      .toUpperCase()
      .split('')
      .map(c => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6))
      .join('')
  } catch {
    return ''
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, nombre_artistico, tipo_perfil, slug, perfil_publico, avatar_url, bio, ciudad, pais, country_code, plan, verificado, updated_at')
    .eq('id', user.id)
    .single()

  let directorData: {
    biografia: string | null
    trayectoria: string | null
    formacion: string | null
  } | null = null

  if (profile?.tipo_perfil === 'director') {
    const { data } = await supabase
      .from('perfil_director')
      .select('biografia, trayectoria, formacion')
      .eq('user_id', user.id)
      .maybeSingle()
    directorData = data
  }

  // ── Block statuses ───────────────────────────────────────────────────────

  const b1: BlockStatus = (() => {
    if (!profile) return 'empty'
    if (profile.avatar_url && profile.bio && profile.ciudad) return 'complete'
    return 'partial'
  })()

  const b2: BlockStatus = (() => {
    if (!profile) return 'empty'
    if (profile.tipo_perfil !== 'director') return 'soon'
    if (!directorData) return 'empty'
    const n = [directorData.biografia, directorData.trayectoria, directorData.formacion].filter(Boolean).length
    if (n === 0) return 'empty'
    if (n === 3) return 'complete'
    return 'partial'
  })()

  const b8: BlockStatus = profile?.plan === 'gratuito' ? 'locked' : 'soon'
  const b9: BlockStatus = profile?.verificado ? 'verified' : 'soon'

  // Field completion counts for implemented blocks
  const b1Fields = {
    done: [profile?.avatar_url, profile?.bio, profile?.ciudad].filter(Boolean).length,
    total: 3,
  }
  const b2Fields = profile?.tipo_perfil === 'director' && directorData
    ? {
        done: [directorData.biografia, directorData.trayectoria, directorData.formacion].filter(Boolean).length,
        total: 3,
      }
    : undefined

  const blocks: Array<{
    n: number
    title: string
    description: string
    status: BlockStatus
    fields?: { done: number; total: number }
  }> = [
    { n: 1, title: 'Información Personal',    description: 'Nombre, avatar, biografía breve y ubicación',    status: b1, fields: b1Fields },
    { n: 2, title: 'Información Profesional', description: 'Biografía extensa, trayectoria y formación',     status: b2, fields: b2Fields },
    { n: 3, title: 'Especialidades',          description: 'Géneros y áreas de especialización escénica',    status: 'soon' },
    { n: 4, title: 'Experiencia y Obras',     description: 'Producciones y obras publicadas',               status: 'soon' },
    { n: 5, title: 'Material Audiovisual',    description: 'Foto de perfil, portada y galería',             status: 'soon' },
    { n: 6, title: 'Redes y Contacto',        description: 'Redes sociales y contacto profesional',         status: 'soon' },
    { n: 7, title: 'Disponibilidad',          description: 'Disponibilidad para proyectos y colaboraciones', status: 'soon' },
    { n: 8, title: 'Documentación',           description: 'CV descargable y dossier artístico',            status: b8 },
    { n: 9, title: 'Perfil Verificado',       description: 'Verificación de identidad profesional',         status: b9 },
  ]

  // ── Progress calculation (exclude 'soon') ────────────────────────────────

  const applicable = blocks.filter(b => b.status !== 'soon')
  const score = applicable.reduce((acc, b) => {
    if (b.status === 'complete' || b.status === 'verified') return acc + 1
    if (b.status === 'partial') return acc + 0.5
    return acc
  }, 0)
  const completedCount = applicable.filter(b => b.status === 'complete' || b.status === 'verified').length
  const pct = applicable.length > 0 ? Math.round((score / applicable.length) * 100) : 0
  const soonCount = blocks.filter(b => b.status === 'soon').length

  // ── Recommendation: first actionable incomplete block ────────────────────

  const nextBlock = blocks.find(b => b.status === 'empty' || b.status === 'partial')

  // ── Display values ───────────────────────────────────────────────────────

  const nombrePublico = profile?.nombre_artistico || profile?.nombre || ''
  const tipoLabel = profile ? (TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil) : ''
  const planInfo = PLAN_DISPLAY[profile?.plan ?? 'gratuito'] ?? PLAN_DISPLAY.gratuito
  const flag = flagEmoji(profile?.country_code ?? null)
  const locationFull = [profile?.ciudad, profile?.pais].filter(Boolean).join(' · ')
  const perfilPublicoUrl = profile?.slug && profile.perfil_publico ? `/perfil/${profile.slug}` : null
  const updatedAt = profile?.updated_at ? formatDate(profile.updated_at) : null
  const barColor = pct >= 100 ? '#15803d' : pct >= 60 ? 'var(--black)' : '#b45309'

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <div className="account-card" style={{ marginBottom: '12px' }}>

            {/* Label + action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)',
              }}>
                Mi perfil profesional
              </span>
              {perfilPublicoUrl && (
                <Link href={perfilPublicoUrl} className="ds-btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
                  Ver perfil público →
                </Link>
              )}
            </div>

            {/* Identity */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div style={{ flexShrink: 0 }}>
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={`Foto de ${nombrePublico}`}
                    width={80}
                    height={80}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--off)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--serif)', fontSize: '28px', color: 'var(--muted)',
                  }}>
                    {nombrePublico.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: '160px' }}>
                <h1 style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(20px, 3vw, 26px)',
                  color: 'var(--black)',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                  marginBottom: '4px',
                }}>
                  {nombrePublico}
                </h1>

                {tipoLabel && (
                  <p style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '8px' }}>
                    {tipoLabel}
                  </p>
                )}

                {locationFull && (
                  <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '10px' }}>
                    {flag && <span style={{ marginRight: '6px' }}>{flag}</span>}
                    {locationFull}
                  </p>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600,
                    color: planInfo.color, background: planInfo.bg,
                    padding: '3px 10px', borderRadius: '20px', fontFamily: 'var(--sans)',
                  }}>
                    {planInfo.label}
                  </span>
                  {profile?.verificado && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: '#1d4ed8', background: '#eff6ff',
                      padding: '3px 10px', borderRadius: '20px', fontFamily: 'var(--sans)',
                    }}>
                      🔵 Verificado
                    </span>
                  )}
                </div>

                {updatedAt && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                    Actualizado el {updatedAt}
                  </p>
                )}
              </div>
            </div>

            {/* Progress */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                  {completedCount} de {applicable.length} bloque{applicable.length !== 1 ? 's' : ''} completado{completedCount !== 1 ? 's' : ''}
                  {soonCount > 0 && (
                    <span style={{ color: 'var(--border)', marginLeft: '8px' }}>· {soonCount} próximamente</span>
                  )}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: barColor, fontFamily: 'var(--sans)' }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--off)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: barColor, borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          </div>

          {/* ── Siguiente paso recomendado ──────────────────────────────── */}
          {nextBlock && (
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--black)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--muted)',
                  fontFamily: 'var(--sans)', marginBottom: '4px',
                }}>
                  Siguiente paso recomendado
                </p>
                <p style={{
                  fontFamily: 'var(--serif)', fontSize: '16px',
                  color: 'var(--black)', letterSpacing: '-0.2px', marginBottom: '2px',
                }}>
                  B{nextBlock.n} · {nextBlock.title}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                  {nextBlock.description}
                </p>
              </div>
              {nextBlock.status !== 'locked' && (
                <Link
                  href={`/perfil/bloque/${nextBlock.n}`}
                  className="ds-btn-primary"
                  style={{ width: 'auto', padding: '9px 18px', fontSize: '13px', flexShrink: 0 }}
                >
                  {nextBlock.status === 'partial' ? 'Continuar' : 'Completar'} →
                </Link>
              )}
            </div>
          )}

          {/* ── Block grid ───────────────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '10px',
          }}>
            {blocks.map(b => (
              <BlockCard
                key={b.n}
                number={b.n}
                title={b.title}
                description={b.description}
                status={b.status}
                href={`/perfil/bloque/${b.n}`}
                fields={b.fields}
              />
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}
