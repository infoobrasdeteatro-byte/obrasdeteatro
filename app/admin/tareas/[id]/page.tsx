import { createClient } from '@/lib/supabase/server'
// Nombres del equipo (asignado y autores de las notas): clave de servicio
// tras comprobar el rol, como en el resto de /admin.
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { leerAcceso } from '@/lib/admin/acceso'
import { equipoAsignable } from '@/lib/tareas/datos'
import {
  COLUMNAS_TAREA, ETIQUETA_ESTADO_TAREA, ETIQUETA_ORIGEN, enlaceInterno, estaVencida, hoyCanarias, type Tarea,
} from '@/lib/tareas/tareas'
import { Cabecera, fechaCorta, fechaHora, Marco, PildoraPrioridad, SinAcceso } from '../comun'
import AccionesTarea from '../AccionesTarea'
import type { OpcionAsignacion } from '../FormularioTarea'

export const metadata: Metadata = { title: 'Tarea | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }
type Nota = { id: string; autor: string | null; autor_tipo: 'persona' | 'agente'; tipo: 'comentario' | 'estado' | 'asignacion'; texto: string; created_at: string }

/** Detalle de una tarea: datos, origen, historial, estado, asignación (admin) y notas. */
export default async function TareaPage({ params, searchParams }: Props) {
  const [{ id }, { aviso }] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/admin/tareas/${id}`)
  const sesion = supabase as unknown as SupabaseClient
  const { permitido, esAdmin } = await leerAcceso(sesion, user.id)
  if (!permitido) return <SinAcceso />

  const volver = <Link href="/admin/tareas" className="page-back" style={{ marginBottom: '14px' }}>← Volver a las tareas</Link>
  const valido = /^[0-9a-f-]{36}$/i.test(id)
  const [{ data, error }, { data: notasDatos }, equipo] = await Promise.all([
    valido ? sesion.from('tareas_admin').select(COLUMNAS_TAREA).eq('id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    valido ? sesion.from('tareas_admin_notas').select('id, autor, autor_tipo, tipo, texto, created_at').eq('tarea_id', id).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    equipoAsignable(createServiceClient() as unknown as SupabaseClient),
  ])
  const t = data as Tarea | null
  if (error || !t) {
    return (
      <Marco>
        <Cabecera titulo="Tarea" subtitulo="" />
        {volver}
        <div className="obras-empty"><p className="obras-empty-text">{error ? `No se pudo leer la tarea: ${error.message}` : 'Tarea no encontrada, o no tienes acceso a ella.'}</p></div>
      </Marco>
    )
  }

  const nombre = new Map(equipo.map(e => [e.id, e.nombre]))
  const asignado = t.asignado_tipo === 'agente' ? 'Agente automático' : t.asignado_a ? nombre.get(t.asignado_a) ?? 'Persona del equipo' : 'Sin asignar'
  const asignacion = t.asignado_tipo === 'agente' ? 'agente' : t.asignado_a ? `persona:${t.asignado_a}` : ''
  const opciones: OpcionAsignacion[] | null = esAdmin
    ? [
        ...equipo.filter(e => t.origen_tipo !== 'correo' || e.esAdmin).map(e => ({ valor: `persona:${e.id}`, etiqueta: `${e.nombre}${e.id === user.id ? ' (tú)' : ''}` })),
        { valor: 'agente', etiqueta: 'Agente automático' },
        { valor: '', etiqueta: 'Sin asignar' },
      ]
    : null
  const hoy = hoyCanarias()
  const enlace = enlaceInterno(t.origen_enlace)
  const notas = (notasDatos ?? []) as Nota[]
  const autor = (n: Nota) => (n.autor_tipo === 'agente' ? 'Agente automático' : n.autor ? nombre.get(n.autor) ?? 'Persona del equipo' : 'Sistema')

  return (
    <Marco>
      <Cabecera titulo="Tarea" subtitulo="Seguimiento hasta resolverla." />
      {volver}

      {aviso === 'fallo' && <div className="ds-alert-error" style={{ marginBottom: '14px' }}>La tarea se ha creado, pero no se pudo enviar el correo de aviso a la persona asignada.</div>}
      {aviso === 'enviado' && <div className="ds-alert-success" style={{ marginBottom: '14px' }}>Tarea creada. Se ha avisado por correo a la persona asignada.</div>}

      <article className="account-card correo-detalle">
        <h2 className="correo-detalle-asunto">{t.titulo}</h2>
        <dl className="correo-datos">
          <dt>Prioridad</dt><dd><PildoraPrioridad p={t.prioridad} /></dd>
          <dt>Estado</dt><dd>{ETIQUETA_ESTADO_TAREA[t.estado]}{t.resuelta_at ? ` · ${fechaHora(t.resuelta_at)}` : ''}</dd>
          <dt>Asignada a</dt><dd>{asignado}</dd>
          <dt>Límite</dt><dd>{t.fecha_limite ? <span className={estaVencida(t, hoy) ? 'tarea-vence tarea-vence--pasada' : ''}>{fechaCorta(t.fecha_limite)}{estaVencida(t, hoy) ? ' · vencida' : ''}</span> : '—'}</dd>
          <dt>Origen</dt><dd>{ETIQUETA_ORIGEN[t.origen_tipo]}{enlace && <> · <Link href={enlace} className="table-link">Ir al origen</Link></>}</dd>
          <dt>Creada</dt><dd>{fechaHora(t.created_at)}{t.creado_por ? ` · ${nombre.get(t.creado_por) ?? 'Persona del equipo'}` : ''}</dd>
        </dl>
        {t.descripcion ? <p className="correo-texto">{t.descripcion}</p> : <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Sin descripción.</p>}
      </article>

      <AccionesTarea key={`${t.id}:${t.estado}:${asignacion}`} id={t.id} estado={t.estado} asignacion={asignacion} opciones={opciones} />

      <section className="account-card" style={{ marginTop: '14px' }}>
        <h3 className="obras-stat-label">Historial</h3>
        {notas.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Todavía no hay notas.</p>
        ) : (
          <ol className="tarea-notas">
            {notas.map(n => (
              <li key={n.id} className={n.tipo === 'comentario' ? '' : 'tarea-nota--auto'}>
                <div className="tarea-nota-meta">{autor(n)} · {fechaHora(n.created_at)}</div>
                <div className="tarea-nota-texto">{n.texto}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Marco>
  )
}
