import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'
import BlockCard, { type BlockStatus } from '@/components/dashboard/BlockCard'
import { TIPOS_PERSONA, etiquetaPerfil } from '@/lib/perfiles/profesiones'
import { BLOQUE_PROFESIONES, bloquesQueCuentan, porcentajeCompleto } from '@/lib/perfiles/completitud'

// ── Label maps ────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return ''
  try {
    return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6)).join('')
  } catch {
    return ''
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // All queries in parallel — profile + new PP2-A table counts
  const [
    { data: profile },
    { count: trainingCount },
    { count: awardsCount },
    { count: specCount, data: misProfesiones },
    { count: expCount },
    { data: availability },
    { count: fotosCount },
    { count: videosCount },
    { count: portfolioCount },
    { data: verifPendiente },
    { data: rolAdmin },
    { count: solicitudesPendientes },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre, nombre_artistico, tipo_perfil, slug, perfil_publico, avatar_url, cover_url, bio, ciudad, pais, country_code, plan, verificado_profesional, updated_at, website_url, social_links')
      .eq('id', user.id)
      .single(),
    supabase.from('profile_training').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('profile_awards').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('profile_specialties').select('specialty, is_primary', { count: 'exact' }).eq('profile_id', user.id),
    supabase.from('professional_experience').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('profile_availability').select('id').eq('profile_id', user.id).maybeSingle(),
    supabase.from('perfil_galeria_fotos').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('perfil_galeria_videos').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('perfil_portfolio').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('verificaciones_profesionales').select('id').eq('profile_id', user.id).eq('estado', 'pendiente').maybeSingle(),
    supabase.from('profile_roles').select('profile_id').eq('profile_id', user.id).eq('role', 'admin').maybeSingle(),
    supabase.from('solicitudes_contacto').select('id', { count: 'exact', head: true }).eq('destinatario', user.id).eq('estado', 'pendiente'),
  ])

  // ── Block statuses ─────────────────────────────────────────────────────────

  const b1: BlockStatus = (() => {
    if (!profile) return 'empty'
    if (profile.avatar_url && profile.bio && profile.ciudad) return 'complete'
    return 'partial'
  })()

  const b2: BlockStatus = (() => {
    const hasTraining = (trainingCount ?? 0) > 0
    const hasAwards   = (awardsCount ?? 0) > 0
    if (hasTraining && hasAwards) return 'complete'
    if (hasTraining || hasAwards) return 'partial'
    return 'empty'
  })()

  const b3: BlockStatus = (specCount ?? 0) > 0 ? 'complete' : 'empty'

  const b4: BlockStatus = (expCount ?? 0) > 0 ? 'complete' : 'empty'

  const b6: BlockStatus = (() => {
    const hasWebsite = !!profile?.website_url
    const hasSocial  = profile?.social_links !== null &&
                       typeof profile?.social_links === 'object' &&
                       !Array.isArray(profile?.social_links) &&
                       Object.keys(profile.social_links as object).length > 0
    if (hasWebsite && hasSocial) return 'complete'
    if (hasWebsite || hasSocial) return 'partial'
    return 'empty'
  })()

  const b7: BlockStatus = availability ? 'complete' : 'empty'

  // B5: portada + galería, vídeos o portfolio. Solo planes de pago.
  const b5: BlockStatus = (() => {
    if (profile?.plan === 'gratuito') return 'locked'
    const tieneMaterial = (fotosCount ?? 0) + (videosCount ?? 0) + (portfolioCount ?? 0) > 0
    if (profile?.cover_url && tieneMaterial) return 'complete'
    if (profile?.cover_url || tieneMaterial) return 'partial'
    return 'empty'
  })()

  // B8: con plan de pago, los documentos ya se pueden descargar; salen
  // completos en cuanto hay biografía y experiencia o formación.
  const b8: BlockStatus = profile?.plan === 'gratuito'
    ? 'locked'
    : profile?.bio?.trim() && ((expCount ?? 0) > 0 || (trainingCount ?? 0) > 0) ? 'complete' : 'partial'
  const b9: BlockStatus = profile?.verificado_profesional ? 'verified' : verifPendiente ? 'partial' : 'empty'

  // Qué le falta para aparecer en el directorio (en este orden).
  const esPersona = (TIPOS_PERSONA as readonly string[]).includes(profile?.tipo_perfil ?? '')
  const avisoDirectorio: { texto: string; boton: string; href: string } | null =
    !profile ? null
    : profile.tipo_perfil === 'publico'
      ? { texto: 'Tu perfil es de público general y no aparece en el directorio. Si trabajas en las artes escénicas, cambia el tipo de perfil a profesional u organización.', boton: 'Cambiar tipo de perfil', href: '/perfil/bloque/1' }
    : !profile.avatar_url
      ? { texto: 'Añade una foto de perfil (o el logo, si es una organización) para aparecer en el directorio.', boton: 'Subir foto', href: '/perfil/bloque/1' }
    : esPersona && (specCount ?? 0) === 0
      ? { texto: 'Elige tus profesiones para que el directorio muestre a qué te dedicas.', boton: 'Elegir profesiones', href: '/perfil/bloque/3' }
    : null

  // Field completion for B1
  const b1Fields = {
    done:  [profile?.avatar_url, profile?.bio, profile?.ciudad].filter(Boolean).length,
    total: 3,
  }

  const blocks: Array<{
    n: number
    title: string
    description: string
    status: BlockStatus
    fields?: { done: number; total: number }
  }> = [
    { n: 1, title: 'Información Personal',    description: 'Nombre, avatar, biografía breve y ubicación',       status: b1, fields: b1Fields },
    { n: 2, title: 'Formación y Premios',     description: 'Estudios, cursos y reconocimientos profesionales',   status: b2 },
    { n: 3, title: 'Profesiones',             description: 'Las profesiones que ejerces en las artes escénicas', status: b3 },
    { n: 4, title: 'Experiencia Profesional', description: 'Trayectoria y experiencia en el sector escénico',    status: b4 },
    { n: 5, title: 'Material Audiovisual',    description: 'Portada, galería de fotos, vídeos y portfolio',      status: b5 },
    { n: 6, title: 'Redes y Contacto',        description: 'Web profesional, redes sociales y contacto',          status: b6 },
    { n: 7, title: 'Disponibilidad',          description: 'Disponibilidad para proyectos y colaboraciones',     status: b7 },
    { n: 8, title: 'Documentación',           description: 'CV descargable y dossier artístico',                 status: b8 },
    { n: 9, title: 'Perfil Verificado',       description: 'Sello de perfil profesional verificado',             status: b9 },
  ]

  // ── Progreso: solo los bloques que corresponden a esta cuenta ──────────────
  // Fuera los «próximamente», los bloqueados por el plan y Profesiones si es
  // una organización. En «Público general» no hay barra: sale el aviso de
  // cambiar el tipo de perfil.

  const tipoPerfil     = profile?.tipo_perfil ?? ''
  const mostrarBarra   = !!profile && tipoPerfil !== 'publico'
  const applicable     = bloquesQueCuentan(blocks, tipoPerfil)
  const pct            = porcentajeCompleto(applicable)
  const soonCount      = blocks.filter(b => b.status === 'soon').length

  const nextBlock  = blocks.find(b =>
    (b.status === 'empty' || b.status === 'partial') && (esPersona || b.n !== BLOQUE_PROFESIONES))
  const barColor   = pct >= 100 ? '#15803d' : pct >= 60 ? 'var(--black)' : '#b45309'

  // ── Display values ─────────────────────────────────────────────────────────

  const nombrePublico    = profile?.nombre_artistico || profile?.nombre || ''
  const tipoLabel        = profile ? etiquetaPerfil(profile.tipo_perfil, misProfesiones ?? [], TIPO_PERFIL_LABEL, !!rolAdmin) : ''
  const planInfo         = PLAN_DISPLAY[profile?.plan ?? 'gratuito'] ?? PLAN_DISPLAY.gratuito
  const flag             = flagEmoji(profile?.country_code ?? null)
  const locationFull     = [profile?.ciudad, profile?.pais].filter(Boolean).join(' · ')
  const perfilPublicoUrl = profile?.slug && profile.perfil_publico ? `/perfil/${profile.slug}` : null
  const updatedAt        = profile?.updated_at ? formatDate(profile.updated_at) : null

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <div className="account-card" style={{ marginBottom: '12px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                Mi perfil profesional
              </span>
              {perfilPublicoUrl && (
                <Link href={perfilPublicoUrl} className="ds-btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}>
                  Ver perfil público →
                </Link>
              )}
            </div>

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
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--off)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: '28px', color: 'var(--muted)' }}>
                    {nombrePublico.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: '160px' }}>
                <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(20px, 3vw, 26px)', color: 'var(--black)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px' }}>
                  {nombrePublico}
                </h1>
                {tipoLabel && (
                  <p style={{ fontSize: '14px', color: '#444444', fontFamily: 'var(--sans)', marginBottom: '8px' }}>{tipoLabel}</p>
                )}
                {locationFull && (
                  <p style={{ fontSize: '13px', color: '#444444', fontFamily: 'var(--sans)', marginBottom: '10px' }}>
                    {flag && <span style={{ marginRight: '6px' }}>{flag}</span>}
                    {locationFull}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: planInfo.color, background: planInfo.bg, padding: '3px 10px', borderRadius: '20px', fontFamily: 'var(--sans)' }}>
                    {planInfo.label}
                  </span>
                  {profile?.verificado_profesional && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', fontFamily: 'var(--sans)' }}>
                      🔵 Verificado
                    </span>
                  )}
                </div>
                {updatedAt && (
                  <p style={{ fontSize: '11px', color: '#555555', fontFamily: 'var(--sans)' }}>
                    Actualizado el {updatedAt}
                  </p>
                )}
              </div>
            </div>

            {/* Progress */}
            {mostrarBarra && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#444444', fontFamily: 'var(--sans)' }}>
                  Perfil completo al
                  {soonCount > 0 && (
                    <span style={{ color: 'var(--muted)', marginLeft: '8px' }}>· {soonCount} próximamente</span>
                  )}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: barColor, fontFamily: 'var(--sans)' }}>
                  {pct}%
                </span>
              </div>
              <div role="progressbar" aria-label="Perfil completo" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: '6px', borderRadius: '3px', background: 'var(--off)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            )}
          </div>

          {/* ── Aviso: qué falta para salir en el directorio ───────────────── */}
          {avisoDirectorio && (
            <div role="status" style={{
              background: '#fff8e6', border: '1px solid #f3d58a',
              borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
            }}>
              <p style={{ fontSize: '14px', color: '#5c4400', fontFamily: 'var(--sans)', margin: 0, lineHeight: 1.5, flex: '1 1 320px' }}>
                {avisoDirectorio.texto}
              </p>
              <Link href={avisoDirectorio.href} className="ds-btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                {avisoDirectorio.boton}
              </Link>
            </div>
          )}

          {/* ── Aviso: solicitudes de contacto pendientes (Mi red) ─────────── */}
          {(solicitudesPendientes ?? 0) > 0 && (
            <div role="status" style={{
              background: 'var(--white)', border: '1px solid var(--black)',
              borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--text)', fontFamily: 'var(--sans)', margin: 0, lineHeight: 1.5, flex: '1 1 320px' }}>
                {solicitudesPendientes === 1
                  ? 'Tienes 1 solicitud de contacto pendiente.'
                  : `Tienes ${solicitudesPendientes} solicitudes de contacto pendientes.`} Tú decides si compartes tu teléfono y tu WhatsApp.
              </p>
              <Link href="/perfil/red" className="ds-btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                Ver en Mi red
              </Link>
            </div>
          )}

          {/* ── Siguiente paso recomendado ─────────────────────────────────── */}
          {nextBlock && (
            <div style={{
              background: 'var(--white)', border: '1px solid var(--border)',
              borderLeft: '3px solid var(--black)', borderRadius: 'var(--radius)',
              padding: '16px 20px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
                  Siguiente paso recomendado
                </p>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '16px', color: 'var(--black)', letterSpacing: '-0.2px', marginBottom: '2px' }}>
                  B{nextBlock.n} · {nextBlock.title}
                </p>
                <p style={{ fontSize: '12px', color: '#444444', fontFamily: 'var(--sans)' }}>
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

          {/* ── Block grid ────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
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
