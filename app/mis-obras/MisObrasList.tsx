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
      <div className="obras-empty">
        <p className="obras-empty-text">Todavía no has añadido ninguna obra</p>
        <Link href="/obras/nueva" className="ds-btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
          Crear primera obra
        </Link>
      </div>
    )
  }

  return (
    <div className="obras-table-wrap">
      <table className="obras-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Autor</th>
            <th>Género</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {obras.map(obra => (
            <tr key={obra.id}>
              <td>
                <span className="obras-table-title">{obra.title}</span>
              </td>
              <td className="obras-table-meta">{obra.author ?? '—'}</td>
              <td className="obras-table-meta">{obra.genre ?? '—'}</td>
              <td>
                <span className={`status-pill ${obra.is_published ? 'status-pill--published' : 'status-pill--draft'}`}>
                  {obra.is_published ? 'Publicada' : 'Borrador'}
                </span>
              </td>
              <td className="obras-table-date">
                {obra.created_at
                  ? new Date(obra.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </td>
              <td>
                <div className="obras-table-actions">
                  {obra.is_published && obra.slug && (
                    <Link href={`/obras/${obra.slug}`} className="table-link">
                      Ver
                    </Link>
                  )}
                  {obra.slug && (
                    <Link href={`/obras/${obra.slug}/editar`} className="table-link" style={{ fontWeight: 500 }}>
                      Editar
                    </Link>
                  )}
                  <button
                    onClick={() => handleEliminar(obra.id, obra.title)}
                    disabled={eliminando === obra.id}
                    className={`table-link table-link--danger ${eliminando === obra.id ? 'table-link--disabled' : ''}`}
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
