import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { Database } from '@/types/supabase'
import { COUNTRIES } from '@/lib/geo/countries'
import FiltrosGeo from './FiltrosGeo'
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

export const metadata: Metadata = {
  title: 'Directorio de Profesionales del Teatro | ObrasDeTeatro®',
  description: 'Encuentra actores, directores, compañías, dramaturgos y profesionales del teatro en español.',
}

type Props = {
  searchParams: Promise<{ tipo?: string; q?: string; pais?: string; region?: string }>
}

export default async function DirectorioPage({ searchParams }: Props) {
  const { tipo, q, pais: paisParam, region: regionParam } = await searchParams

  const tipoValido: TipoPerfil | null = TIPOS_VALIDOS.includes(tipo as typeof TIPOS_VALIDOS[number])
    ? (tipo as TipoPerfil)
    : null
  const busqueda = (q?.trim() ?? '').slice(0, 100)

  const countryValido = COUNTRIES.find(c => c.code === (paisParam ?? '')) ?? null
  const paisValido = countryValido?.code ?? null
  const regionValida = (countryValido && regionParam && countryValido.regions.includes(regionParam))
    ? regionParam
    : null

  const supabase = await createClient()

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

  const { data: perfilesRaw } = await query
    .order('nombre', { ascending: true })
    .limit(500)

  // Batch enrichment — especialidades primarias + disponibilidad (3 queries total, sin N+1)
  const profileIds = (perfilesRaw ?? []).map(p => p.id)
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

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      <TopNav />

      <main style={{ maxWidth: '1060px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Cabecera */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(24px,3vw,36px)', color: 'var(--black)', letterSpacing: '-0.6px', marginBottom: '8px' }}>
            Directorio de profesionales
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 300 }}>
            Actores, directores, compañías y profesionales del teatro en español · 20 países
          </p>
        </div>

        {/* Filtros geográficos */}
        <FiltrosGeo
          paisActivo={paisValido}
          regionActiva={regionValida}
          tipoActivo={tipoValido}
          busqueda={busqueda}
        />

        {/* Buscador */}
        <form method="GET" action="/directorio" style={{ marginBottom: '20px' }}>
          {tipoValido   && <input type="hidden" name="tipo"   value={tipoValido} />}
          {paisValido   && <input type="hidden" name="pais"   value={paisValido} />}
          {regionValida && <input type="hidden" name="region" value={regionValida} />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              name="q"
              defaultValue={busqueda}
              placeholder="Buscar por nombre, especialidad..."
              style={{
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                fontSize: '13px',
                fontFamily: 'var(--sans)',
                color: 'var(--text)',
                background: 'var(--white)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--black)', color: 'var(--white)',
                padding: '10px 20px', borderRadius: 'var(--radius)',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'var(--sans)',
                border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Buscar
            </button>
            {(busqueda || tipoValido || paisValido) && (
              <Link
                href="/directorio"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  color: 'var(--muted)',
                  padding: '10px 16px', borderRadius: 'var(--radius)',
                  fontSize: '13px', flexShrink: 0, textDecoration: 'none',
                }}
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        {/* Filtros tipo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
          {FILTROS.map(filtro => {
            const isActive = filtro.value === 'todos' ? !tipoValido : tipoValido === filtro.value
            const qs = new URLSearchParams()
            if (filtro.value !== 'todos') qs.set('tipo', filtro.value)
            if (busqueda) qs.set('q', busqueda)
            if (paisValido)   qs.set('pais', paisValido)
            if (regionValida) qs.set('region', regionValida)
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
          {tipoValido   && ` · ${TIPO_PERFIL_LABEL[tipoValido] ?? tipoValido}`}
          {paisValido   && ` · ${countryValido?.name ?? paisValido}`}
          {regionValida && ` · ${regionValida}`}
          {busqueda     && ` · "${busqueda}"`}
        </p>

        {/* Estado vacío */}
        {total === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '16px' }}>
              No hay perfiles que coincidan con tu búsqueda
            </p>
            <Link href="/directorio" style={{ fontSize: '13px', color: 'var(--red)', textDecoration: 'none', fontWeight: 500 }}>
              Ver todos los perfiles
            </Link>
          </div>
        ) : (
          <div className="dir-profile-grid">
            {sorted.map(perfil => {
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
