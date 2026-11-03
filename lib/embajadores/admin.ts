import { origenPlan, etiquetaOrigen, filaCsv, type OrigenPlan, type Suscripcion } from '@/lib/elenco/origen-plan'
import { tituloEmbajador, tituloHonor, type Genero } from './textos'

/**
 * Panel de Embajadores de Escena: por embajador/a, colegas registrados,
 * activos, de pago (suscripción de Stripe en active o trialing, nunca solo
 * profiles.plan), puntos, escalón y fin de la membresía; y el detalle de sus
 * colegas. Mismo esquema y mismo «origen del plan» que el panel del Elenco.
 */

/** Datos tal como salen de la base (cliente de servicio). */
export type EmbajadorBD = {
  profile_id: string; nombre: string; genero: Genero | null; aceptada_at: string | null
  hasta: string; renunciada_at: string | null; honor_at: string | null
}
export type ColegaEmbajadorBD = {
  embajador_id: string; profile_id: string; alta: string; nombre: string; tipo_perfil: string
  clase: string; activo: boolean; puntos: number
}
export type DatosPanelEmbajadores = {
  embajadores: EmbajadorBD[]
  colegas: ColegaEmbajadorBD[]
  planes: Map<string, string>                 // profile_id → profiles.plan
  suscripciones: Map<string, Suscripcion>     // profile_id → subscriptions
  cortesias: Map<string, string>              // profile_id → plan de cortesía vigente (Embajadores o Elenco)
  escalones: Map<string, number>              // embajador → escalón máximo
  ahora: number
  env?: Record<string, string | undefined>
}

export type SituacionMembresia = 'activa' | 'honor' | 'vencida' | 'renuncio'

export type FilaColega = {
  profileId: string; nombre: string; tipoPerfil: string; clase: string; alta: string
  activo: boolean; puntos: number; plan: string; origen: OrigenPlan
}
export type FilaEmbajadorPanel = {
  id: string; nombre: string; titulo: string; situacion: SituacionMembresia; hasta: string | null; desde: string | null
  registrados: number; activos: number; dePago: number; puntos: number; escalon: number; colegas: FilaColega[]
}

export function situacionMembresia(e: Pick<EmbajadorBD, 'hasta' | 'renunciada_at' | 'honor_at'>, ahora: number): SituacionMembresia {
  if (e.renunciada_at) return 'renuncio'
  if (e.honor_at || e.hasta.startsWith('infinity')) return 'honor'
  return Date.parse(e.hasta) > ahora ? 'activa' : 'vencida'
}

/** Filas del panel, de más puntos a menos, y totales del programa. */
export function construirPanelEmbajadores(d: DatosPanelEmbajadores) {
  const porEmbajador = new Map<string, ColegaEmbajadorBD[]>()
  for (const c of d.colegas) porEmbajador.set(c.embajador_id, [...(porEmbajador.get(c.embajador_id) ?? []), c])

  const filas: FilaEmbajadorPanel[] = d.embajadores.map(e => {
    const colegas: FilaColega[] = (porEmbajador.get(e.profile_id) ?? []).map(c => {
      const plan = d.planes.get(c.profile_id) ?? 'gratuito'
      return {
        profileId: c.profile_id, nombre: c.nombre, tipoPerfil: c.tipo_perfil, clase: c.clase, alta: c.alta,
        activo: c.activo, puntos: c.puntos, plan,
        origen: origenPlan(plan, d.suscripciones.get(c.profile_id), d.cortesias.get(c.profile_id) ?? null, d.env),
      }
    }).sort((a, b) => b.alta.localeCompare(a.alta))
    const situacion = situacionMembresia(e, d.ahora)
    return {
      id: e.profile_id, nombre: e.nombre,
      titulo: situacion === 'honor' ? tituloHonor(e.genero) : tituloEmbajador(e.genero),
      situacion,
      hasta: situacion === 'honor' ? null : e.hasta,
      desde: e.aceptada_at,
      registrados: colegas.length,
      activos: colegas.filter(c => c.activo).length,
      dePago: colegas.filter(c => c.origen.origen === 'pago').length,
      puntos: colegas.reduce((s, c) => s + c.puntos, 0),
      escalon: d.escalones.get(e.profile_id) ?? 0,
      colegas,
    }
  }).sort((a, b) => b.puntos - a.puntos || b.registrados - a.registrados || a.nombre.localeCompare(b.nombre, 'es'))

  const todos = filas.flatMap(f => f.colegas)
  return {
    filas,
    totales: {
      embajadores: filas.filter(f => f.situacion !== 'renuncio').length,
      registrados: todos.length,
      activos: todos.filter(c => c.activo).length,
      dePago: todos.filter(c => c.origen.origen === 'pago').length,
    },
  }
}

const dia = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
export const SITUACION_MEMBRESIA: Record<SituacionMembresia, string> = { activa: 'Activa', honor: 'De Honor (para siempre)', vencida: 'Vencida', renuncio: 'Renunció' }
export const CLASE_COLEGA: Record<string, string> = { persona: 'Persona', organizacion: 'Organización', sala: 'Sala', publico: 'Público general' }

export const CABECERA_CSV_EMBAJADORES = ['Embajador/a', 'Distintivo', 'Membresía', 'Fin de la membresía', 'Registrados', 'Activos', 'De pago', 'Puntos', 'Escalón']
export const CABECERA_CSV_COLEGAS = ['Embajador/a', 'Colega', 'Tipo', 'Alta', 'Activo', 'Puntos', 'Plan', 'Origen del plan', 'Periodo', 'Alta del pago']

export function csvEmbajadores(filas: FilaEmbajadorPanel[]): string {
  return [filaCsv(CABECERA_CSV_EMBAJADORES), ...filas.map(f => filaCsv([
    f.nombre, f.titulo, SITUACION_MEMBRESIA[f.situacion], f.situacion === 'honor' ? 'para siempre' : dia(f.hasta),
    f.registrados, f.activos, f.dePago, f.puntos, f.escalon || '',
  ]))].join('\r\n')
}

export function csvColegas(filas: FilaEmbajadorPanel[]): string {
  return [filaCsv(CABECERA_CSV_COLEGAS), ...filas.flatMap(f => f.colegas.map(c => filaCsv([
    f.nombre, c.nombre, CLASE_COLEGA[c.clase] ?? c.clase, dia(c.alta), c.activo ? 'sí' : 'no', c.puntos, c.plan,
    etiquetaOrigen(c.origen),
    c.origen.origen === 'pago' ? (c.origen.periodo ?? '') : '',
    c.origen.origen === 'pago' ? dia(c.origen.desde) : '',
  ])))].join('\r\n')
}
