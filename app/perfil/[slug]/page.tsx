import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

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

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('nombre, nombre_artistico, tipo_perfil, bio')
    .eq('slug', slug)
    .eq('perfil_publico', true)
    .single()

  if (!data) return { title: 'Perfil no encontrado — ObrasDeTeatro' }

  const nombre = data.nombre_artistico || data.nombre
  const tipo = TIPO_PERFIL_LABEL[data.tipo_perfil] ?? data.tipo_perfil

  return {
    title: `${nombre} · ${tipo} — ObrasDeTeatro`,
    description: data.bio ?? `Perfil profesional de ${nombre} en ObrasDeTeatro.com`,
  }
}

export default async function PerfilPublicoPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, apellidos, nombre_artistico, tipo_perfil, ciudad, region, pais, bio, perfil_publico, created_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!profile || !profile.perfil_publico) {
    notFound()
  }

  const nombrePublico = profile.nombre_artistico || profile.nombre
  const nombreCompleto = [profile.nombre, profile.apellidos].filter(Boolean).join(' ')
  const tipo = TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil
  const ubicacion = [profile.ciudad, profile.region, profile.pais].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-black">
          ← ObrasDeTeatro.com
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Cabecera */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400 shrink-0">
              {nombrePublico.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{nombrePublico}</h1>
              {profile.nombre_artistico && nombreCompleto !== nombrePublico && (
                <p className="text-sm text-gray-400 mt-0.5">{nombreCompleto}</p>
              )}
              <span className="inline-block mt-2 text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                {tipo}
              </span>
              {ubicacion && (
                <p className="text-sm text-gray-500 mt-2">{ubicacion}</p>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Footer de perfil */}
        <p className="text-center text-xs text-gray-400">
          Perfil en{' '}
          <Link href="/" className="underline hover:text-gray-600">ObrasDeTeatro.com</Link>
          {' '}— Ecosistema del teatro en español
        </p>
      </main>
    </div>
  )
}
