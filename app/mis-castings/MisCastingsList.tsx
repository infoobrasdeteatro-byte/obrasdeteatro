'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EstadoPill, { AvisoEstado } from '@/components/shared/EstadoPill'

export type CastingPropio = {
  id: string
  titulo: string
  nombre_proyecto: string
  estado: string
  fecha_apertura: string
  fecha_cierre: string
  created_at: string
  motivo_filtro: string | null
  motivo_rechazo: string | null
}

function fecha(valor: string): string {
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MisCastingsList({ castings }: { castings: CastingPropio[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, string>>({})

  /**
   * Cambia el estado con la sesión del usuario y lee la fila DE VUELTA: lo que
   * se enseña es lo que el servidor decidió, no lo que la interfaz pidió. Es
   * la única forma honesta de mostrar un envío a publicar, porque el trigger
   * puede devolverlo a revisión o abortar por cupo.
   */
  const cambiarEstado = async (id: string, estado: string) => {
    setOcupado(id)
    setErrores(p => { const s = { ...p }; delete s[id]; return s })
    setResultados(p => { const s = { ...p }; delete s[id]; return s })

    const supabase = createClient()
    const { data, error } = await supabase
      .from('castings')
      .update({ estado })
      .eq('id', id)
      .select('estado, motivo_filtro')
      .single()

    setOcupado(null)

    if (error) {
      setErrores(p => ({ ...p, [id]: traducir(error.message) }))
      return
    }

    if (!data) {
      setErrores(p => ({ ...p, [id]: 'La actualización no devolvió ninguna fila: no tienes permiso sobre este casting.' }))
      return
    }

    if (estado === 'pendiente_revision') {
      setResultados(p => ({
        ...p,
        [id]: data.estado === 'publicado'
          ? 'Publicado. Tu casting ya es visible.'
          : data.motivo_filtro
            ? `En revisión: ${data.motivo_filtro}. No está rechazada; la revisará el equipo.`
            : 'En revisión. La revisará el equipo antes de publicarla.',
      }))
    }

    router.refresh()
  }

  if (castings.length === 0) {
    return (
      <div className="obras-empty">
        <p className="obras-empty-text">Todavía no has creado ningún casting</p>
        <Link href="/castings/nuevo" className="ds-btn-primary"
          style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px' }}>
          Crear la primera
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {castings.map(c => {
        const enCurso = ocupado === c.id
        const puedeEnviar = c.estado === 'borrador' || c.estado === 'rechazado'
                            || c.estado === 'cerrado' || c.estado === 'cancelado'

        return (
          <article key={c.id} className="account-card">

            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '19px', color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                  {c.titulo}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {c.nombre_proyecto} · {fecha(c.fecha_apertura)} – {fecha(c.fecha_cierre)}
                </p>
              </div>
              <EstadoPill estado={c.estado} />
            </header>

            <div style={{ marginTop: '14px' }}>
              <AvisoEstado
                estado={c.estado}
                motivoFiltro={c.motivo_filtro}
                motivoRechazo={c.motivo_rechazo}
              />
            </div>

            {errores[c.id] && <div className="ds-alert-error">{errores[c.id]}</div>}
            {resultados[c.id] && <div className="ds-alert-success">{resultados[c.id]}</div>}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <Link href={`/castings/${c.id}/editar`} className="ds-btn-secondary"
                style={{ padding: '9px 18px', fontSize: '13px' }}>
                Editar
              </Link>

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
                  Cancelar casting
                </button>
              )}
            </div>

          </article>
        )
      })}
    </div>
  )
}

function traducir(mensaje: string): string {
  if (mensaje.includes('Límite de castings activos')) return mensaje
  if (mensaje.includes('row-level security')) {
    return 'Tu plan actual no permite esta operación.'
  }
  return mensaje
}
