import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Panel de control</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/perfil" className="bg-gray-200 text-black px-4 py-2 rounded font-medium">
              Mi perfil
            </Link>
            <form action="/auth/logout" method="POST">
              <button type="submit" className="bg-black text-white px-4 py-2 rounded font-medium">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Mi perfil</h2>
            <p className="text-gray-500 text-sm">Completa tu perfil profesional</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Mis obras</h2>
            <p className="text-gray-500 text-sm">Gestiona tus obras de teatro</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Castings</h2>
            <p className="text-gray-500 text-sm">Explora oportunidades</p>
          </div>
        </div>
      </div>
    </div>
  )
}
