import { origenPlan, etiquetaOrigen, filaCsv, type OrigenPlan, type Suscripcion } from './origen-plan'
import { numeroFundador, type TipoFundador } from './textos'

/** Datos tal como salen de la base (cliente de servicio). */
export type FundadorBD = {
  id: string; numero: number; token: string; nombre: string; tipo: TipoFundador; oficio: string
  telefono: string | null; email: string | null; nota: string | null; estado: string
  creada_at: string; aceptada_por: string | null; aceptada_at: string | null; bono_activado_at: string | null
}
export type ColegaBD = {
  fundador_id: string; profile_id: string; alta: string; nombre: string; tipo_perfil: string
  clase: string; activo: boolean; puntos: number
}
export type DatosPanel = {
  fundadores: FundadorBD[]
  colegas: ColegaBD[]
  planes: Map<string, string>                 // profile_id → profiles.plan
  suscripciones: Map<string, Suscripcion>     // profile_id → subscriptions
  cortesias: Map<string, string>              // profile_id → plan de cortesía vigente (Embajadores o Elenco)
  escalones: Map<string, number>              // fundador_id → escalón máximo
  semanasPendientes: Map<string, number>      // fundador_id → semanas de Cartelera sin aplicar
  bonoHasta: Map<string, string>              // fundador_id → fin del tramo del bono
  ahora: number
  env?: Record<string, string | undefined>
}

export type EstadoBono = 'pendiente' | 'disponible' | 'activo' | 'usado' | 'caducado'

export type FilaReferido = {
  profileId: string; nombre: string; tipoPerfil: string; clase: string; alta: string
  activo: boolean; puntos: number; plan: string; origen: OrigenPlan
}
export type FilaFundador = {
  id: string; numero: number; nombre: string; tipo: TipoFundador; oficio: string; estado: string
  fecha: string; token: string; telefono: string | null; email: string | null; nota: string | null
  aceptadaPor: string | null; registrados: number; activos: number; dePago: number; puntos: number
  escalon: number; bono: EstadoBono; bonoLimite: string | null; semanasPendientes: number; referidos: FilaReferido[]
}
export type Totales = { fundadores: number; registrados: number; activos: number; dePago: number; ingresosMensuales: number }

const DOCE_MESES = (iso: string) => { const d = new Date(iso); d.setMonth(d.getMonth() + 12); return d.getTime() }

export function estadoBono(f: Pick<FundadorBD, 'estado' | 'aceptada_at' | 'bono_activado_at'>, bonoHasta: string | undefined, ahora: number): EstadoBono {
  if (f.estado !== 'aceptada' || !f.aceptada_at) return 'pendiente'
  if (!f.bono_activado_at) return ahora > DOCE_MESES(f.aceptada_at) ? 'caducado' : 'disponible'
  return bonoHasta && Date.parse(bonoHasta) > ahora ? 'activo' : 'usado'
}

/** Filas del panel (plazas vivas, por número) y totales del programa. */
export function construirPanel(d: DatosPanel): { filas: FilaFundador[]; totales: Totales } {
  const porFundador = new Map<string, ColegaBD[]>()
  for (const c of d.colegas) porFundador.set(c.fundador_id, [...(porFundador.get(c.fundador_id) ?? []), c])

  const filas: FilaFundador[] = d.fundadores
    .filter(f => f.estado !== 'anulada')
    .sort((a, b) => a.numero - b.numero)
    .map(f => {
      const referidos: FilaReferido[] = (porFundador.get(f.id) ?? []).map(c => {
        const plan = d.planes.get(c.profile_id) ?? 'gratuito'
        return {
          profileId: c.profile_id, nombre: c.nombre, tipoPerfil: c.tipo_perfil, clase: c.clase, alta: c.alta,
          activo: c.activo, puntos: c.puntos, plan,
          origen: origenPlan(plan, d.suscripciones.get(c.profile_id), d.cortesias.get(c.profile_id) ?? null, d.env),
        }
      }).sort((a, b) => b.alta.localeCompare(a.alta))
      return {
        id: f.id, numero: f.numero, nombre: f.nombre, tipo: f.tipo, oficio: f.oficio, estado: f.estado,
        fecha: f.aceptada_at ?? f.creada_at, token: f.token, telefono: f.telefono, email: f.email, nota: f.nota,
        aceptadaPor: f.aceptada_por,
        registrados: referidos.length,
        activos: referidos.filter(r => r.activo).length,
        dePago: referidos.filter(r => r.origen.origen === 'pago').length,
        puntos: referidos.reduce((s, r) => s + r.puntos, 0),
        escalon: d.escalones.get(f.id) ?? 0,
        bono: estadoBono(f, d.bonoHasta.get(f.id), d.ahora),
        bonoLimite: f.aceptada_at ? new Date(DOCE_MESES(f.aceptada_at)).toISOString() : null,
        semanasPendientes: d.semanasPendientes.get(f.id) ?? 0,
        referidos,
      }
    })

  const todos = filas.flatMap(f => f.referidos)
  const ingresos = todos.reduce((s, r) => s + (r.origen.origen === 'pago' ? r.origen.mensualEur : 0), 0)
  return {
    filas,
    totales: {
      fundadores: filas.filter(f => f.estado === 'aceptada').length,
      registrados: todos.length,
      activos: todos.filter(r => r.activo).length,
      dePago: todos.filter(r => r.origen.origen === 'pago').length,
      ingresosMensuales: Math.round(ingresos * 100) / 100,
    },
  }
}

const dia = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const ESTADO_INV: Record<string, string> = { pendiente: 'Pendiente', aceptada: 'Aceptada', anulada: 'Anulada' }

export const CABECERA_CSV_FUNDADORES = ['Número', 'Nombre', 'Tipo', 'Oficio', 'Estado', 'Fecha', 'Registrados', 'Activos', 'De pago', 'Puntos', 'Escalón', 'Bono']
export const CABECERA_CSV_REFERIDOS = ['Fundador', 'Referido', 'Tipo', 'Alta', 'Activo', 'Plan', 'Origen del plan', 'Periodo', 'Alta del pago', 'Ingreso mensual (€)']

export function csvFundadores(filas: FilaFundador[]): string {
  return [filaCsv(CABECERA_CSV_FUNDADORES), ...filas.map(f => filaCsv([
    numeroFundador(f.numero), f.nombre, f.tipo === 'organizacion' ? 'Organización' : 'Persona', f.oficio,
    ESTADO_INV[f.estado] ?? f.estado, dia(f.fecha), f.registrados, f.activos, f.dePago, f.puntos, f.escalon || '', f.bono,
  ]))].join('\r\n')
}

export function csvReferidos(filas: FilaFundador[]): string {
  return [filaCsv(CABECERA_CSV_REFERIDOS), ...filas.flatMap(f => f.referidos.map(r => filaCsv([
    numeroFundador(f.numero), r.nombre, r.clase, dia(r.alta), r.activo ? 'sí' : 'no', r.plan,
    etiquetaOrigen(r.origen),
    r.origen.origen === 'pago' ? (r.origen.periodo ?? '') : '',
    r.origen.origen === 'pago' ? dia(r.origen.desde) : '',
    r.origen.origen === 'pago' ? r.origen.mensualEur.toFixed(2) : '',
  ])))].join('\r\n')
}
