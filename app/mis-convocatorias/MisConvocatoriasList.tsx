'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EstadoPill, { AvisoEstado } from '@/components/shared/EstadoPill'
import { fecha } from '@/components/shared/formato'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'

export type ConvocatoriaPropia = {
  id: string
  title: string
  category: string | null
  location: string | null
  deadline: string | null
  estado: string
  is_featured: boolean | null
  fecha_publicacion: string | null
  motivo_filtro: string | null
  motivo_rechazo: string | null
  created_at: string | null
}

export default function MisConvocatoriasList({ convocatorias }: { convocatorias: ConvocatoriaPropia[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, string>>({})

  /**
   * Cambia el estado con la sesión del usuario y LEE LA FILA DE VUELTA: lo que
   * se enseña es lo que el servidor decidió, no lo que la interfaz pidió.
   *
   * Es la única forma honesta de mostrar un envío a publicar, porque
   * calls_sync_estado() puede reconducir a 'pendiente_revision' a quien no
   * modera, o abortar la transición con un error si el cupo mensual del plan
   * gratuito está agotado.
   */
  const cambiarEstado = async (id: string, estado: string) => {
    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })
    setResultados(p => { const s = { ...p }; delete s[id]; return s })

    const supabase = createClient()
    const { data, error } = await supabase
      .from('calls')
      .update({ estado })
      .eq('id', id)
      .select('estado')
      .single()

    setOcupado(null)

    if (error) {
      setErrores(p => ({ ...p, [id]: traducir(error.message) }))
      return
    }

    if (!data) {
      setErrores(p => ({
        ...p,
        [id]: 'La actualización no devolvió ninguna fila: no tienes permiso sobre esta convocatoria.',
      }))
      return
    }

    if (estado === 'pendiente_revision') {
      setResultados(p => ({
        ...p,
        [id]: data.estado === 'publicado'
          ? 'Publicada. Tu convocatoria ya es visible.'
          : 'En revisión. La revisará el equipo antes de publicarla.',
      }))
    }

    router.refresh()
  }

  if (convocatorias.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text">Todavía no has creado ninguna convocatoria</p>
        <Link href="/convocatoria/nueva" className="ds-btn-primary"
          style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
          Crear la primera
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {convocatorias.map(c => {
        const enCurso = ocupado === c.id
        const puedeEnviar = c.estado === 'borrador' || c.estado === 'rechazado'
                            || c.estado === 'cerrado' || c.estado === 'cancelado'

        return (
          <article key={c.id} className="account-card">

            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  {c.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {etiquetaCategoria(c.category)}
                  {c.location && ` · ${c.location}`}
                  {c.deadline && ` · hasta ${fecha(c.deadline)}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                {c.is_featured && <span className="status-pill status-pill--published">Destacada</span>}
                <EstadoPill estado={c.estado} />
              </div>
            </header>

            <div style={{ marginTop: '14px' }}>
              <AvisoEstado
                estado={c.estado}
                motivoFiltro={c.motivo_filtro}
                motivoRechazo={c.motivo_rechazo}
              />
            </div>

            {errores[c.id] && <div className="ds-alert-error" style={{ marginTop: '12px' }}>{errores[c.id]}</div>}
            {resultados[c.id] && <div className="ds-alert-success" style={{ marginTop: '12px' }}>{resultados[c.id]}</div>}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <Link href={`/convocatoria/${c.id}/editar`} className="ds-btn-secondary"
                style={{ padding: '9px 18px', fontSize: '13px' }}>
                Editar
              </Link>

              {c.estado === 'publicado' && (
                <Link href={`/convocatoria/${c.id}`} className="table-link" style={{ alignSelf: 'center' }}>
                  Ver ficha pública
                </Link>
              )}

              {puedeEnviar && (
                <button type="button" className="ds-btn-primary" disabled={enCurso}
                  style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => cambiarEstado(c.id, 'pendiente_revision')}>
                  {enCurso ? 'Enviando…' : c.estado === 'rechazado' ? 'Reenviar a revisión' : 'Enviar a publicar'}
                </button>
              )}

              {c.estado === 'publicado' && (
                <button type="button" className="ds-btn-secondary" disabled={enCurso}
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                  onClick={() => cambiarEstado(c.id, 'cerrado')}>
                  {enCurso ? '…' : 'Cerrar ahora'}
                </button>
              )}

              {c.estado !== 'cancelado' && (
                <button type="button" className="table-link table-link--danger" disabled={enCurso}
                  style={{ marginLeft: 'auto' }}
                  onClick={() => cambiarEstado(c.id, 'cancelado')}>
                  Cancelar convocatoria
                </button>
              )}
            </div>

          </article>
        )
      })}
    </div>
  )
}

/**
 * El mensaje del cupo lo redacta el propio trigger, en castellano y ya
 * explicado. Se deja pasar tal cual en vez de sustituirlo por uno peor.
 */
function traducir(mensaje: string): string {
  if (mensaje.includes('convocatorias publicadas por mes natural')) return mensaje
  if (mensaje.includes('requiere plan Destacado o Empresa')) return mensaje
  if (mensaje.includes('row-level security')) {
    return 'No tienes permiso para esta operación sobre esta convocatoria.'
  }
  return mensaje
}
