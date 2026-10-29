import { createClient } from '@/lib/supabase/server'
// Nombres de las personas asignadas: se leen con la clave de servicio, como
// en el resto de /admin, y solo tras comprobar el rol.
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { leerAcceso } from '@/lib/admin/acceso'
import { equipoAsignable } from '@/lib/tareas/datos'
import {
  COLUMNAS_TAREA, ESTADOS_ABIERTOS, ESTADOS_TAREA, ETIQUETA_ESTADO_TAREA, ETIQUETA_PRIORIDAD, PRIORIDADES,
  estaVencida, hoyCanarias, ordenarTareas, type EstadoTarea, type Prioridad, type Tarea,
} from '@/lib/tareas/tareas'
import { Cabecera, fechaCorta, Marco, PildoraPrioridad, SinAcceso } from './comun'

export const metadata: Metadata = { title: 'Tareas | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Vista = 'mias' | 'todas' | 'agente'
type FiltroEstado = 'abiertas' | 'vencidas' | 'todas' | EstadoTarea
type Props = { searchParams: Promise<{ vista?: string; estado?: string; prioridad?: string }> }

const VISTAS: [Vista, string][] = [['mias', 'Mis tareas'], ['todas', 'Todas'], ['agente', 'Del agente']]
const ESTADOS_FILTRO: [FiltroEstado, string][] = [['abiertas', 'Abiertas'], ['vencidas', 'Vencidas'], ...ESTADOS_TAREA.map(e => [e, ETIQUETA_ESTADO_TAREA[e]] as [FiltroEstado, string]), ['todas', 'Todas']]

/**
 * Tareas del Master Control. «Mis tareas» para todo el equipo; «Todas» y
 * «Del agente» solo para administración. Lo que se ve lo decide la RLS: a
 * moderator la base solo le devuelve las suyas que no vienen de un correo.
 */
export default async function TareasPage({ searchParams }: Props) {
  const p = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/tareas')
  const sesion = supabase as unknown as SupabaseClient
  const { permitido, esAdmin } = await leerAcceso(sesion, user.id)
  if (!permitido) return <SinAcceso />

  const vista: Vista = esAdmin && (p.vista === 'todas' || p.vista === 'agente') ? p.vista : 'mias'
  const estado = (ESTADOS_FILTRO.map(e => e[0]) as string[]).includes(p.estado ?? '') ? (p.estado as FiltroEstado) : 'abiertas'
  const prioridad = (PRIORIDADES as string[]).includes(p.prioridad ?? '') ? (p.prioridad as Prioridad) : null
  const hoy = hoyCanarias()

  let q = sesion.from('tareas_admin').select(COLUMNAS_TAREA).limit(500)
  if (vista === 'mias') q = q.eq('asignado_tipo', 'persona').eq('asignado_a', user.id)
  if (vista === 'agente') q = q.eq('asignado_tipo', 'agente')
  if (estado === 'abiertas') q = q.in('estado', ESTADOS_ABIERTOS)
  else if (estado === 'vencidas') q = q.in('estado', ESTADOS_ABIERTOS).lt('fecha_limite', hoy)
  else if (estado !== 'todas') q = q.eq('estado', estado)
  if (prioridad) q = q.eq('prioridad', prioridad)

  const [{ data, error }, equipo] = await Promise.all([q, equipoAsignable(createServiceClient() as unknown as SupabaseClient)])
  const tareas = ordenarTareas((data ?? []) as Tarea[], hoy)
  const nombre = new Map(equipo.map(e => [e.id, e.nombre]))

  const enlace = (cambio: Record<string, string | null>) => {
    const s = new URLSearchParams()
    const v = { vista, estado, prioridad, ...cambio }
    if (v.vista && v.vista !== 'mias') s.set('vista', v.vista)
    if (v.estado && v.estado !== 'abiertas') s.set('estado', v.estado)
    if (v.prioridad) s.set('prioridad', v.prioridad)
    const t = s.toString()
    return `/admin/tareas${t ? `?${t}` : ''}`
  }
  const pestana = (activa: boolean) => `mc-pestana${activa ? ' mc-pestana--activa' : ''}`

  return (
    <Marco>
      <Cabecera titulo="Tareas" subtitulo="Lo que requiere acción, a quién le toca y en qué punto está.">
        <Link href="/admin/tareas/nueva" className="ds-btn-primary" style={{ width: 'auto', padding: '7px 14px', fontSize: '13px' }}>Nueva tarea</Link>
      </Cabecera>

      <div className="correo-filtros">
        <div className="mc-pestanas" role="group" aria-label="Vista">
          {VISTAS.filter(([v]) => esAdmin || v === 'mias').map(([v, et]) => <Link key={v} href={enlace({ vista: v })} className={pestana(vista === v)}>{et}</Link>)}
        </div>
        <div className="mc-pestanas" role="group" aria-label="Estado">
          {ESTADOS_FILTRO.map(([e, et]) => <Link key={e} href={enlace({ estado: e })} className={pestana(estado === e)}>{et}</Link>)}
        </div>
        <div className="mc-pestanas" role="group" aria-label="Prioridad">
          <Link href={enlace({ prioridad: null })} className={pestana(!prioridad)}>Cualquier prioridad</Link>
          {PRIORIDADES.map(pr => <Link key={pr} href={enlace({ prioridad: pr })} className={pestana(prioridad === pr)}>{ETIQUETA_PRIORIDAD[pr]}</Link>)}
        </div>
      </div>

      {error && <div className="ds-alert-error" style={{ marginBottom: '16px' }}>No se pudieron leer las tareas: {error.message}</div>}

      {!error && tareas.length === 0 ? (
        <div className="obras-empty"><p className="obras-empty-text">No hay tareas con estos filtros.</p></div>
      ) : (
        <ul className="correo-lista account-card">
          {tareas.map(t => {
            const vencida = estaVencida(t, hoy)
            const asignado = t.asignado_tipo === 'agente' ? 'Agente automático' : t.asignado_a ? nombre.get(t.asignado_a) ?? 'Persona del equipo' : 'Sin asignar'
            return (
              <li key={t.id}>
                <Link href={`/admin/tareas/${t.id}`} className={`tarea-fila${vencida ? ' tarea-fila--vencida' : ''}`}>
                  <PildoraPrioridad p={t.prioridad} />
                  <span className="correo-asunto">{t.titulo}</span>
                  <span className="correo-meta">
                    <span>{asignado}</span>
                    {t.fecha_limite && <span className={vencida ? 'tarea-vence tarea-vence--pasada' : 'tarea-vence'}>{vencida ? 'Venció el ' : 'Hasta el '}{fechaCorta(t.fecha_limite)}</span>}
                    <span className="correo-etiqueta">{ETIQUETA_ESTADO_TAREA[t.estado]}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Marco>
  )
}
