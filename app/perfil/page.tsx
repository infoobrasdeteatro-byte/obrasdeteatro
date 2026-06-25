import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import BlockCard, { type BlockStatus } from '@/components/dashboard/BlockCard'

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

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, nombre_artistico, tipo_perfil, slug, perfil_publico, avatar_url, bio, ciudad, plan, verificado')
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

  // ── Block status calculation ──────────────────────────────────────────

  const b1: BlockStatus = (() => {
    if (!profile) return 'empty'
    if (profile.avatar_url && profile.bio && profile.ciudad) return 'complete'
    return 'partial' // nombre always present from registration
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

  const blocks: Array<{ n: number; title: string; description: string; status: BlockStatus }> = [
    { n: 1, title: 'Información Personal',    description: 'Nombre, avatar, biografía breve y ubicación geográfica',          status: b1     },
    { n: 2, title: 'Información Profesional', description: 'Biografía extensa, trayectoria y formación académica',             status: b2     },
    { n: 3, title: 'Especialidades',          description: 'Géneros y áreas de especialización escénica',                      status: 'soon' },
    { n: 4, title: 'Experiencia y Obras',     description: 'Producciones y obras publicadas en la plataforma',                 status: 'soon' },
    { n: 5, title: 'Material Audiovisual',    description: 'Foto de perfil, portada y galería de imágenes',                    status: 'soon' },
    { n: 6, title: 'Redes y Contacto',        description: 'Redes sociales y contacto profesional',                            status: 'soon' },
    { n: 7, title: 'Disponibilidad',          description: 'Disponibilidad para proyectos, giras y colaboraciones',            status: 'soon' },
    { n: 8, title: 'Documentación',           description: 'CV descargable y dossier artístico profesional',                   status: b8     },
    { n: 9, title: 'Perfil Verificado',       description: 'Solicitar verificación de identidad profesional',                  status: 'soon' },
  ]

  const applicable = blocks.filter(b => b.status !== 'soon' && b.status !== 'locked')
  const score = applicable.reduce((acc, b) => {
    if (b.status === 'complete') return acc + 1
    if (b.status === 'partial') return acc + 0.5
    return acc
  }, 0)
  const completedCount = applicable.filter(b => b.status === 'complete').length
  const pct = applicable.length > 0 ? Math.round((score / applicable.length) * 100) : 0
  const soonCount = blocks.filter(b => b.status === 'soon').length

  const nombrePublico = profile?.nombre_artistico || profile?.nombre || ''
  const tipoLabel = profile ? (TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil) : ''
  const perfilPublicoUrl = profile?.slug && profile.perfil_publico ? `/perfil/${profile.slug}` : null

  const barColor = pct >= 100 ? '#15803d' : pct >= 50 ? 'var(--black)' : '#b45309'

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          {/* ── Page header ── */}
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">Mi perfil profesional</h1>
            </div>
            {perfilPublicoUrl && (
              <Link href={perfilPublicoUrl} className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}>
                Ver perfil público →
              </Link>
            )}
          </div>

          {/* ── Identity + Progress ── */}
          <div className="account-card" style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '16px' }}>
              {nombrePublico}
              {tipoLabel && <span style={{ color: 'var(--border)', margin: '0 8px' }}>·</span>}
              {tipoLabel}
              {profile?.slug && (
                <>
                  <span style={{ color: 'var(--border)', margin: '0 8px' }}>·</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>@{profile.slug}</span>
                </>
              )}
            </p>

            <div style={{ height: '5px', borderRadius: '3px', background: 'var(--off)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.4s ease' }} />
            </div>

            <p style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
              {completedCount} de {applicable.length} bloque{applicable.length !== 1 ? 's' : ''} completado{completedCount !== 1 ? 's' : ''} · {pct}%
              {soonCount > 0 && (
                <span style={{ marginLeft: '8px', color: 'var(--border)' }}>
                  · {soonCount} bloque{soonCount !== 1 ? 's' : ''} próximamente
                </span>
              )}
            </p>
          </div>

          {/* ── Block grid ── */}
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
              />
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}
