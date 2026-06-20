'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Obra = {
  id: string
  title: string
  author: string | null
  genre: string | null
  is_published: boolean | null
  created_at: string | null
  slug: string | null
}

export default function MisObrasList({ obras }: { obras: Obra[] }) {
  const router = useRouter()
  const [eliminando, setEliminando] = useState<string | null>(null)

  const handleEliminar = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return
    setEliminando(id)
    const supabase = createClient()
    await supabase
      .from('works')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setEliminando(null)
    router.refresh()
  }

  if (obras.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm">
        <p className="text-gray-400 text-lg mb-4">Todavía no has añadido ninguna obra</p>
        <Link
          href="/obras/nueva"
          className="bg-black text-white px-6 py-2.5 rounded font-medium text-sm hover:bg-gray-800"
        >
          Crear primera obra
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Título</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Autor</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Género</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Estado</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Fecha</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {obras.map(obra => (
            <tr key={obra.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px] truncate">
                {obra.title}
              </td>
              <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                {obra.author ?? '—'}
              </td>
              <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                {obra.genre ?? '—'}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                  obra.is_published
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {obra.is_published ? 'Publicada' : 'Borrador'}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-400 text-xs hidden md:table-cell">
                {obra.created_at
                  ? new Date(obra.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3 justify-end">
                  {obra.is_published && obra.slug && (
                    <Link
                      href={`/obras/${obra.slug}`}
                      className="text-xs text-gray-500 hover:text-black underline"
                    >
                      Ver
                    </Link>
                  )}
                  {obra.slug && (
                    <Link
                      href={`/obras/${obra.slug}/editar`}
                      className="text-xs text-gray-700 hover:text-black font-medium underline"
                    >
                      Editar
                    </Link>
                  )}
                  <button
                    onClick={() => handleEliminar(obra.id, obra.title)}
                    disabled={eliminando === obra.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {eliminando === obra.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
