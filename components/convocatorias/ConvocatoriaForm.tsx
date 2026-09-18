'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { CATEGORIAS } from './vocabulario'

type Convocatoria = Database['public']['Tables']['calls']['Row']

/**
 * Formulario de convocatoria, compartido por creación y edición.
 *
 * Siete campos editables, no treinta y uno como en Castings: `calls` tiene 18
 * columnas y once de ellas las escribe el sistema (id, profile_id, slug,
 * is_published, estado, moderacion_entrada_at, fecha_publicacion, view_count,
 * created_at, updated_at, deleted_at). Enseñar aquí cualquiera de esas sería
 * ofrecer al usuario un control que el trigger le va a quitar.
 *
 * NO DUPLICA NINGUNA REGLA DE NEGOCIO. El cupo mensual del plan gratuito, el
 * derecho a destacar y quién puede fijar `publicado` viven en
 * calls_sync_estado() y en las políticas RLS, y allí siguen decidiendo. Este
 * formulario solo valida lo que el usuario puede corregir antes de enviar, y
 * después enseña lo que el servidor respondió.
 */

type Campos = {
  title: string
  description: string
  category: string
  location: string
  deadline: string
  prize: string
  is_featured: boolean
}

/**
 * `deadline` es timestamptz. El input datetime-local trabaja en hora local sin
 * zona, así que se recorta el ISO a 'YYYY-MM-DDTHH:mm' para mostrarlo y se
 * reconstruye con `new Date(...).toISOString()` al guardar.
 */
function aInputLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function camposIniciales(c?: Convocatoria): Campos {
  return {
    title: c?.title ?? '',
    description: c?.description ?? '',
    category: c?.category ?? '',
    location: c?.location ?? '',
    deadline: aInputLocal(c?.deadline ?? null),
    prize: c?.prize ?? '',
    is_featured: c?.is_featured ?? false,
  }
}

/** Solo lo que el usuario puede arreglar sin salir de la pantalla. */
function validar(c: Campos): string | null {
  if (c.title.trim() === '') {
    return 'La convocatoria necesita un título.'
  }

  if (c.deadline) {
    const d = new Date(c.deadline)
    if (Number.isNaN(d.getTime())) {
      return 'La fecha límite no es válida.'
    }
    if (d.getTime() <= Date.now()) {
      return 'La fecha límite ya ha pasado. Elige una fecha futura.'
    }
  }

  return null
}

/** Traduce los campos del formulario a la fila de `calls`. */
function aFila(c: Campos, profileId: string) {
  const vacioANulo = (v: string) => (v.trim() === '' ? null : v.trim())

  return {
    profile_id: profileId,
    title: c.title.trim(),
    description: vacioANulo(c.description),
    // La columna admite NULL y su comentario en la base lo contempla:
    // «NULL = sin categorizar todavia». No se inventa una categoría por
    // defecto solo para no dejarla vacía.
    category: vacioANulo(c.category),
    location: vacioANulo(c.location),
    deadline: c.deadline ? new Date(c.deadline).toISOString() : null,
    prize: vacioANulo(c.prize),
    is_featured: c.is_featured,
  }
}

export default function ConvocatoriaForm({
  profileId,
  puedeDestacar,
  convocatoria,
}: {
  profileId: string
  /** Solo informa a la interfaz. Quien decide de verdad es el trigger, que
   *  consulta plan_destacado_o_superior(profile_id) del AUTOR. */
  puedeDestacar: boolean
  convocatoria?: Convocatoria
}) {
  const router = useRouter()
  const editando = Boolean(convocatoria)

  const [c, setC] = useState<Campos>(camposIniciales(convocatoria))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [aviso, setAviso] = useState('')

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setC(p => ({ ...p, [k]: v }))
  const limpiar = () => { setError(''); setExito(''); setAviso('') }

  const guardar = async (publicar: boolean) => {
    limpiar()

    const problema = validar(c)
    if (problema) {
      setError(problema)
      return
    }

    setGuardando(true)
    const supabase = createClient()
    const fila = aFila(c, profileId)
    // Al guardar como borrador no se fija `estado`: el DEFAULT de la columna
    // es 'borrador'. Al publicar se pide 'pendiente_revision' y decide el
    // trigger, que puede publicarla al instante si quien escribe modera.
    const datos = publicar ? { ...fila, estado: 'pendiente_revision' } : fila

    if (!editando) {
      const { data, error: errInsert } = await supabase
        .from('calls')
        .insert(datos)
        .select('id, estado')
        .single()

      setGuardando(false)

      if (errInsert || !data) {
        setError(mensajeDeError(errInsert?.message))
        return
      }

      const resultado = !publicar ? 'borrador' : data.estado === 'publicado' ? 'publicado' : 'revision'
      router.push(`/convocatoria/${data.id}/editar?nueva=${resultado}`)
      return
    }

    const { data, error: errUpdate } = await supabase
      .from('calls')
      .update(datos)
      .eq('id', convocatoria!.id)
      .select('estado')
      .single()

    setGuardando(false)

    if (errUpdate || !data) {
      setError(mensajeDeError(errUpdate?.message))
      return
    }

    // Se informa de lo que el servidor DECIDIÓ, no de lo que se pidió. El
    // trigger puede haber publicado, retenido en revisión, o devuelto a la
    // cola una convocatoria publicada cuyo título o descripción han cambiado.
    if (data.estado === 'publicado') {
      setExito(publicar ? 'Publicada. Tu convocatoria ya es visible.' : 'Cambios guardados.')
    } else if (convocatoria!.estado === 'publicado' && data.estado === 'pendiente_revision') {
      setAviso(
        'Esta convocatoria vuelve a revisión porque has cambiado su título o su descripción. ' +
        'Se publicará de nuevo en cuanto la revise el equipo.'
      )
    } else if (publicar) {
      setAviso('En revisión. Alguien del equipo la revisará antes de publicarla.')
    } else {
      setExito('Cambios guardados.')
    }

    router.refresh()
  }

  const esBorrador = !editando || convocatoria!.estado === 'borrador'
  const puedeReenviar = editando
    && convocatoria!.estado !== 'borrador'
    && convocatoria!.estado !== 'publicado'

  return (
    <form className="account-card" onSubmit={e => e.preventDefault()}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <Seccion titulo="La convocatoria" />

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="title">Título *</label>
        <input id="title" className="ds-input" required maxLength={200}
          value={c.title} onChange={e => set('title', e.target.value)}
          placeholder="Residencia de creación 2027" />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor="description">Descripción</label>
        <textarea id="description" className="ds-textarea" rows={6} maxLength={4000}
          value={c.description} onChange={e => set('description', e.target.value)}
          placeholder="Qué se convoca, a quién se dirige, qué incluye y cómo participar." />
        <p className="ds-form-hint">
          Cambiar este texto en una convocatoria ya publicada la devuelve a revisión.
        </p>
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="category">Categoría</label>
          <select id="category" className="ds-select"
            value={c.category} onChange={e => set('category', e.target.value)}>
            <option value="">Sin categorizar</option>
            {CATEGORIAS.map(x => (
              <option key={x.value} value={x.value}>{x.label}</option>
            ))}
          </select>
          <p className="ds-form-hint">Puedes dejarla sin categorizar, pero aparecerá en menos búsquedas.</p>
        </div>

        <div className="ds-form-group">
          <label className="ds-label" htmlFor="location">Lugar</label>
          <input id="location" className="ds-input" maxLength={300}
            value={c.location} onChange={e => set('location', e.target.value)}
            placeholder="Madrid, España" />
        </div>
      </div>

      <Seccion titulo="Plazo y dotación" />

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor="deadline">Fecha límite</label>
          <input id="deadline" className="ds-input" type="datetime-local"
            value={c.deadline} onChange={e => set('deadline', e.target.value)} />
          <p className="ds-form-hint">
            Al pasar esta fecha, la convocatoria se cierra sola. Sin fecha, permanece abierta
            hasta que la cierres a mano.
          </p>
        </div>

        <div className="ds-form-group">
          <label className="ds-label" htmlFor="prize">Dotación</label>
          <input id="prize" className="ds-input" maxLength={300}
            value={c.prize} onChange={e => set('prize', e.target.value)}
            placeholder="2.000 € y residencia de dos semanas" />
          <p className="ds-form-hint">Texto libre: no siempre es una cifra.</p>
        </div>
      </div>

      <Seccion titulo="Visibilidad" />

      <div className="ds-form-group">
        <label htmlFor="is_featured"
          style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', cursor: puedeDestacar ? 'pointer' : 'not-allowed' }}>
          <input type="checkbox" id="is_featured" checked={c.is_featured} disabled={!puedeDestacar}
            onChange={e => set('is_featured', e.target.checked)}
            style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--black)' }} />
          <span>
            Destacar esta convocatoria
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {puedeDestacar
                ? 'Aparecerá resaltada en el listado público.'
                : 'Destacar requiere plan Destacado o Empresa.'}
            </span>
          </span>
        </label>
      </div>

      {error && <div className="ds-alert-error">{error}</div>}
      {aviso && <div className="ds-status-banner ds-status-banner--draft"><div><div className="ds-status-title">{aviso}</div></div></div>}
      {exito && <div className="ds-alert-success">{exito}</div>}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>

        <button type="button" className="ds-btn-secondary" disabled={guardando}
          style={{ padding: '11px 22px', fontSize: '13px' }}
          onClick={() => guardar(false)}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar borrador'}
        </button>

        {(esBorrador || puedeReenviar) && (
          <button type="button" className="ds-btn-primary" disabled={guardando}
            style={{ width: 'auto', padding: '11px 24px', fontSize: '13px' }}
            onClick={() => guardar(true)}>
            {guardando ? 'Publicando…' : puedeReenviar ? 'Reenviar a revisión' : 'Publicar convocatoria'}
          </button>
        )}

        <Link href="/mis-convocatorias" className="table-link" style={{ marginLeft: 'auto' }}>
          Volver a mis convocatorias
        </Link>
      </div>

      {esBorrador && (
        <p className="ds-form-hint">
          «Publicar convocatoria» la guarda y la envía a revisión en un solo paso. La revisión
          previa es obligatoria: se publicará en cuanto alguien del equipo la apruebe.
        </p>
      )}

    </form>
  )
}

/**
 * Los errores de la base llegan crudos. Los dos primeros son mensajes que
 * escribe el propio trigger en castellano y ya están redactados para leerse:
 * se dejan pasar tal cual en vez de sustituirlos por una versión peor.
 */
function mensajeDeError(mensaje?: string): string {
  if (!mensaje) return 'No se pudo guardar. Inténtalo de nuevo.'

  if (mensaje.includes('convocatorias publicadas por mes natural')) return mensaje
  if (mensaje.includes('requiere plan Destacado o Empresa')) return mensaje

  if (mensaje.includes('row-level security')) {
    return 'No tienes permiso para esta operación sobre esta convocatoria.'
  }

  return `No se pudo guardar: ${mensaje}`
}

function Seccion({ titulo }: { titulo: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginTop: '8px' }}>
      <span className="obras-stat-label">{titulo}</span>
    </div>
  )
}
