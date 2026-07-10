import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'
import Sidebar from '@/components/design-system/Sidebar'

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  actor:       'Actores',
  director:    'Directores',
  dramaturgo:  'Dramaturgos',
  compania:    'Compañías',
  productora:  'Productoras',
  teatro:      'Teatros',
  festival:    'Festivales',
  escuela:     'Escuelas',
  institucion: 'Instituciones',
  profesional: 'Profesionales escénicos',
  publico:     'Público general',
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CentroProfesionalPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── Phase 1: all parallel queries ─────────────────────────────────────────
  const [
    { data: profile },
    { data: followers },
    { count: followingCount },
    { count: specCount },
    { count: expCount },
    { count: trainingCount },
    { count: awardsCount },
    { data: availability },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('nombre, nombre_artistico, tipo_perfil, bio, avatar_url, ciudad, plan, updated_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('profile_follows')
      .select('follower_id, created_at, profiles!profile_follows_follower_id_fkey(tipo_perfil)')
      .eq('following_id', user.id),
    supabase
      .from('profile_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id),
    supabase
      .from('profile_specialties')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
    supabase
      .from('professional_experience')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
    supabase
      .from('profile_training')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
    supabase
      .from('profile_awards')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
    supabase
      .from('profile_availability')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ])

  // ── Phase 2: mutual follows (requires follower list from Phase 1) ──────────
  const followerList = followers ?? []
  const followerIds  = followerList.map(f => f.follower_id)

  const mutualCount = followerIds.length > 0
    ? ((await supabase
        .from('profile_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .in('following_id', followerIds)
      ).count ?? 0)
    : 0

  // ── Derived metrics ────────────────────────────────────────────────────────
  const followerCount = followerList.length
  const now           = new Date()
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const newThisMonth  = followerList.filter(f => f.created_at >= monthStart).length

  // Follower distribution by tipo_perfil
  const distMap = new Map<string, number>()
  for (const f of followerList) {
    const p = f.profiles as { tipo_perfil: string } | null
    const tipo = p?.tipo_perfil ?? 'profesional'
    distMap.set(tipo, (distMap.get(tipo) ?? 0) + 1)
  }
  const distArr = [...distMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Last 6 months evolution
  const months = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: MESES[d.getMonth()] ?? '' }
  })
  const monthlyData = months.map(m => ({
    label: m.label,
    count: followerList.filter(f => f.created_at.startsWith(m.key)).length,
  }))
  const maxBar = Math.max(...monthlyData.map(m => m.count), 1)

  // Completeness dimensions (weighted 0-100)
  const hasAvatar         = !!profile?.avatar_url
  const hasBio            = !!(profile?.bio && profile.bio.length > 10)
  const hasCiudad         = !!profile?.ciudad
  const hasEspecialidades = (specCount   ?? 0) > 0
  const hasDisponibilidad = !!availability
  const hasTrayectoria    = (expCount    ?? 0) > 0
  const hasFormacion      = (trainingCount ?? 0) > 0
  const hasAwards         = (awardsCount  ?? 0) > 0

  const score =
    (hasAvatar        ? 15 : 0) +
    (hasBio           ? 20 : 0) +
    (hasCiudad        ? 10 : 0) +
    (hasEspecialidades? 20 : 0) +
    (hasDisponibilidad? 15 : 0) +
    (hasTrayectoria   ? 10 : 0) +
    (hasFormacion     ? 10 : 0)

  const scoreColor =
    score >= 80 ? '#166534' :
    score >= 50 ? 'var(--black)' :
    '#92400e'

  const completeness = [
    { label: 'Foto de perfil',          done: hasAvatar,          weight: 15, href: '/perfil/bloque/1' },
    { label: 'Biografía profesional',   done: hasBio,             weight: 20, href: '/perfil/bloque/1' },
    { label: 'Ciudad',                  done: hasCiudad,          weight: 10, href: '/perfil/bloque/1' },
    { label: 'Especialidades',          done: hasEspecialidades,  weight: 20, href: '/perfil/bloque/3' },
    { label: 'Disponibilidad',          done: hasDisponibilidad,  weight: 15, href: '/perfil/bloque/7' },
    { label: 'Trayectoria profesional', done: hasTrayectoria,     weight: 10, href: '/perfil/bloque/4' },
    { label: 'Formación',               done: hasFormacion,       weight: 10, href: '/perfil/bloque/2' },
  ]

  // Rule-based recommendations (sorted: high → medium → low priority)
  const recs: { text: string; desc: string; href: string; level: 1 | 2 | 3 }[] = []
  if (!hasBio)            recs.push({ text: 'Completa tu biografía',          desc: 'Una bio clara atrae directores y compañías.',                   href: '/perfil/bloque/1', level: 1 })
  if (!hasDisponibilidad) recs.push({ text: 'Actualiza tu disponibilidad',     desc: 'Imprescindible para aparecer en búsquedas de casting.',         href: '/perfil/bloque/7', level: 1 })
  if (!hasEspecialidades) recs.push({ text: 'Añade tus especialidades',        desc: 'Las especialidades definen en qué búsquedas apareces.',         href: '/perfil/bloque/3', level: 1 })
  if (!hasTrayectoria)    recs.push({ text: 'Incorpora una nueva producción',  desc: 'La trayectoria es el criterio más valorado en el directorio.',  href: '/perfil/bloque/4', level: 2 })
  if (!hasFormacion)      recs.push({ text: 'Completa tu formación',           desc: 'Formación y premios completan tu ficha profesional.',           href: '/perfil/bloque/2', level: 2 })
  if (!hasAvatar)         recs.push({ text: 'Añade una foto de perfil',        desc: 'Los perfiles con foto generan mayor presencia en el directorio.',href: '/perfil/bloque/1', level: 2 })
  if (!hasAwards)         recs.push({ text: 'Añade reconocimientos',           desc: 'Premios y distinciones refuerzan tu ficha profesional.',        href: '/perfil/bloque/2', level: 3 })
  if (!hasCiudad)         recs.push({ text: 'Indica tu ciudad',               desc: 'La ubicación activa los filtros geográficos del directorio.',   href: '/perfil/bloque/1', level: 3 })

  const nombre      = profile?.nombre_artistico || profile?.nombre || ''
  const updatedAt   = profile?.updated_at
    ? new Date(profile.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const pendientes  = completeness.filter(c => !c.done)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <NavAutenticado />
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">

          {/* ── Page header ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
              Mi cuenta
            </p>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(22px, 3vw, 28px)', color: 'var(--black)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px' }}>
              Centro Profesional
            </h1>
            {nombre && (
              <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>{nombre}</p>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MÓDULO I — IMPACTO PROFESIONAL
          ══════════════════════════════════════════════════════════════════ */}
          <ModuleCard>
            <Eyebrow>Módulo I</Eyebrow>
            <ModTitle>Impacto Profesional</ModTitle>
            <ModDesc>Cuántos profesionales del ecosistema han elegido seguirte — una señal directa de tu presencia y relevancia en ObrasDeTeatro®.</ModDesc>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', margin: '16px 0 20px' }}>
              <Metric label="Me siguen"  value={followerCount} />
              <Metric label="Este mes"   value={newThisMonth}  />
              <Metric label="Completitud" value={`${score}%`} />
            </div>

            {/* Score bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>Score de perfil</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor, fontFamily: 'var(--sans)' }}>{score}/100</span>
              </div>
              <div style={{ height: '5px', borderRadius: '3px', background: 'var(--subtle)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: '3px' }} />
              </div>
            </div>

            {/* View tracking placeholder */}
            <div style={{ background: 'var(--subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '2px' }}>
                Próximamente — PP2-E.3B
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                Seguimiento de visitas al perfil y apariciones en el directorio.
              </p>
            </div>

            <Accion>
              {score < 50
                ? 'Tu score de perfil es bajo. Cada campo completado amplía tu visibilidad en el directorio y aumenta las posibilidades de que te encuentren.'
                : score < 80
                  ? `Tu perfil está al ${score}%. Hay ${pendientes.length} dimensión${pendientes.length !== 1 ? 'es' : ''} pendiente${pendientes.length !== 1 ? 's' : ''} — completarlas aumentará tu posición en el directorio.`
                  : 'Tu perfil tiene un score alto. Mantén tu disponibilidad actualizada para conservar la máxima visibilidad en el directorio.'
              }
            </Accion>
          </ModuleCard>

          {/* ═══════════════════════════════════════════════════════════════
              MÓDULO II — RELACIONES PROFESIONALES
          ══════════════════════════════════════════════════════════════════ */}
          <ModuleCard>
            <Eyebrow>Módulo II</Eyebrow>
            <ModTitle>Relaciones Profesionales</ModTitle>
            <ModDesc>El grafo de relaciones profesionales del ecosistema. No el número — la naturaleza de quién te sigue.</ModDesc>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', margin: '16px 0 20px' }}>
              <Metric label="Me siguen"       value={followerCount}       />
              <Metric label="Yo sigo"          value={followingCount ?? 0} />
              <Metric label="Relaciones mutuas" value={mutualCount}        />
              <Metric label="Nuevas este mes"   value={newThisMonth}       />
            </div>

            {followerCount > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '12px' }}>
                  Quién me sigue
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {distArr.map(([tipo, count]) => {
                    const pct = Math.round((count / followerCount) * 100)
                    return (
                      <div key={tipo}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                            {TIPO_LABEL[tipo] ?? tipo}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                            {count} · {pct}%
                          </span>
                        </div>
                        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--black)', borderRadius: '2px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '4px' }}>
                  Aún no tienes seguidores en el ecosistema.
                </p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                  Completa tu perfil para aparecer en el directorio y comenzar a construir relaciones profesionales.
                </p>
              </div>
            )}

            <Accion>
              {followerCount === 0
                ? 'Empieza a seguir profesionales de tu sector. La presencia en el ecosistema genera reciprocidad.'
                : mutualCount > 0
                  ? `Tienes ${mutualCount} relación${mutualCount !== 1 ? 'es' : ''} mutua${mutualCount !== 1 ? 's' : ''}. El reconocimiento bilateral es una señal de relevancia dentro del ecosistema.`
                  : 'Sigue a los profesionales que ya te siguen para construir relaciones mutuas de mayor impacto profesional.'
              }
            </Accion>
          </ModuleCard>

          {/* ═══════════════════════════════════════════════════════════════
              MÓDULO III — ACTIVIDAD
          ══════════════════════════════════════════════════════════════════ */}
          <ModuleCard>
            <Eyebrow>Módulo III</Eyebrow>
            <ModTitle>Actividad</ModTitle>
            <ModDesc>El estado de tu ficha profesional en el ecosistema. Cada dimensión completada amplía tu visibilidad en el directorio.</ModDesc>

            <div style={{ margin: '16px 0 8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '40px', color: scoreColor, letterSpacing: '-1.5px', lineHeight: 1 }}>
                {score}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>/ 100 puntos</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '16px 0 20px' }}>
              {completeness.map(({ label, done, weight, href }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px',
                    background: done ? 'var(--white)' : 'var(--subtle)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${done ? '#166534' : 'var(--border)'}`,
                    borderRadius: '0 var(--radius) var(--radius) 0',
                  }}
                >
                  <span style={{
                    fontSize: '11px', width: '16px', textAlign: 'center', flexShrink: 0,
                    color: done ? '#166534' : 'var(--border)', fontWeight: 700,
                  }}>
                    {done ? '✓' : '○'}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', color: done ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--sans)' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                    {weight}pts
                  </span>
                  {!done && (
                    <Link
                      href={href}
                      style={{ fontSize: '11px', color: 'var(--black)', fontFamily: 'var(--sans)', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}
                    >
                      Completar →
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {updatedAt && (
              <p style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '16px' }}>
                Última actualización: {updatedAt}
              </p>
            )}

            <Accion>
              {pendientes.length === 0
                ? 'Todas las dimensiones completadas. Mantén tu disponibilidad actualizada para conservar el score máximo.'
                : `${pendientes.length} dimensión${pendientes.length !== 1 ? 'es' : ''} pendiente${pendientes.length !== 1 ? 's' : ''}. ${pendientes[0]?.label ?? ''} tiene el mayor impacto en tu score.`
              }
            </Accion>
          </ModuleCard>

          {/* ═══════════════════════════════════════════════════════════════
              MÓDULO IV — EVOLUCIÓN
          ══════════════════════════════════════════════════════════════════ */}
          <ModuleCard>
            <Eyebrow>Módulo IV</Eyebrow>
            <ModTitle>Evolución</ModTitle>
            <ModDesc>Crecimiento de relaciones profesionales mes a mes. Histórico disponible desde el primer seguimiento en el ecosistema.</ModDesc>

            <div style={{ margin: '20px 0' }}>
              {followerCount === 0 ? (
                <div style={{ background: 'var(--subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                    Los datos de evolución comenzarán a acumularse con el primer seguidor.
                  </p>
                </div>
              ) : (
                <div>
                  {/* SVG bar chart — 6 months */}
                  <svg
                    viewBox="0 0 324 80"
                    preserveAspectRatio="xMidYMid meet"
                    width="100%"
                    style={{ maxWidth: '380px', display: 'block', overflow: 'visible' }}
                    aria-label="Evolución de relaciones profesionales por mes"
                    role="img"
                  >
                    {monthlyData.map((m, i) => {
                      const barH   = m.count > 0 ? Math.max(Math.round((m.count / maxBar) * 54), 6) : 2
                      const x      = i * 54 + 2
                      const isLast = i === monthlyData.length - 1
                      return (
                        <g key={m.label}>
                          <rect
                            x={x} y={58 - barH} width={44} height={barH} rx={3}
                            style={{ fill: isLast ? '#0a0a0a' : '#e8e8e8' }}
                          />
                          <text
                            x={x + 22} y={75}
                            textAnchor="middle"
                            style={{ fontSize: '9px', fill: isLast ? '#0a0a0a' : '#9ca3af', fontFamily: 'monospace' }}
                          >
                            {m.label}
                          </text>
                          {m.count > 0 && (
                            <text
                              x={x + 22} y={54 - barH}
                              textAnchor="middle"
                              style={{ fontSize: '9px', fill: isLast ? '#0a0a0a' : '#9ca3af', fontFamily: 'monospace' }}
                            >
                              {m.count}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </svg>

                  {/* View tracking coming soon */}
                  <p style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: '12px' }}>
                    La evolución de visitas al perfil estará disponible en PP2-E.3B.
                  </p>
                </div>
              )}
            </div>

            <Accion>
              {followerCount === 0
                ? 'Completa tu perfil para aparecer en el directorio y comenzar a construir tu historial de relaciones.'
                : newThisMonth > 0
                  ? `+${newThisMonth} relación${newThisMonth !== 1 ? 'es' : ''} este mes. Mantén tu perfil actualizado para sostener el crecimiento.`
                  : 'Sin nuevas relaciones este mes. Actualiza tu disponibilidad o añade especialidades para ganar visibilidad en el directorio.'
              }
            </Accion>
          </ModuleCard>

          {/* ═══════════════════════════════════════════════════════════════
              MÓDULO V — RECOMENDACIONES
          ══════════════════════════════════════════════════════════════════ */}
          <ModuleCard>
            <Eyebrow>Módulo V</Eyebrow>
            <ModTitle>Recomendaciones</ModTitle>
            <ModDesc>Acciones concretas para mejorar tu presencia en el ecosistema. Ordenadas por impacto en tu visibilidad y score de perfil.</ModDesc>

            <div style={{ margin: '16px 0 20px' }}>
              {recs.length === 0 ? (
                <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>✓</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#166534', fontFamily: 'var(--sans)', marginBottom: '2px' }}>
                      Perfil completo
                    </p>
                    <p style={{ fontSize: '12px', color: '#166534', fontFamily: 'var(--sans)' }}>
                      Has completado todas las dimensiones recomendadas. Mantén tu disponibilidad actualizada.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recs.map(rec => (
                    <div
                      key={rec.text}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '12px 14px',
                        background: rec.level === 1 ? 'rgba(200,0,26,0.03)' : 'var(--subtle)',
                        border: `1px solid ${rec.level === 1 ? 'rgba(200,0,26,0.15)' : 'var(--border)'}`,
                        borderLeft: `3px solid ${rec.level === 1 ? 'var(--red)' : rec.level === 2 ? 'var(--black)' : 'var(--border)'}`,
                        borderRadius: '0 var(--radius) var(--radius) 0',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--black)', fontFamily: 'var(--sans)', marginBottom: '2px' }}>
                          {rec.text}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                          {rec.desc}
                        </p>
                      </div>
                      <Link
                        href={rec.href}
                        style={{ fontSize: '12px', color: 'var(--black)', fontFamily: 'var(--sans)', textDecoration: 'none', fontWeight: 600, flexShrink: 0, paddingTop: '1px' }}
                      >
                        Ir →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ScenaIA bridge note */}
            <div style={{ padding: '12px 16px', background: 'var(--subtle)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5b21b6', fontFamily: 'var(--mono)', marginBottom: '2px' }}>
                Fase 4 · ScenaIA
              </p>
              <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                En la Fase 4, ScenaIA sustituirá progresivamente estas reglas por recomendaciones personalizadas basadas en el grafo de relaciones del ecosistema.
              </p>
            </div>
          </ModuleCard>

          {/* ═══════════════════════════════════════════════════════════════
              MÓDULO VI — SCENAIA (RESERVADO)
          ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '12px',
              opacity: 0.65,
            }}
          >
            <p style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#5b21b6',
              fontFamily: 'var(--mono)', marginBottom: '6px',
            }}>
              Módulo VI · ScenaIA · Fase 4
            </p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.4px', marginBottom: '8px' }}>
              Recomendaciones inteligentes
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.7, maxWidth: '560px' }}>
              ScenaIA está aprendiendo del ecosistema. Pronto tendrá recomendaciones específicas para tu perfil basadas en el grafo de relaciones profesionales, los patrones de actividad del sector y los datos de casting.
            </p>
          </div>

        </main>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ModuleCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderTop: '3px solid var(--black)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      marginBottom: '12px',
    }}>
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--red)',
      fontFamily: 'var(--mono)', marginBottom: '6px',
    }}>
      {children}
    </p>
  )
}

function ModTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)',
      letterSpacing: '-0.4px', marginBottom: '4px',
    }}>
      {children}
    </h2>
  )
}

function ModDesc({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)',
      lineHeight: 1.7, maxWidth: '600px',
    }}>
      {children}
    </p>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      background: 'var(--subtle)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '12px 14px',
    }}>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: '28px', color: 'var(--black)',
        letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
        {label}
      </div>
    </div>
  )
}

function Accion({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '2px solid var(--black)', paddingTop: '12px' }}>
      <p style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--muted)',
        fontFamily: 'var(--sans)', marginBottom: '4px',
      }}>
        Acción recomendada
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.65 }}>
        {children}
      </p>
    </div>
  )
}
