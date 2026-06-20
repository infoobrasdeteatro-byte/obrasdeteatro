import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { Database } from '@/types/supabase'

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
  searchParams: Promise<{ tipo?: string; q?: string }>
}

export default async function DirectorioPage({ searchParams }: Props) {
  const { tipo, q } = await searchParams

  const tipoValido: TipoPerfil | null = TIPOS_VALIDOS.includes(tipo as typeof TIPOS_VALIDOS[number])
    ? (tipo as TipoPerfil)
    : null
  const busqueda = (q?.trim() ?? '').slice(0, 100)

  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('nombre, apellidos, nombre_artistico, tipo_perfil, ciudad, pais, bio, slug, avatar_url, verificado')
    .eq('perfil_publico', true)
    .is('deleted_at', null)
    .not('slug', 'is', null)

  if (tipoValido) {
    query = query.eq('tipo_perfil', tipoValido)
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Navegación */}
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 tracking-wide">
            OBRASDETEATRO.COM
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/directorio" className="text-sm font-semibold text-black">
              Directorio
            </Link>
            <Link href="/auth/login" className="text-sm text-gray-500 hover:text-black">
              Iniciar sesión
            </Link>
            <Link
              href="/auth/registro"
              className="text-sm bg-black text-white px-4 py-1.5 rounded font-medium hover:bg-gray-800"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Cabecera */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Directorio de profesionales
          </h1>
          <p className="text-gray-500 mt-2">
            Encuentra actores, directores, compañías y profesionales del teatro en español
          </p>
        </div>

        {/* Buscador */}
        <form method="GET" action="/directorio" className="mb-6">
          {tipoValido && <input type="hidden" name="tipo" value={tipoValido} />}
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={busqueda}
              placeholder="Buscar por nombre o nombre artístico..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 shrink-0"
            >
              Buscar
            </button>
            {(busqueda || tipoValido) && (
              <Link
                href="/directorio"
                className="border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-100 shrink-0"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTROS.map(filtro => {
            const isActive =
              filtro.value === 'todos' ? !tipoValido : tipoValido === filtro.value
            const qs = new URLSearchParams()
            if (filtro.value !== 'todos') qs.set('tipo', filtro.value)
            if (busqueda) qs.set('q', busqueda)
            const href = `/directorio${qs.toString() ? `?${qs.toString()}` : ''}`
            return (
              <Link
                key={filtro.value}
                href={href}
                className={`text-sm px-4 py-1.5 rounded-full border font-medium transition-colors ${
                  isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                }`}
              >
                {filtro.label}
              </Link>
            )
          })}
        </div>

        {/* Contador de resultados */}
        <p className="text-sm text-gray-400 mb-6">
          {total === 0
            ? 'Sin resultados'
            : `${total} perfil${total === 1 ? '' : 'es'} encontrado${total === 1 ? '' : 's'}`}
          {tipoValido && ` · ${TIPO_PERFIL_LABEL[tipoValido] ?? tipoValido}`}
          {busqueda && ` · "${busqueda}"`}
        </p>

        {/* Estado vacío */}
        {total === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg mb-4">
              No hay perfiles que coincidan con tu búsqueda
            </p>
            <Link
              href="/directorio"
              className="text-sm underline text-gray-500 hover:text-black"
            >
              Ver todos los perfiles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all group block"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {perfil.avatar_url ? (
                      <Image
                        src={perfil.avatar_url}
                        alt={nombrePublico}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400 shrink-0 group-hover:bg-gray-200 transition-colors">
                        {inicial}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h2 className="font-semibold text-gray-900 truncate leading-tight">
                          {nombrePublico}
                        </h2>
                        {perfil.verificado && (
                          <span
                            title="Perfil verificado"
                            className="text-blue-500 shrink-0 text-xs"
                            aria-label="Verificado"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      {perfil.nombre_artistico && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{perfil.nombre}</p>
                      )}
                      <span className="inline-block mt-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                        {label}
                      </span>
                      {ubicacion && (
                        <p className="text-xs text-gray-400 mt-1.5 truncate">{ubicacion}</p>
                      )}
                    </div>
                  </div>

                  {bioCorta && (
                    <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                      {bioCorta}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t mt-16 py-8 text-center text-xs text-gray-400">
        <Link href="/" className="underline hover:text-gray-600">
          ObrasDeTeatro.com
        </Link>
        {' '}— Ecosistema del teatro en español
      </footer>
    </div>
  )
}
