/**
 * Tareas del Master Control: tipos, etiquetas, orden y validación. Funciones
 * puras. La seguridad (quién ve, quién cambia qué) está en la base:
 * 20261029150000_tareas_admin.
 */

export type EstadoTarea = 'pendiente' | 'en_curso' | 'resuelta' | 'descartada'
export type Prioridad = 'baja' | 'normal' | 'alta' | 'urgente'
export type OrigenTipo = 'correo' | 'cola' | 'salud' | 'actividad' | 'manual'
export type AsignadoTipo = 'persona' | 'agente' | null

export const ESTADOS_TAREA: EstadoTarea[] = ['pendiente', 'en_curso', 'resuelta', 'descartada']
export const ESTADOS_ABIERTOS: EstadoTarea[] = ['pendiente', 'en_curso']
export const PRIORIDADES: Prioridad[] = ['urgente', 'alta', 'normal', 'baja']
export const ORIGENES: OrigenTipo[] = ['correo', 'cola', 'salud', 'actividad', 'manual']

export const ETIQUETA_ESTADO_TAREA: Record<EstadoTarea, string> = { pendiente: 'Pendiente', en_curso: 'En curso', resuelta: 'Resuelta', descartada: 'Descartada' }
export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = { urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baja: 'Baja' }
export const ETIQUETA_ORIGEN: Record<OrigenTipo, string> = { correo: 'Correo', cola: 'Cola de pendientes', salud: 'Salud de las automatizaciones', actividad: 'Actividad', manual: 'Manual' }

export const MAX_TITULO = 200
export const MAX_TEXTO = 4000

export type Tarea = {
  id: string
  titulo: string
  descripcion: string | null
  origen_tipo: OrigenTipo
  origen_ref: string | null
  origen_enlace: string | null
  asignado_tipo: AsignadoTipo
  asignado_a: string | null
  estado: EstadoTarea
  prioridad: Prioridad
  fecha_limite: string | null
  creado_por: string | null
  resuelta_at: string | null
  created_at: string
  updated_at: string
}

export const COLUMNAS_TAREA = 'id, titulo, descripcion, origen_tipo, origen_ref, origen_enlace, asignado_tipo, asignado_a, estado, prioridad, fecha_limite, creado_por, resuelta_at, created_at, updated_at'

/** Fecha de hoy (AAAA-MM-DD) en Canarias, la hora de referencia de /admin. */
export const hoyCanarias = (ahora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Atlantic/Canary', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)

export const estaAbierta = (t: Pick<Tarea, 'estado'>) => ESTADOS_ABIERTOS.includes(t.estado)

/** Abierta y con la fecha límite ya pasada (el día límite todavía cuenta). */
export const estaVencida = (t: Pick<Tarea, 'estado' | 'fecha_limite'>, hoy: string) =>
  estaAbierta(t) && !!t.fecha_limite && t.fecha_limite < hoy

const PESO_PRIORIDAD: Record<Prioridad, number> = { urgente: 0, alta: 1, normal: 2, baja: 3 }

/**
 * Orden de la lista: primero las abiertas urgentes o vencidas; después por
 * fecha límite (las que no tienen, al final); a igualdad, por prioridad y por
 * la más reciente. Las cerradas van detrás de las abiertas.
 */
export function ordenarTareas<T extends Pick<Tarea, 'estado' | 'prioridad' | 'fecha_limite' | 'created_at'>>(tareas: T[], hoy: string): T[] {
  const clave = (t: T) => [
    estaAbierta(t) ? 0 : 1,
    estaAbierta(t) && (t.prioridad === 'urgente' || estaVencida(t, hoy)) ? 0 : 1,
  ]
  return [...tareas].sort((a, b) => {
    const [ka, kb] = [clave(a), clave(b)]
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]
    if (a.fecha_limite !== b.fecha_limite) {
      if (!a.fecha_limite) return 1
      if (!b.fecha_limite) return -1
      return a.fecha_limite.localeCompare(b.fecha_limite)
    }
    if (a.prioridad !== b.prioridad) return PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad]
    return b.created_at.localeCompare(a.created_at)
  })
}

/** Ruta interna segura: «/admin/…», nunca «//otro» ni una URL completa. */
export const enlaceInterno = (v: string | null | undefined): string | null => {
  const s = (v ?? '').trim()
  return /^\/[^/\\]/.test(s) && s.length <= 500 ? s : null
}

export type DatosNuevaTarea = {
  titulo: string
  descripcion: string | null
  prioridad: Prioridad
  fecha_limite: string | null
  origen_tipo: OrigenTipo
  origen_ref: string | null
  origen_enlace: string | null
  asignado_tipo: AsignadoTipo
  asignado_a: string | null
}

/** «persona:<uuid>», «agente» o «» (sin asignar) → asignado_tipo / asignado_a. */
export function leerAsignacion(v: string | null | undefined): { asignado_tipo: AsignadoTipo; asignado_a: string | null } | null {
  const s = (v ?? '').trim()
  if (!s) return { asignado_tipo: null, asignado_a: null }
  if (s === 'agente') return { asignado_tipo: 'agente', asignado_a: null }
  const m = s.match(/^persona:([0-9a-f-]{36})$/i)
  return m ? { asignado_tipo: 'persona', asignado_a: m[1].toLowerCase() } : null
}

/** Valida el formulario. Devuelve los datos limpios o el primer error. */
export function validarNuevaTarea(f: Record<string, string | null | undefined>): { datos: DatosNuevaTarea } | { error: string } {
  const titulo = (f.titulo ?? '').trim()
  if (!titulo) return { error: 'Escribe un título.' }
  if (titulo.length > MAX_TITULO) return { error: `El título no puede pasar de ${MAX_TITULO} caracteres.` }
  const descripcion = (f.descripcion ?? '').trim()
  if (descripcion.length > MAX_TEXTO) return { error: `La descripción no puede pasar de ${MAX_TEXTO} caracteres.` }
  const prioridad = (PRIORIDADES as string[]).includes(f.prioridad ?? '') ? (f.prioridad as Prioridad) : 'normal'
  const fecha = (f.fecha_limite ?? '').trim()
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)))) return { error: 'La fecha límite no es válida.' }
  const origen_tipo = (ORIGENES as string[]).includes(f.origen_tipo ?? '') ? (f.origen_tipo as OrigenTipo) : 'manual'
  const ref = (f.origen_ref ?? '').trim()
  if (ref.length > 200) return { error: 'Origen no válido.' }
  const enlace = (f.origen_enlace ?? '').trim()
  const origen_enlace = enlace ? enlaceInterno(enlace) : null
  if (enlace && !origen_enlace) return { error: 'El enlace de origen tiene que ser una ruta de la web (/admin/…).' }
  const asignacion = leerAsignacion(f.asignacion)
  if (!asignacion) return { error: 'Asignación no válida.' }
  return {
    datos: {
      titulo, descripcion: descripcion || null, prioridad, fecha_limite: fecha || null,
      origen_tipo, origen_ref: origen_tipo === 'manual' ? null : ref || null, origen_enlace, ...asignacion,
    },
  }
}

/** Enlace a «Crear tarea» con el formulario ya rellenado. */
export function enlaceCrearTarea(o: { origen_tipo: OrigenTipo; origen_ref?: string | null; titulo?: string; origen_enlace?: string | null }): string {
  const q = new URLSearchParams({ origen_tipo: o.origen_tipo })
  if (o.origen_ref) q.set('origen_ref', o.origen_ref)
  if (o.titulo) q.set('titulo', o.titulo.slice(0, MAX_TITULO))
  const enlace = enlaceInterno(o.origen_enlace)
  if (enlace) q.set('origen_enlace', enlace)
  return `/admin/tareas/nueva?${q.toString()}`
}

/** Clave de un origen, para buscar si ya hay una tarea abierta: «cola:noticias». */
export const claveOrigen = (tipo: OrigenTipo, ref: string | null | undefined) => `${tipo}:${ref ?? ''}`
