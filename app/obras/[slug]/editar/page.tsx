import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import EditarObraForm from './EditarObraForm'

export const metadata: Metadata = {
  title: 'Editar obra | ObrasDeTeatro',
}

type Props = { params: Promise<{ slug: string }> }

export default async function EditarObraPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: obra } = await supabase
    .from('works')
    .select('*')
    .eq('slug', slug)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!obra) notFound()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Editar obra</h1>
          <a href="/mis-obras" className="text-sm text-gray-500 hover:text-black mt-1 inline-block">
            ← Mis obras
          </a>
        </div>
        <EditarObraForm obra={obra} />
      </div>
    </div>
  )
}
