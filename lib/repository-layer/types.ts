export type ProfileType =
  | 'actor'
  | 'director'
  | 'dramaturgo'
  | 'compania'
  | 'productora'
  | 'teatro'
  | 'festival'
  | 'escuela'
  | 'institucion'
  | 'profesional'
  | 'publico'

export interface Identity {
  userId: string
  profileType: ProfileType
  language: string
  country: string | null
  timezone: null
}

export interface ProfessionalProfilePublic {
  firstName: string
  lastName: string | null
  artisticName: string | null
  slug: string | null
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  isPublic: boolean
  isVerified: boolean
  websiteUrl: string | null
}

export interface Work {
  id: string
  title: string
  subtitle: string | null
  author: string | null
  genre: string | null
  synopsis: string | null
  language: string | null
  year: number | null
  slug: string | null
  minAge: number | null
  durationMinutes: number | null
  castSizeMax: number | null
  /** Procedencia declarada del texto en el catalogo. NULL = sin fuente declarada, nunca inferida. */
  sourceName: string | null
  sourceUrl: string | null
}

/**
 * Criterio de busqueda estructurado del dominio Obras (SCENAIA-002C, ADR
 * SCENAIA-002C.1). Todos los campos opcionales -- su ausencia significa
 * "sin filtrar por ese atributo", nunca un valor por defecto inventado.
 * Repository Layer es quien lo traduce a una consulta real; nunca lo
 * construye ni lo interpreta (esa responsabilidad es de Knowledge Assets).
 * Contrato de combinacion cuando varios campos se establecen a la vez:
 * documentado en detalle en interpretRules(), lib/knowledge-assets/
 * interpret-work-query.ts -- unico lugar que construye este objeto.
 */
export interface WorkSearchCriteria {
  readonly author?: string
  readonly genre?: string
  readonly maxAge?: number
  readonly maxDurationMinutes?: number
  readonly minDurationMinutes?: number
  readonly yearFrom?: number
  readonly maxCastSize?: number
}

/**
 * Criterio de busqueda estructurado del dominio Organizaciones (patron
 * oficial ADR SCENAIA-002C.1, especializado para este dominio). Todos los
 * campos opcionales -- su ausencia significa "sin filtrar por ese
 * atributo", nunca un valor por defecto inventado.
 *
 * Cada campo corresponde a una columna real de `institutions`: `type`
 * (CHECK de 9 valores), `country_code`, `region` y `ciudad`. Ninguno
 * representa un estado que el modelo no contenga (PRD-001).
 */
export interface OrganizationSearchCriteria {
  readonly type?: string
  readonly countryCode?: string
  readonly region?: string
  readonly city?: string
}

/**
 * Ubicaciones realmente presentes en el catalogo publico de organizaciones.
 * Mismo patron que `listPublishedWorkAuthors()` en el dominio Obras: el
 * vocabulario de interpretacion se toma del dato real, nunca de un
 * diccionario geografico inventado. Una localidad ausente del catalogo no
 * se reconoce como criterio.
 */
export interface OrganizationLocations {
  readonly regions: string[]
  readonly cities: string[]
}

/**
 * Perfil profesional publico del ecosistema, tal como lo expone
 * `public.profiles`. Recoge exclusivamente columnas reales; ningun campo se
 * infiere ni se completa. `name` es la etiqueta visible: el nombre
 * artistico cuando existe y, si no, el nombre real -- misma clase de
 * decision que `labelOf` ya toma para Obras y Organizaciones, nunca un
 * dato nuevo.
 */
/**
 * Criterio de busqueda estructurado del dominio Personas (patron oficial
 * ADR SCENAIA-002C.1, especializado para este dominio). Todos los campos
 * opcionales -- su ausencia significa "sin filtrar por ese atributo",
 * nunca un valor por defecto inventado.
 *
 * Cada campo corresponde a una columna real de `profiles`: `tipo_perfil`
 * (ENUM), `country_code`, `region` y `ciudad`. `region` y `city` viajan en
 * forma CANONICA (normalizada); Repository Layer las resuelve contra las
 * variantes reales del catalogo antes de consultar.
 */
export interface PersonSearchCriteria {
  readonly profileType?: string
  readonly countryCode?: string
  readonly region?: string
  readonly city?: string
}

/**
 * Ubicaciones realmente presentes en el catalogo publico de personas, en su
 * forma ORIGINAL. Mismo patron que `OrganizationLocations`: el vocabulario
 * de interpretacion procede del dato real, jamas de un diccionario
 * geografico. Una localidad ausente del catalogo no se reconoce.
 */
export interface PersonLocations {
  readonly regions: string[]
  readonly cities: string[]
}

export interface Person {
  id: string
  name: string
  profileType: string
  bio: string | null
  city: string | null
  region: string | null
  countryCode: string | null
  slug: string | null
  isVerified: boolean
}

export interface Organization {
  id: string
  name: string
  type: string
  countryCode: string | null
  region: string | null
  city: string | null
  website: string | null
  slug: string
}

export interface IndividualProfileData {
  readonly biography: string | null
  readonly trajectory: string | null
  readonly training: string | null
  readonly awards: string | null
  readonly specializations: string[]
  readonly availability: string[]
  readonly activityCounters: Record<string, number> | null
  readonly photoUrl: string | null
  readonly website: string | null
  readonly contactEmail: string | null
  readonly contactPhone: string | null
  readonly whatsapp: string | null
  readonly socialLinks: Record<string, string> | null
}

export interface ResponsibleContact {
  readonly name: string
  readonly role: string
  readonly email: string
  readonly phone: string | null
}

export interface OrganizationalProfileData {
  readonly name: string
  readonly commercialName: string | null
  readonly foundingYear: number | null
  readonly description: string | null
  readonly history: string | null
  readonly activityCategories: string[]
  readonly services: string[]
  readonly activityCounters: Record<string, number> | null
  readonly logoUrl: string | null
  readonly website: string | null
  readonly contactEmail: string | null
  readonly contactPhone: string | null
  readonly whatsapp: string | null
  readonly socialLinks: Record<string, string> | null
  readonly responsibleContact: ResponsibleContact | null
}

export interface Subscription {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export type ReservationStatus = 'active' | 'settled' | 'released' | 'expired'

export interface CreditReservation {
  id: string
  profileId: string
  requestId: string | null
  status: ReservationStatus
  estimatedCost: number
  settledCost: number | null
  /**
   * Limite que regia cuando se creo la reserva. `null` significa que NO
   * habia limite -- el plan es ilimitado --, no que se desconozca: es la
   * ausencia real de techo, representada explicitamente y no mediante una
   * cifra convenida (PRD-001). Una reserva de un plan ilimitado se crea,
   * se liquida y se mide igual que cualquier otra; lo unico que no hace
   * es poder denegarse.
   */
  authorizedLimitSnapshot: number | null
  expiresAt: string
  createdAt: string
  settledAt: string | null
}

/**
 * Estado del presupuesto del periodo en el instante de verificar, calculado
 * dentro de la misma operacion atomica que decide (nunca despues, ni por
 * separado: eso reintroduciria la condicion de carrera que el bloqueo por
 * perfil existe para cerrar).
 *
 * Los dos consumos son hechos distintos y por eso viajan separados
 * (PRD-001): `settledConsumption` es consumo real ya liquidado -- no vuelve;
 * `reservedConsumption` es capacidad apartada que todavia puede liquidarse o
 * liberarse. Sumarlos de antemano perderia esa diferencia.
 */
export interface PeriodBudget {
  /** Inicio del periodo vigente: mes natural (ARQUITECTURA_FUNCIONAL §9.2). */
  readonly periodStart: string
  /** Ya consumido y liquidado dentro del periodo. */
  readonly settledConsumption: number
  /** Comprometido en reservas vivas, aun sin resolver. */
  readonly reservedConsumption: number
  /**
   * Lo que resta del presupuesto tras esta operacion. `null` cuando el
   * plan no tiene limite: sin techo, "lo que resta" no es cero -- es una
   * magnitud que no existe. Devolver cero afirmaria lo contrario de lo
   * que ocurre.
   */
  readonly availableCapacity: number | null
}

export interface ReservationAuthorized {
  authorized: true
  reservation: CreditReservation
  budget: PeriodBudget
}

export interface ReservationDenied {
  authorized: false
  currentConsumption: number
  denialReason: string
  budget: PeriodBudget
}

export type ReservationOutcome = ReservationAuthorized | ReservationDenied
