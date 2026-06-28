import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

const IDIOMA_LABEL: Record<string, string> = {
  es: 'Español', ca: 'Catalán', eu: 'Euskera', gl: 'Gallego',
  va: 'Valenciano', en: 'Inglés', fr: 'Francés', pt: 'Portugués',
  de: 'Alemán', it: 'Italiano',
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('works')
    .select('title, synopsis, author')
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single()

  if (!data) return { title: 'Obra no encontrada | ObrasDeTeatro' }

  return {
    title: `${data.title} | ObrasDeTeatro`,
    description: data.synopsis
      ? data.synopsis.slice(0, 160)
      : `Ficha de la obra "${data.title}"${data.author ? ` de ${data.author}` : ''} en ObrasDeTeatro.`,
  }
}

export default async function ObraPublicaPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: obra } = await supabase
    .from('works')
    .select(
      'id, title, author, synopsis, genre, duration_minutes, min_age, cast_size_min, cast_size_max, language, is_published, deleted_at, created_at, profile_id'
    )
    .eq('slug', slug)
    .single()

  if (!obra || !obra.is_published || obra.deleted_at) notFound()

  const { data: perfil } = obra.profile_id
    ? await supabase.from('profiles').select('nombre, nombre_artistico, slug').eq('id', obra.profile_id).single()
    : { data: null }

  const creadorNombre = perfil?.nombre_artistico ?? perfil?.nombre ?? '—'
  const idioma = obra.language ? (IDIOMA_LABEL[obra.language] ?? obra.language) : null

  let reparto = ''
  if (obra.cast_size_min && obra.cast_size_max) {
    reparto =
      obra.cast_size_min === obra.cast_size_max
        ? `${obra.cast_size_min} personaje${obra.cast_size_min === 1 ? '' : 's'}`
        : `${obra.cast_size_min}–${obra.cast_size_max} personajes`
  } else if (obra.cast_size_min) {
    reparto = `Desde ${obra.cast_size_min} personaje${obra.cast_size_min === 1 ? '' : 's'}`
  } else if (obra.cast_size_max) {
    reparto = `Hasta ${obra.cast_size_max} personajes`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold tracking-wide text-sm text-gray-900">
            OBRASDETEATRO.COM
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/directorio" className="text-sm text-gray-500 hover:text-black">
              Directorio
            </Link>
            <Link href="/auth/login" className="text-sm text-gray-500 hover:text-black">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">

          {obra.genre && (
            <span className="inline-block text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full mb-4">
              {obra.genre}
            </span>
          )}

          <h1 className="text-4xl font-bold text-gray-900 leading-tight">{obra.title}</h1>

          {obra.author && (
            <p className="text-lg text-gray-500 mt-2">de {obra.author}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t">
            {obra.duration_minutes && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Duración</p>
                <p className="font-medium text-gray-900">{obra.duration_minutes} min</p>
              </div>
            )}
            {reparto && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reparto</p>
                <p className="font-medium text-gray-900">{reparto}</p>
              </div>
            )}
            {obra.min_age !== null && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Edad recomendada</p>
                <p className="font-medium text-gray-900">+{obra.min_age} años</p>
              </div>
            )}
            {idioma && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Idioma</p>
                <p className="font-medium text-gray-900">{idioma}</p>
              </div>
            )}
          </div>

          {obra.synopsis && (
            <div className="mt-8">
              <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-3">Sinopsis</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{obra.synopsis}</p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ficha creada por</p>
              {perfil?.slug ? (
                <Link
                  href={`/perfil/${perfil.slug}`}
                  className="text-sm font-medium text-gray-900 hover:underline"
                >
                  {creadorNombre}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-900">{creadorNombre}</span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {obra.created_at
                ? new Date(obra.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                  })
                : ''}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          <Link href="/directorio" className="underline hover:text-gray-600">
            Directorio de profesionales
          </Link>
          {' '}—{' '}
          <Link href="/" className="underline hover:text-gray-600">
            ObrasDeTeatro.com
          </Link>
        </p>
      </main>
    </div>
  )
}
