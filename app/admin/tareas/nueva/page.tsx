import { createClient } from '@/lib/supabase/server'
// Lista de personas asignables: clave de servicio tras comprobar el rol, como en el resto de /admin.
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { leerAcceso } from '@/lib/admin/acceso'
import { equipoAsignable } from '@/lib/tareas/datos'
import { tareaAbiertaDeOrigen } from '@/lib/tareas/crear'
import { enlaceInterno, ETIQUETA_ORIGEN, MAX_TITULO, ORIGENES, type OrigenTipo } from '@/lib/tareas/tareas'
import { Cabecera, Marco, SinAcceso } from '../comun'
import FormularioTarea, { type OpcionAsignacion } from '../FormularioTarea'

export const metadata: Metadata = { title: 'Nueva tarea | Administración | ObrasDeTeatro', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ origen_tipo?: string; origen_ref?: string; titulo?: string; origen_enlace?: string }> }

/**
 * Nueva tarea, manual o desde un origen (correo, cola, semáforo…), con el
 * título y el enlace ya rellenados. Si ya hay una tarea abierta para ese
 * origen, se enlaza en vez de crear otra.
 */
export default async function NuevaTareaPage({ searchParams }: Props) {
  const p = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/tareas/nueva')
  const sesion = supabase as unknown as SupabaseClient
  const { permitido, esAdmin } = await leerAcceso(sesion, user.id)
  if (!permitido) return <SinAcceso />

  const origen_tipo: OrigenTipo = (ORIGENES as string[]).includes(p.origen_tipo ?? '') ? (p.origen_tipo as OrigenTipo) : 'manual'
  const origen_ref = origen_tipo === 'manual' ? '' : (p.origen_ref ?? '').slice(0, 200)
  const volver = <Link href="/admin/tareas" className="page-back" style={{ marginBottom: '14px' }}>← Volver a las tareas</Link>

  if (origen_tipo === 'correo' && !esAdmin) {
    return <Marco><Cabecera titulo="Nueva tarea" subtitulo="" />{volver}<div className="obras-empty"><p className="obras-empty-text">Las tareas de un correo son solo de administración.</p></div></Marco>
  }

  const ya = await tareaAbiertaDeOrigen(sesion, origen_tipo, origen_ref || null)
  if (ya) {
    return (
      <Marco>
        <Cabecera titulo="Nueva tarea" subtitulo="Ya hay una tarea abierta para esto: no se duplica." />
        {volver}
        <div className="account-card"><Link href={`/admin/tareas/${ya.id}`} className="table-link">Tarea abierta: {ya.titulo}</Link></div>
      </Marco>
    )
  }

  // Asignables: admin elige entre el equipo y el agente (las de un correo, solo admin);
  // moderator solo puede crearlas para sí.
  const equipo = await equipoAsignable(createServiceClient() as unknown as SupabaseClient)
  const yo = equipo.find(e => e.id === user.id)
  const opciones: OpcionAsignacion[] = esAdmin
    ? [
        ...equipo.filter(e => origen_tipo !== 'correo' || e.esAdmin)
          .map(e => ({ valor: `persona:${e.id}`, etiqueta: `${e.nombre}${e.id === user.id ? ' (tú)' : ''}${e.esAdmin ? '' : ' · moderación'}` })),
        { valor: 'agente', etiqueta: 'Agente automático' },
        { valor: '', etiqueta: 'Sin asignar' },
      ]
    : [{ valor: `persona:${user.id}`, etiqueta: `${yo?.nombre ?? 'Tú'} (tú)` }]

  return (
    <Marco>
      <Cabecera titulo="Nueva tarea" subtitulo={origen_tipo === 'manual' ? 'Tarea manual.' : `Desde: ${ETIQUETA_ORIGEN[origen_tipo]}.`} />
      {volver}
      <FormularioTarea
        inicial={{ titulo: (p.titulo ?? '').slice(0, MAX_TITULO), origen_tipo, origen_ref, origen_enlace: enlaceInterno(p.origen_enlace) ?? '' }}
        opciones={opciones}
        asignacionInicial={`persona:${user.id}`}
      />
    </Marco>
  )
}
