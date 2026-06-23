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

export const metadata: Metadata = {
  title: 'Directorio de Profesionales del Teatro | ObrasDeTeatro',
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
    .select('nombre, apellidos, nombre_artistico, tipo_perfil, ciudad, region, country_code, pais, bio, slug, avatar_url, verificado')
    .eq('perfil_publico', true)
    .is('deleted_at', null)
    .not('slug', 'is', null)

  if (tipoValido) query = query.eq('tipo_perfil', tipoValido)
  if (paisValido) query = query.eq('country_code', paisValido)
  if (regionValida) query = query.eq('region', regionValida)
  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,nombre_artistico.ilike.%${busqueda}%,slug.ilike.%${busqueda}%`
    )
  }

  const { data: perfiles } = await query
    .order('nombre', { ascending: true })
    .limit(60)

  const total = perfiles?.length ?? 0

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
          {tipoValido  && <input type="hidden" name="tipo"   value={tipoValido} />}
          {paisValido  && <input type="hidden" name="pais"   value={paisValido} />}
          {regionValida && <input type="hidden" name="region" value={regionValida} />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              name="q"
              defaultValue={busqueda}
              placeholder="Buscar por nombre o nombre artístico..."
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
                transition: 'border-color 0.15s',
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--black)', color: 'var(--white)',
                padding: '10px 20px', borderRadius: 'var(--radius)',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'var(--sans)',
                border: 'none', cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
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
                  transition: 'background 0.15s',
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
            {perfiles!.map(perfil => {
              const nombrePublico = perfil.nombre_artistico || perfil.nombre
              const inicial = nombrePublico.charAt(0).toUpperCase()
              const label = TIPO_PERFIL_LABEL[perfil.tipo_perfil] ?? perfil.tipo_perfil
              const ubicacion = [perfil.ciudad, perfil.pais].filter(Boolean).join(', ')
              const bioCorta = perfil.bio && perfil.bio.length > 110
                ? perfil.bio.slice(0, 110) + '…'
                : perfil.bio

              return (
                <Link
                  key={perfil.slug}
                  href={`/perfil/${perfil.slug}`}
                  className="dir-profile-card"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    {perfil.avatar_url ? (
                      <Image
                        src={perfil.avatar_url}
                        alt={nombrePublico}
                        width={44}
                        height={44}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'var(--subtle)',
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--serif)',
                        fontSize: '18px', color: 'var(--muted)',
                        flexShrink: 0,
                      }}>
                        {inicial}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nombrePublico}
                        </h2>
                        {perfil.verificado && (
                          <span title="Perfil verificado" style={{ color: '#2563eb', fontSize: '11px', flexShrink: 0 }} aria-label="Verificado">✓</span>
                        )}
                      </div>
                      {perfil.nombre_artistico && (
                        <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {perfil.nombre}
                        </p>
                      )}
                      <span style={{
                        display: 'inline-block', marginTop: '6px',
                        fontSize: '11px', fontWeight: 500,
                        background: 'var(--subtle)',
                        color: 'var(--muted)',
                        padding: '2px 10px', borderRadius: '20px',
                      }}>
                        {label}
                      </span>
                      {ubicacion && (
                        <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ubicacion}
                        </p>
                      )}
                    </div>
                  </div>

                  {bioCorta && (
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '12px', lineHeight: '1.65', fontWeight: 300 }}>
                      {bioCorta}
                    </p>
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
