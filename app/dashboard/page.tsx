import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

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

const PLAN_LABEL: Record<string, string> = {
  gratuito:  'Gratis',
  premium:   'Premium',
  destacado: 'Destacado',
  empresas:  'Empresas',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const showSuccess = !!params.success

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, apellidos, tipo_perfil, plan, slug, perfil_publico, created_at, is_premium')
    .eq('id', user.id)
    .single()

  const nombreMostrado = profile?.nombre ?? user.email ?? '—'
  const tipo  = profile ? (TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil) : '—'
  const plan  = profile ? (PLAN_LABEL[profile.plan] ?? profile.plan) : '—'
  const fechaRegistro = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const perfilPublicoUrl = profile?.slug && profile.perfil_publico
    ? `/perfil/${profile.slug}`
    : null
  const isPremium = !!profile?.is_premium

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />

      <div className="app-layout">
        <Sidebar />

        <main className="app-main">

          {/* ── Welcome bar ── */}
          <div className="welcome-bar">
            <div className="welcome-text">
              <h2>
                Bienvenido, <em>{nombreMostrado.split(' ')[0]}</em>
              </h2>
              <p>{user.email}</p>
            </div>
            <Link href="/mis-obras/nueva" className="btn-add">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva obra
            </Link>
          </div>

          {/* ── Banner éxito ── */}
          {showSuccess && (
            <div className="success-banner">
              ¡Suscripción activada correctamente! Tu plan ha sido actualizado.
            </div>
          )}

          {/* ── Onboarding banner (plan gratuito) ── */}
          {profile?.plan === 'gratuito' && (
            <div className="onboarding-banner">
              <div>
                <h3>Impulsa tu perfil profesional</h3>
                <p>Aparece antes en el directorio, publica obras ilimitadas y obtén badge premium.</p>
              </div>
              <Link href="/precios" className="btn-onboarding">Ver planes</Link>
            </div>
          )}

          {/* ── Stat cards ── */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{tipo !== '—' ? tipo.split(' ')[0] : '—'}</div>
              <div className="stat-label">Tipo de perfil</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontFamily: 'var(--sans)', fontSize: '18px', fontWeight: 500 }}>
                <span className={`plan-badge ${isPremium ? 'plan-badge--paid' : 'plan-badge--free'}`}>{plan}</span>
              </div>
              <div className="stat-label" style={{ marginTop: '10px' }}>Plan activo</div>
              {!isPremium && (
                <Link href="/precios" className="stat-link">
                  Mejorar plan →
                </Link>
              )}
            </div>
            <div className="stat-card">
              <div className="stat-value">
                <span className={`visibility-badge ${profile?.perfil_publico ? 'visibility-badge--public' : 'visibility-badge--private'}`}>
                  {profile?.perfil_publico ? 'Público' : 'Privado'}
                </span>
              </div>
              <div className="stat-label" style={{ marginTop: '10px' }}>Visibilidad del perfil</div>
              <Link href="/perfil" className="stat-link">
                Editar perfil →
              </Link>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: '13px', fontFamily: 'var(--sans)', fontWeight: 400, color: 'var(--muted)', lineHeight: 1.4 }}>
                {fechaRegistro}
              </div>
              <div className="stat-label" style={{ marginTop: '8px' }}>Miembro desde</div>
            </div>
          </div>

          {/* ── URL pública ── */}
          {profile?.slug && (
            <div className="account-card" style={{ marginBottom: '20px' }}>
              <div className="account-slug-row" style={{ padding: 0 }}>
                <div>
                  <div className="account-slug-label">URL pública de tu perfil</div>
                  <div className="account-slug-url">obrasdeteatro.com/perfil/{profile.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className={`visibility-badge ${profile.perfil_publico ? 'visibility-badge--public' : 'visibility-badge--private'}`}>
                    {profile.perfil_publico ? 'Público' : 'Privado'}
                  </span>
                  {perfilPublicoUrl && (
                    <Link href={perfilPublicoUrl} style={{ fontSize: '13px', color: 'var(--red)', textDecoration: 'none', fontWeight: 500 }}>
                      Ver →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Módulos ── */}
          <div className="dash-sec-header">
            <span className="dash-sec-title">Mis módulos</span>
          </div>
          <div className="modules-grid">
            <div className="module-card">
              <div className="module-card-title">Mi perfil</div>
              <p className="module-card-desc">Completa y personaliza tu perfil profesional visible en el directorio.</p>
              <Link href="/perfil" className="module-card-link">Editar perfil →</Link>
            </div>
            <div className="module-card">
              <div className="module-card-title">Mis obras</div>
              <p className="module-card-desc">Gestiona tu catálogo de obras teatrales y controla su visibilidad.</p>
              <Link href="/mis-obras" className="module-card-link">Ver obras →</Link>
            </div>
            <div className="module-card" style={{ opacity: 0.55 }}>
              <div className="module-card-title">Convocatorias</div>
              <p className="module-card-desc">Casting, residencias y festivales. Disponible próximamente.</p>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Próximamente</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
