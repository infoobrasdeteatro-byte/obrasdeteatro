import Link from 'next/link'
import { claveOrigen, enlaceCrearTarea, type OrigenTipo } from '@/lib/tareas/tareas'

/** «Crear tarea» o, si ya hay una abierta para ese origen, «Tarea abierta: …». */
export default function EnlaceTarea({ origen, refOrigen, titulo, enlace, abiertas }: {
  origen: OrigenTipo; refOrigen: string; titulo: string; enlace: string; abiertas: Record<string, { id: string; titulo: string }>
}) {
  const abierta = abiertas[claveOrigen(origen, refOrigen)]
  return abierta
    ? <Link href={`/admin/tareas/${abierta.id}`} className="mc-tarea-enlace mc-tarea-enlace--abierta">Tarea abierta: {abierta.titulo}</Link>
    : <Link href={enlaceCrearTarea({ origen_tipo: origen, origen_ref: refOrigen, titulo, origen_enlace: enlace })} className="mc-tarea-enlace">＋ Crear tarea</Link>
}
