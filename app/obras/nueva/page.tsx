import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import NuevaObraForm from './NuevaObraForm'

export const metadata: Metadata = {
  title: 'Nueva obra | ObrasDeTeatro',
}

export default async function NuevaObraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Nueva obra</h1>
          <a href="/mis-obras" className="text-sm text-gray-500 hover:text-black mt-1 inline-block">
            ← Mis obras
          </a>
        </div>
        <NuevaObraForm userId={user.id} />
      </div>
    </div>
  )
}
