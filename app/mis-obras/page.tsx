import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import MisObrasList from './MisObrasList'

export const metadata: Metadata = {
  title: 'Mis obras | ObrasDeTeatro',
}

export default async function MisObrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: obras } = await supabase
    .from('works')
    .select('id, title, author, genre, is_published, created_at, slug')
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const lista = obras ?? []
  const total = lista.length
  const publicadas = lista.filter(o => o.is_published).length
  const borradores = total - publicadas

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mis obras</h1>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mt-1 inline-block">
              ← Volver al panel
            </Link>
          </div>
          <Link
            href="/obras/nueva"
            className="bg-black text-white px-5 py-2.5 rounded font-medium text-sm hover:bg-gray-800"
          >
            + Nueva obra
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-3xl font-bold mt-1">{total}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Publicadas</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{publicadas}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Borradores</p>
            <p className="text-3xl font-bold text-amber-500 mt-1">{borradores}</p>
          </div>
        </div>

        <MisObrasList obras={lista} />

      </div>
    </div>
  )
}
