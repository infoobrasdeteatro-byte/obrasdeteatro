import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAutenticado from '@/components/NavAutenticado'

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
  const tipo = profile ? (TIPO_PERFIL_LABEL[profile.tipo_perfil] ?? profile.tipo_perfil) : '—'
  const plan = profile ? (PLAN_LABEL[profile.plan] ?? profile.plan) : '—'
  const fechaRegistro = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const perfilPublicoUrl = profile?.slug && profile.perfil_publico
    ? `/perfil/${profile.slug}`
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <NavAutenticado />

      <div className="max-w-4xl mx-auto p-8">

        {/* Cabecera */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Panel de control</h1>
          <p className="text-gray-500 mt-1">{user.email}</p>
        </div>

        {/* Banner éxito tras suscripción */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
            ¡Suscripción activada correctamente! Tu plan ha sido actualizado.
          </div>
        )}

        {/* Bloque onboarding para plan gratuito */}
        {profile?.plan === 'gratuito' && (
          <div className="mb-6 bg-black text-white rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">Impulsa tu perfil profesional</h3>
              <p className="text-gray-400 text-sm">
                Aparece antes en el directorio, publica obras ilimitadas y obtén badge premium.
              </p>
            </div>
            <Link
              href="/precios"
              className="shrink-0 bg-white text-black px-5 py-2.5 rounded font-medium text-sm hover:bg-gray-100 transition-colors text-center"
            >
              Ver planes
            </Link>
          </div>
        )}

        {/* Tarjeta de cuenta */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Mi cuenta</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nombre</dt>
              <dd className="font-medium text-gray-900">{nombreMostrado}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo de perfil</dt>
              <dd className="font-medium text-gray-900">{tipo}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan</dt>
              <dd className="flex items-center gap-2">
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                  profile?.plan === 'gratuito'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {plan}
                </span>
                {profile?.plan === 'gratuito' && (
                  <Link href="/precios" className="text-xs text-gray-600 hover:text-black underline">
                    Mejorar
                  </Link>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Miembro desde</dt>
              <dd className="font-medium text-gray-900 text-sm">{fechaRegistro}</dd>
            </div>
          </dl>

          {profile?.slug && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">URL pública</span>
                <p className="font-mono text-sm mt-0.5 text-gray-700">
                  obrasdeteatro.com/perfil/{profile.slug}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  profile.perfil_publico
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {profile.perfil_publico ? 'Público' : 'Privado'}
                </span>
                {perfilPublicoUrl && (
                  <Link href={perfilPublicoUrl} className="text-sm underline text-gray-600 hover:text-black">
                    Ver →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Módulos (placeholders Sprint 2C+) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-semibold text-lg mb-1">Mi perfil</h2>
            <p className="text-gray-500 text-sm mb-4">Completa tu perfil profesional</p>
            <Link href="/perfil" className="text-sm font-medium underline text-gray-600 hover:text-black">
              Editar →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-semibold text-lg mb-1">Mis obras</h2>
            <p className="text-gray-500 text-sm mb-4">Gestiona tu catálogo de obras</p>
            <Link href="/mis-obras" className="text-sm font-medium underline text-gray-600 hover:text-black">
              Ver obras →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm opacity-60">
            <h2 className="font-semibold text-lg mb-1">Castings</h2>
            <p className="text-gray-500 text-sm">Próximamente</p>
          </div>
        </div>

      </div>
    </div>
  )
}
