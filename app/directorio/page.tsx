import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { Database } from '@/types/supabase'
import { COUNTRIES } from '@/lib/geo/countries'
import FiltrosDirectorio from './FiltrosDirectorio'
import TopNav from '@/components/design-system/TopNav'

type TipoPerfil = Database['public']['Enums']['tipo_perfil']

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

const FILTROS = [
  { value: 'todos',      label: 'Todos' },
  { value: 'actor',      label: 'Actor / Actriz' },
  { value: 'director',   label: 'Director/a' },
  { value: 'dramaturgo', label: 'Dramaturgo/a' },
  { value: 'compania',   label: 'Compañía' },
  { value: 'productora', label: 'Productora' },
  { value: 'teatro',     label: 'Teatro / Sala' },
  { value: 'festival',   label: 'Festival' },
  { value: 'escuela',    label: 'Escuela' },
] as const

const TIPOS_VALIDOS = FILTROS.filter(f => f.value !== 'todos').map(f => f.value)

const AVAIL_DISPLAY: Record<string, { label: string; color: string; dot: string }> = {
  disponible:              { label: 'Disponible',             color: '#166534', dot: '#22c55e' },
  buscando_trabajo:        { label: 'Buscando trabajo',       color: '#166534', dot: '#22c55e' },
  abierto_a_propuestas:    { label: 'Abierto a propuestas',   color: '#166534', dot: '#4ade80' },
  parcialmente_disponible: { label: 'Disponibilidad parcial', color: '#92400e', dot: '#f59e0b' },
}

function getFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return ''
  return countryCode.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

function extracto(bio: string | null): string | null {
  if (!bio || bio.trim().length < 25) return null
  const m = bio.match(/^.{25,120}?[.!?](?=\s|$)/)
  if (m) return m[0]
  return bio.length > 120 ? bio.slice(0, 120).trimEnd() + '…' : bio
}

const PER_PAGE = 24

type Props = {
  searchParams: Promise<{ tipo?: string; q?: string; pais?: string; region?: string; disponible?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { tipo, pais: paisParam } = await searchParams
  const tipoValido = TIPOS_VALIDOS.includes(tipo as typeof TIPOS_VALIDOS[number]) ? tipo : null
  const countryValido = COUNTRIES.find(c => c.code === (paisParam ?? '')) ?? null
  const tipoLabel = tipoValido ? TIPO_PERFIL_LABEL[tipoValido] : null
  const paisLabel = countryValido?.name ?? null

  let title = 'Directorio de Profesionales del Teatro'
  if (tipoLabel && paisLabel) title = `${tipoLabel} en ${paisLabel}`
  else if (tipoLabel) title = `${tipoLabel} de Teatro`
  else if (paisLabel) title = `Profesionales del Teatro en ${paisLabel}`

  const description = tipoLabel
    ? `Directorio de ${tipoLabel.toLowerCase()} del teatro en español. Perfiles con trayectoria, especialidad y disponibilidad en ObrasDeTeatro®.`
    : 'Encuentra actores, directores, compañías y profesionales del teatro en español. El catálogo editorial del talento teatral hispanohablante.'

  return {
    title: `${title} | ObrasDeTeatro®`,
    description,
    openGraph: {
      title: `${title} | ObrasDeTeatro®`,
      description,
    },
  }
}

export default async function DirectorioPage({ searchParams }: Props) {
  const { tipo, q, pais: paisParam, region: regionParam, disponible, page } = await searchParams

  const tipoValido: TipoPerfil | null = TIPOS_VALIDOS.includes(tipo as typeof TIPOS_VALIDOS[number])
    ? (tipo as TipoPerfil)
    : null
  const busqueda = (q?.trim() ?? '').slice(0, 100)
  const soloDisponibles = disponible === '1'
  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1)

  const countryValido = COUNTRIES.find(c => c.code === (paisParam ?? '')) ?? null
  const paisValido = countryValido?.code ?? null
  const regionValida = (countryValido && regionParam && countryValido.regions.includes(regionParam))
    ? regionParam
    : null

  const supabase = await createClient()

  // Pre-query disponibilidad si el filtro está activo
  let disponibleIds: string[] | null = null
  if (soloDisponibles) {
    const { data: availIds } = await supabase
      .from('profile_availability')
      .select('profile_id')
      .in('estado', ['disponible', 'buscando_trabajo', 'abierto_a_propuestas', 'parcialmente_disponible'])
    disponibleIds = availIds?.map(a => a.profile_id) ?? []
  }

  // Cortocircuito: filtro activo sin perfiles disponibles
  const noDisponibles = disponibleIds !== null && disponibleIds.length === 0

  let query = supabase
    .from('profiles')
    .select('id, nombre, apellidos, nombre_artistico, tipo_perfil, ciudad, region, country_code, pais, bio, slug, avatar_url, verificado, plan')
    .eq('perfil_publico', true)
    .is('deleted_at', null)
    .not('slug', 'is', null)

  if (tipoValido) query = query.eq('tipo_perfil', tipoValido)
  if (paisValido) query = query.eq('country_code', paisValido)
  if (regionValida) query = query.eq('region', regionValida)
  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,nombre_artistico.ilike.%${busqueda}%,bio.ilike.%${busqueda}%`
    )
  }
  if (disponibleIds !== null && disponibleIds.length > 0) query = query.in('id', disponibleIds)

  const { data: rawData } = noDisponibles ? { data: null } : await query
    .order('nombre', { ascending: true })
    .limit(500)

  const perfilesRaw = rawData ?? []

  // Batch enrichment — especialidades primarias + disponibilidad (3 queries total, sin N+1)
  const profileIds = perfilesRaw.map(p => p.id)
  const specMap = new Map<string, string>()
  const availMap = new Map<string, { estado: string; nota: string | null }>()

  if (profileIds.length > 0) {
    const [specsResult, availResult] = await Promise.all([
      supabase
        .from('profile_specialties')
        .select('profile_id, specialty')
        .eq('is_primary', true)
        .in('profile_id', profileIds),
      supabase
        .from('profile_availability')
        .select('profile_id, estado, nota')
        .in('profile_id', profileIds),
    ])
    for (const s of (specsResult.data ?? [])) specMap.set(s.profile_id, s.specialty)
    for (const a of (availResult.data ?? [])) {
      availMap.set(a.profile_id, { estado: a.estado as string, nota: a.nota as string | null })
    }
  }

  // Sort editorial: plan prioritario (moderado) → verificado → nombre
  const sorted = [...(perfilesRaw ?? [])].sort((a, b) => {
    const tA = (a.plan === 'destacado' || a.plan === 'empresas') ? 0 : 1
    const tB = (b.plan === 'destacado' || b.plan === 'empresas') ? 0 : 1
    if (tA !== tB) return tA - tB
    const vA = a.verificado ? 0 : 1
    const vB = b.verificado ? 0 : 1
    if (vA !== vB) return vA - vB
    return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })
  })

  const total = sorted.length
  const totalPages = Math.ceil(total / PER_PAGE)
  const offset = (pageNum - 1) * PER_PAGE
  const perfilesPagina = sorted.slice(offset, offset + PER_PAGE)

  // H1 dinámico según filtros activos
  const tipoLabel = tipoValido ? TIPO_PERFIL_LABEL[tipoValido] : null
  const paisLabel = countryValido?.name ?? null
  let h1 = 'Directorio de profesionales del teatro'
  if (tipoLabel && paisLabel) h1 = `${tipoLabel} en ${paisLabel}`
  else if (tipoLabel) h1 = `${tipoLabel} de teatro`
  else if (paisLabel) h1 = `Profesionales del teatro en ${paisLabel}`

  // JSON-LD ItemList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    numberOfItems: total,
    itemListElement: perfilesPagina.map((p, i) => ({
      '@type': 'ListItem',
      position: offset + i + 1,
      item: {
        '@type': 'Person',
        name: p.nombre_artistico || p.nombre,
        url: `https://www.obrasdeteatro.com/perfil/${p.slug}`,
      },
    })),
  }

  // Helper: construye URL conservando todos los filtros activos
  const buildPagUrl = (p: number) => {
    const qs = new URLSearchParams()
    if (tipoValido)    qs.set('tipo', tipoValido)
    if (busqueda)      qs.set('q', busqueda)
    if (paisValido)    qs.set('pais', paisValido)
    if (regionValida)  qs.set('region', regionValida)
    if (soloDisponibles) qs.set('disponible', '1')
    if (p > 1)         qs.set('page', String(p))
    return `/directorio${qs.toString() ? `?${qs.toString()}` : ''}`
  }

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <TopNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main style={{ maxWidth: '1060px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero editorial */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--red)', marginBottom: '12px',
          }}>
            ObrasDeTeatro® · Directorio Profesional
          </p>
          <h1 style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            color: 'var(--black)', letterSpacing: '-0.6px',
            lineHeight: 1.1, marginBottom: '12px',
            textTransform: 'capitalize',
          }}>
            {h1}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.65 }}>
            El escaparate del talento del teatro en español · Actores, directores, dramaturgos, compañías y más.
          </p>
        </div>

        {/* Filtros — búsqueda + geo + disponibilidad */}
        <FiltrosDirectorio
          paisActivo={paisValido}
          regionActiva={regionValida}
          tipoActivo={tipoValido}
          busqueda={busqueda}
          soloDisponibles={soloDisponibles}
        />

        {/* Filtros tipo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
          {FILTROS.map(filtro => {
            const isActive = filtro.value === 'todos' ? !tipoValido : tipoValido === filtro.value
            const qs = new URLSearchParams()
            if (filtro.value !== 'todos') qs.set('tipo', filtro.value)
            if (busqueda) qs.set('q', busqueda)
            if (paisValido)    qs.set('pais', paisValido)
            if (regionValida)  qs.set('region', regionValida)
            if (soloDisponibles) qs.set('disponible', '1')
            const href = `/directorio${qs.toString() ? `?${qs.toString()}` : ''}`
            return (
              <Link
                key={filtro.value}
                href={href}
                style={{
                  fontSize: '12px', fontWeight: 500,
                  padding: '5px 14px', borderRadius: '20px',
                  border: `1px solid ${isActive ? 'var(--black)' : 'var(--border)'}`,
                  background: isActive ? 'var(--black)' : 'var(--white)',
                  color: isActive ? 'var(--white)' : 'var(--muted)',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--sans)',
                }}
              >
                {filtro.label}
              </Link>
            )
          })}
        </div>

        {/* Contador */}
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px', letterSpacing: '0.01em' }}>
          {total === 0
            ? 'Sin resultados'
            : `${total} perfil${total === 1 ? '' : 'es'} encontrado${total === 1 ? '' : 's'}`}
          {tipoValido      && ` · ${TIPO_PERFIL_LABEL[tipoValido] ?? tipoValido}`}
          {paisValido      && ` · ${countryValido?.name ?? paisValido}`}
          {regionValida    && ` · ${regionValida}`}
          {busqueda        && ` · "${busqueda}"`}
          {soloDisponibles && ` · Solo disponibles`}
        </p>

        {/* Estado vacío / Grid */}
        {total === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: 'var(--white)', borderRadius: '12px',
            border: '1px solid var(--border)',
          }}>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: '22px', color: 'var(--black)',
              letterSpacing: '-0.2px', marginBottom: '12px',
            }}>
              Sin profesionales en esta búsqueda
            </p>
            <p style={{
              fontSize: '14px', color: 'var(--muted)', lineHeight: 1.75,
              maxWidth: '380px', margin: '0 auto 24px',
            }}>
              No hemos encontrado profesionales que coincidan con tu búsqueda.
              Prueba a modificar los filtros o descubre otras especialidades del directorio.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/directorio" style={{
                fontSize: '13px', color: 'var(--red)', fontWeight: 500,
                padding: '8px 20px', border: '1px solid rgba(200,0,26,0.25)',
                borderRadius: '20px', textDecoration: 'none',
              }}>
                Ver todos los perfiles
              </Link>
              {(tipoValido || busqueda || soloDisponibles) && (
                <Link
                  href={(() => {
                    const qs = new URLSearchParams()
                    if (paisValido)   qs.set('pais', paisValido)
                    if (regionValida) qs.set('region', regionValida)
                    return `/directorio${qs.toString() ? `?${qs.toString()}` : ''}`
                  })()}
                  style={{
                    fontSize: '13px', color: 'var(--muted)',
                    padding: '8px 20px', border: '1px solid var(--border)',
                    borderRadius: '20px', textDecoration: 'none',
                  }}
                >
                  Limpiar búsqueda
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
          <div className="dir-profile-grid">
            {perfilesPagina.map(perfil => {
              const nombrePublico = perfil.nombre_artistico || perfil.nombre
              const inicial = (nombrePublico ?? '?').charAt(0).toUpperCase()
              const label = TIPO_PERFIL_LABEL[perfil.tipo_perfil] ?? perfil.tipo_perfil
              const flag = getFlag(perfil.country_code)
              const ubicacion = perfil.ciudad
                ? `${flag ? flag + ' ' : ''}${perfil.ciudad}`
                : flag || null
              const especialidad = specMap.get(perfil.id) ?? null
              const avail = availMap.get(perfil.id) ?? null
              const availDisplay = avail ? (AVAIL_DISPLAY[avail.estado] ?? null) : null
              const bioExtracto = extracto(perfil.bio)
              const isPlan = perfil.plan === 'destacado' || perfil.plan === 'empresas'

              return (
                <Link
                  key={perfil.slug}
                  href={`/perfil/${perfil.slug}`}
                  className="dir2-card"
                >
                  {/* Cabecera: avatar + identidad */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    {perfil.avatar_url ? (
                      <Image
                        src={perfil.avatar_url}
                        alt={nombrePublico ?? ''}
                        width={64}
                        height={64}
                        className="dir2-avatar"
                      />
                    ) : (
                      <div className="dir2-avatar-initial" aria-hidden="true">
                        {inicial}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="dir2-tipo">{label}</p>
                      <h2 className="dir2-name">{nombrePublico}</h2>
                      {especialidad && <p className="dir2-spec">{especialidad}</p>}
                      {ubicacion   && <p className="dir2-loc">{ubicacion}</p>}

                      {(perfil.verificado || isPlan) && (
                        <div className="dir2-badges">
                          {perfil.verificado && (
                            <span className="dir2-badge dir2-badge--verificado">✓ Verificado</span>
                          )}
                          {perfil.plan === 'destacado' && (
                            <span className="dir2-badge dir2-badge--plan">Destacado</span>
                          )}
                          {perfil.plan === 'empresas' && (
                            <span className="dir2-badge dir2-badge--plan">Empresa</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Disponibilidad */}
                  {availDisplay && (
                    <>
                      <div className="dir2-divider" />
                      <div className="dir2-avail">
                        <span className="dir2-avail-dot" style={{ background: availDisplay.dot }} />
                        <span style={{ color: availDisplay.color }}>{availDisplay.label}</span>
                      </div>
                    </>
                  )}

                  {/* Extracto editorial */}
                  {bioExtracto && (
                    <p className="dir2-excerpt">{bioExtracto}</p>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <nav
              aria-label="Paginación del directorio"
              style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '48px', flexWrap: 'wrap' }}
            >
              {pageNum > 1 && (
                <Link href={buildPagUrl(pageNum - 1)} style={paginationStyle(false)}>
                  ← Anterior
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Link key={p} href={buildPagUrl(p)} style={paginationStyle(p === pageNum)} aria-current={p === pageNum ? 'page' : undefined}>
                  {p}
                </Link>
              ))}
              {pageNum < totalPages && (
                <Link href={buildPagUrl(pageNum + 1)} style={paginationStyle(false)}>
                  Siguiente →
                </Link>
              )}
            </nav>
          )}

          {/* Info paginación */}
          {totalPages > 1 && (
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '16px', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>
              Página {pageNum} de {totalPages} · {total} profesionales
            </p>
          )}
          </>
        )}

      </main>

      <footer className="app-footer" style={{ marginTop: '40px' }}>
        <Link href="/" className="footer-logo">
          obras<span>de</span>teatro.com
        </Link>
        <p className="footer-copy">Ecosistema del teatro en español · 20 países</p>
      </footer>
    </div>
  )
}

function paginationStyle(isActive: boolean): CSSProperties {
  return {
    fontSize: '13px', fontWeight: isActive ? 600 : 400,
    padding: '6px 14px', borderRadius: '20px',
    border: `1px solid ${isActive ? 'var(--black)' : 'var(--border)'}`,
    background: isActive ? 'var(--black)' : 'var(--white)',
    color: isActive ? 'var(--white)' : 'var(--muted)',
    textDecoration: 'none', fontFamily: 'var(--sans)',
    transition: 'all 0.15s',
  }
}
