import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import TopNav from '@/components/design-system/TopNav'
import BioExpander from './BioExpander'
import EspecialidadesChips from './EspecialidadesChips'
import TrayectoriaExpander from './TrayectoriaExpander'
import FormacionExpander from './FormacionExpander'
import PremiosExpander from './PremiosExpander'

// ── Constants ──────────────────────────────────────────────────────────────

type SocialKey = 'instagram' | 'linkedin' | 'twitter' | 'facebook' | 'tiktok' | 'youtube'
type SocialLinks = Partial<Record<SocialKey, string>>

const TIPO_PERFIL_LABEL: Record<string, string> = {
  actor:       'Actor / Actriz',
  director:    'Director/a',
  dramaturgo:  'Dramaturgo/a',
  compania:    'Compañía de teatro',
  productora:  'Productora',
  teatro:      'Teatro / Sala',
  festival:    'Festival',
  escuela:     'Escuela de artes escénicas',
  institucion: 'Institución pública',
  profesional: 'Profesional escénico',
  publico:     'Público general',
}

const SOCIAL_ORDER: SocialKey[] = ['instagram', 'linkedin', 'twitter', 'youtube', 'tiktok', 'facebook']
const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  twitter:   'X / Twitter',
  youtube:   'YouTube',
  tiktok:    'TikTok',
  facebook:  'Facebook',
}

const AVAIL_MENSAJE: Record<string, string> = {
  disponible:              'Disponible para nuevos proyectos',
  parcialmente_disponible: 'Disponible de forma puntual',
  no_disponible:           'Actualmente en producción',
  buscando_trabajo:        'Buscando proyectos activamente',
  abierto_a_propuestas:    'Abierto/a a propuestas',
}

interface AvailStyle { bg: string; color: string; dot: string }
const AVAIL_STYLE: Record<string, AvailStyle> = {
  disponible:              { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  buscando_trabajo:        { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  parcialmente_disponible: { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  abierto_a_propuestas:    { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  no_disponible:           { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
}
const AVAIL_FALLBACK: AvailStyle = { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' }

// ── Helpers ────────────────────────────────────────────────────────────────

function getFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function extractHero(bio: string | null | undefined): string | null {
  if (!bio?.trim()) return null
  const text = bio.trim()
  const m = text.match(/^.{30,160}?[.!?](?=\s|$)/)
  if (m) return m[0]
  if (text.length <= 120) return text
  const cut = text.slice(0, 120).lastIndexOf(' ')
  return text.slice(0, cut > 40 ? cut : 120) + '…'
}

function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('https://') || url.startsWith('http://') ? url : null
}

// ── Types ──────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> }

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('nombre, nombre_artistico, tipo_perfil, bio, avatar_url')
    .eq('slug', slug)
    .eq('perfil_publico', true)
    .is('deleted_at', null)
    .single()

  if (!data) return { title: 'Perfil no encontrado | ObrasDeTeatro®' }

  const nombre = data.nombre_artistico || data.nombre
  const tipo = TIPO_PERFIL_LABEL[data.tipo_perfil] ?? data.tipo_perfil
  const bio = data.bio?.trim() ?? ''
  const description = bio
    ? bio.slice(0, 155) + (bio.length > 155 ? '…' : '')
    : `Perfil profesional de ${nombre} — ${tipo} en ObrasDeTeatro.com`

  return {
    title: `${nombre} — ${tipo} | ObrasDeTeatro®`,
    description,
    alternates: { canonical: `/perfil/${slug}` },
    openGraph: {
      title: `${nombre} — ${tipo} | ObrasDeTeatro®`,
      description,
      images: data.avatar_url ? [{ url: data.avatar_url }] : [],
    },
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function PerfilPublicoPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, nombre_artistico, tipo_perfil, bio, avatar_url, ciudad, pais, country_code, plan, verificado, website_url, social_links, slug')
    .eq('slug', slug)
    .eq('perfil_publico', true)
    .is('deleted_at', null)
    .single()

  if (!profile) notFound()

  const [
    { data: specialties },
    { data: experience },
    { data: training },
    { data: awards },
    { data: availability },
  ] = await Promise.all([
    supabase
      .from('profile_specialties')
      .select('specialty, is_primary')
      .eq('profile_id', profile.id)
      .order('is_primary', { ascending: false })
      .order('specialty', { ascending: true }),
    supabase
      .from('professional_experience')
      .select('tipo, titulo, organizacion, fecha_inicio, fecha_fin, en_curso, descripcion')
      .eq('profile_id', profile.id)
      .order('en_curso', { ascending: false })
      .order('fecha_inicio', { ascending: false, nullsFirst: false }),
    supabase
      .from('profile_training')
      .select('titulo, institucion, fecha_inicio, fecha_fin, en_curso')
      .eq('profile_id', profile.id)
      .order('fecha_inicio', { ascending: false, nullsFirst: false }),
    supabase
      .from('profile_awards')
      .select('nombre, entidad, anio, descripcion')
      .eq('profile_id', profile.id)
      .order('anio', { ascending: false, nullsFirst: false }),
    supabase
      .from('profile_availability')
      .select('estado, nota')
      .eq('profile_id', profile.id)
      .maybeSingle(),
  ])

  // ── Derived values ─────────────────────────────────────────────────────

  const safeSpecialties = specialties ?? []
  const safeExperience  = experience  ?? []
  const safeTraining    = training    ?? []
  const safeAwards      = awards      ?? []

  const nombrePublico    = profile.nombre_artistico || profile.nombre
  const tipoLabel        = TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil
  const primarySpecialty = safeSpecialties.find(s => s.is_primary)?.specialty ?? null
  const flag             = getFlag(profile.country_code)
  const ubicacion        = [profile.ciudad, profile.pais].filter(Boolean).join(', ')
  const ubicacionDisplay = flag ? `${flag} ${ubicacion}` : ubicacion
  const isPremiumPlus    = profile.plan !== 'gratuito'
  const planBadge        = profile.plan === 'destacado' ? 'Destacado' : profile.plan === 'empresas' ? 'Empresa' : null
  const isVerificado     = profile.verificado === true

  const heroText = extractHero(profile.bio)
  const showHero = (profile.bio?.length ?? 0) > 280 && heroText !== null

  const safeWebsite = safeHref(profile.website_url)

  const socialLinks: SocialLinks = {}
  if (profile.social_links && typeof profile.social_links === 'object' && !Array.isArray(profile.social_links)) {
    const raw = profile.social_links as Record<string, unknown>
    for (const key of SOCIAL_ORDER) {
      if (typeof raw[key] === 'string' && raw[key]) socialLinks[key] = raw[key] as string
    }
  }
  const visibleSocials = isPremiumPlus ? SOCIAL_ORDER.filter(k => socialLinks[k]) : []

  const availMessage = availability
    ? (availability.nota?.trim() || AVAIL_MENSAJE[availability.estado] || availability.estado)
    : null
  const availStyle = availability ? (AVAIL_STYLE[availability.estado] ?? AVAIL_FALLBACK) : null

  const hasExperience = safeExperience.length > 0
  const hasFormacion  = safeTraining.length   > 0
  const hasPremios    = safeAwards.length     > 0
  const hasEZone      = hasFormacion || hasPremios

  // ── JSON-LD ────────────────────────────────────────────────────────────

  const canonicalUrl = `https://www.obrasdeteatro.com/perfil/${profile.slug}`

  const jsonLdPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nombrePublico,
    jobTitle: tipoLabel,
    url: canonicalUrl,
    ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
    ...(profile.ciudad ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: profile.ciudad,
        ...(profile.country_code ? { addressCountry: profile.country_code } : {}),
      },
    } : {}),
    ...(safeWebsite ? { sameAs: safeWebsite } : {}),
  }

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio',     item: 'https://www.obrasdeteatro.com' },
      { '@type': 'ListItem', position: 2, name: 'Directorio', item: 'https://www.obrasdeteatro.com/directorio' },
      { '@type': 'ListItem', position: 3, name: tipoLabel,    item: `https://www.obrasdeteatro.com/directorio?tipo=${profile.tipo_perfil}` },
      { '@type': 'ListItem', position: 4, name: nombrePublico },
    ],
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />

      <TopNav />

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Ruta de navegación" style={{ marginBottom: '28px' }}>
          <ol style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li>
              <Link href="/" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--sans)' }}>
                Inicio
              </Link>
            </li>
            <li aria-hidden="true" style={{ fontSize: '12px', color: 'var(--border)', padding: '0 2px' }}>›</li>
            <li>
              <Link href="/directorio" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--sans)' }}>
                Directorio
              </Link>
            </li>
            <li aria-hidden="true" style={{ fontSize: '12px', color: 'var(--border)', padding: '0 2px' }}>›</li>
            <li>
              <Link href={`/directorio?tipo=${profile.tipo_perfil}`} style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--sans)' }}>
                {tipoLabel}
              </Link>
            </li>
            <li aria-hidden="true" style={{ fontSize: '12px', color: 'var(--border)', padding: '0 2px' }}>›</li>
            <li aria-current="page" style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
              {nombrePublico}
            </li>
          </ol>
        </nav>

        {/* ── ZONA A — Cabecera ── */}
        <header style={{
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px',
          boxShadow: 'var(--shadow)', marginBottom: '40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>

            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`Foto de ${nombrePublico}`}
                  width={96}
                  height={96}
                  sizes="(max-width: 720px) 72px, 96px"
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', display: 'block' }}
                />
              ) : (
                <div className="prof-avatar-initial" aria-hidden="true">
                  {nombrePublico.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(22px, 3vw, 30px)',
                color: 'var(--black)', lineHeight: 1.15,
                letterSpacing: '-0.5px', margin: 0,
              }}>
                {nombrePublico}
              </h1>

              <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '5px', marginBottom: 0, fontFamily: 'var(--sans)' }}>
                {tipoLabel}
              </p>

              {primarySpecialty && (
                <p style={{ fontSize: '13px', color: 'var(--text)', marginTop: '3px', marginBottom: 0, fontFamily: 'var(--sans)' }}>
                  {primarySpecialty}
                </p>
              )}

              {ubicacionDisplay && (
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', marginBottom: 0, fontFamily: 'var(--sans)' }}>
                  {ubicacionDisplay}
                </p>
              )}

              {availMessage && availStyle && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '20px',
                    fontSize: '12px', fontFamily: 'var(--sans)',
                    background: availStyle.bg, color: availStyle.color,
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: availStyle.dot, flexShrink: 0,
                    }} aria-hidden="true" />
                    {availMessage}
                  </span>
                </div>
              )}

              {(isVerificado || planBadge) && (
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {isVerificado && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600, fontFamily: 'var(--sans)',
                      color: '#1d4ed8', background: '#eff6ff',
                      padding: '2px 10px', borderRadius: '20px',
                    }}>
                      ✓ Verificado
                    </span>
                  )}
                  {planBadge && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600, fontFamily: 'var(--sans)',
                      color: 'var(--black)', background: 'var(--subtle)',
                      border: '1px solid var(--border)',
                      padding: '2px 10px', borderRadius: '20px',
                    }}>
                      {planBadge}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CTA principal */}
          {safeWebsite && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', borderRadius: 'var(--radius)',
                  background: 'var(--black)', color: 'var(--white)',
                  fontSize: '13px', fontWeight: 500, fontFamily: 'var(--sans)',
                  textDecoration: 'none',
                }}
              >
                Ver web profesional →
              </a>
            </div>
          )}
        </header>

        {/* ── ZONA HERO — Extracto editorial ── */}
        {showHero && heroText && (
          <section style={{ marginBottom: '32px' }}>
            <p style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(17px, 2.2vw, 20px)',
              color: 'var(--text)', lineHeight: 1.7,
              fontStyle: 'italic', letterSpacing: '-0.1px', margin: 0,
            }}>
              {heroText}
            </p>
            <div style={{ height: '1px', background: 'var(--border)', marginTop: '24px' }} aria-hidden="true" />
          </section>
        )}

        {/* ── ZONA B — Bio ── */}
        {profile.bio && (
          <section style={{ marginBottom: '40px' }}>
            <BioExpander bio={profile.bio} />
          </section>
        )}

        {/* ── ZONA C — Especialidades ── */}
        {safeSpecialties.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 className="prof-eyebrow">Especialidades</h2>
            <EspecialidadesChips specialties={safeSpecialties} />
          </section>
        )}

        {/* ── ZONAS D + E — Trayectoria | Formación y Reconocimientos ── */}
        {(hasExperience || hasEZone) && (
          <div
            className={hasExperience && hasEZone ? 'prof-split' : undefined}
            style={{ marginBottom: '48px' }}
          >
            {hasExperience && (
              <section>
                <h2 className="prof-eyebrow">Trayectoria</h2>
                <TrayectoriaExpander entries={safeExperience} />
              </section>
            )}
            {hasEZone && (
              <section>
                {hasFormacion && (
                  <>
                    <h2 className="prof-eyebrow">Formación</h2>
                    <FormacionExpander items={safeTraining} />
                  </>
                )}
                {hasPremios && (
                  <>
                    <h2 className="prof-eyebrow" style={{ marginTop: hasFormacion ? '32px' : 0 }}>
                      Reconocimientos
                    </h2>
                    <PremiosExpander items={safeAwards} />
                  </>
                )}
              </section>
            )}
          </div>
        )}

        {/* ── ZONA OE — Obras relacionadas — RESERVADO PP2-C ── */}

        {/* ── ZONA F — Contacto ── */}
        {(safeWebsite || visibleSocials.length > 0) && (
          <section style={{ marginBottom: '48px' }}>
            <h2 className="prof-eyebrow">Contacto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {safeWebsite && (
                <a
                  href={safeWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', minWidth: '32px' }}>
                    WEB
                  </span>
                  {safeWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>↗</span>
                </a>
              )}
              {visibleSocials.map(key => {
                const url = socialLinks[key]
                const href = safeHref(url ?? null)
                if (!href) return null
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)',
                      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', minWidth: '32px' }}>
                      {key.slice(0, 3).toUpperCase()}
                    </span>
                    {SOCIAL_LABEL[key]}
                    <span style={{ color: 'var(--muted)', fontSize: '11px' }}>↗</span>
                  </a>
                )
              })}
            </div>
          </section>
        )}

      </main>

      <footer style={{
        borderTop: '1px solid var(--border)', background: 'var(--white)',
        padding: '20px 24px', textAlign: 'center',
      }}>
        <Link href="/" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--sans)' }}>
          ObrasDeTeatro.com — Ecosistema del teatro en español
        </Link>
      </footer>
    </div>
  )
}
