import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PerfilForm from './PerfilForm'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, nombre_artistico, bio, pais, ciudad, country_code, region, postal_code, tipo_perfil, perfil_publico, slug')
    .eq('id', user.id)
    .single()

  const perfilPublicoUrl = profile?.slug && profile.perfil_publico
    ? `/perfil/${profile.slug}`
    : null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mi perfil</h1>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mt-1 inline-block">
              ← Volver al panel
            </Link>
          </div>
          {perfilPublicoUrl && (
            <Link
              href={perfilPublicoUrl}
              className="text-sm font-medium bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
            >
              Ver perfil público →
            </Link>
          )}
        </div>
        <PerfilForm profile={profile} />
      </div>
    </div>
  )
}