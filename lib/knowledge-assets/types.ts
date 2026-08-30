import type { Organization, Person, Work } from '@/lib/repository-layer'
import type { TheatricalFunction } from './theatrical-function'

/**
 * The 8 official knowledge domains (CAT-001). No other value may be used
 * to tag a knowledge item.
 */
export type KnowledgeDomain =
  | 'Personas'
  | 'Obras'
  | 'Organizaciones'
  | 'Oportunidades'
  | 'Editorial'
  | 'Relaciones'
  | 'Trayectoria'
  | 'Inteligencia'

/**
 * Jerarquia de autoridad del conocimiento. El orden de la union es el orden
 * de confianza: `CATALOGO_PROPIO` es el dato verificado del ecosistema y
 * `CONOCIMIENTO_MODELO` es lo que el proveedor sabe por si mismo, que jamas
 * puede presentarse como procedente del ecosistema.
 *
 * Los niveles intermedios se declaran ya porque el contrato debe poder
 * recibirlos sin volver a modificarse, pero NINGUN codigo los produce hoy:
 * no existe todavia ninguna fuente externa. Declararlos no los inventa --
 * los reserva, en la linea del Acta Global de Cierre de Fase B (valores
 * reservados pero no alcanzables hoy se declaran explicitamente en el tipo).
 */
export type AuthorityLevel =
  | 'CATALOGO_PROPIO'
  | 'FUENTE_OFICIAL'
  | 'FUENTE_INSTITUCIONAL'
  | 'FUENTE_ESPECIALIZADA'
  | 'FUENTE_GENERAL'
  | 'CONOCIMIENTO_MODELO'

/**
 * Procedencia de un dato concreto. Viaja SIEMPRE pegada al dato, dentro del
 * propio `KnowledgeItem` -- nunca en una estructura paralela que pudiera
 * desincronizarse o perderse por el camino.
 *
 * - `sourceName` / `sourceUrl`: exclusivamente lo que el dato real declara.
 *   `null` significa "sin fuente declarada"; jamas se infiere ni se rellena.
 * - `observedAt`: instante real en que Knowledge Assets leyo el dato.
 * - `validUntil`: `null` = conocimiento estable, no caduca. Una fecha marca
 *   informacion vigente hasta ese momento (subvenciones, convocatorias,
 *   cartelera). Hoy ninguna fuente produce fechas: el campo queda listo para
 *   que puedan hacerlo sin volver a tocar el contrato.
 */
export interface KnowledgeProvenance {
  readonly authority: AuthorityLevel
  readonly sourceName: string | null
  readonly sourceUrl: string | null
  readonly observedAt: string
  readonly validUntil: string | null
}

export interface KnowledgeItem<TDomain extends KnowledgeDomain, TData> {
  domain: TDomain
  data: TData
  provenance: KnowledgeProvenance
  /**
   * Segundo eje del modelo Dominio x Funcion. Viaja dentro del propio item,
   * junto a `provenance` -- nunca en una estructura paralela. Vacio significa
   * "sin funcion declarada por el dato", jamas una funcion supuesta.
   */
  functions: readonly TheatricalFunction[]
}

export type WorkKnowledgeItem = KnowledgeItem<'Obras', Work>
export type OrganizationKnowledgeItem = KnowledgeItem<'Organizaciones', Organization>
export type PersonKnowledgeItem = KnowledgeItem<'Personas', Person>

export type StructuredKnowledgeItem = WorkKnowledgeItem | OrganizationKnowledgeItem | PersonKnowledgeItem
