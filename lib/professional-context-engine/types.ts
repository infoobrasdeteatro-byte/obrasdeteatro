import type { ProfessionalProfilePublic } from '@/lib/repository-layer'

/**
 * El PCE nunca vuelve a verificar autenticacion (la garantiza el paso
 * "Autenticacion" del flujo oficial, previo al PCE) -- por eso este campo
 * es un literal unico, no un enum de estados hipoteticos.
 */
export type AuthenticationStatus = 'autenticado'

export interface IdentitySection {
  readonly userId: string
  readonly profileType: string | null
  readonly language: string | null
  readonly country: string | null
  readonly timezone: string | null
  readonly authenticationStatus: AuthenticationStatus
}

/**
 * v1: siempre "no disponible" en las 4 propiedades -- IA-001 (fuente
 * autoritativa de Subscription/plan) permanece abierta y diferida, sin
 * introducir ningun accessor parcial.
 */
export interface SubscriptionSection {
  readonly plan: string | null
  readonly status: string | null
  readonly availableCapabilities: string | null
  readonly usageLimits: string | null
}

/**
 * specialty/disciplines/experience: siempre "no disponible" -- IA-002
 * (contrato de perfiles especializados) permanece abierta.
 */
export interface ProfessionalProfileSection {
  readonly specialty: string | null
  readonly disciplines: string | null
  readonly experience: string | null
  readonly publicProfile: ProfessionalProfilePublic | null
}

export interface SessionSection {
  readonly route: string | null
  readonly module: string | null
  readonly locale: string
  readonly timestamp: string
}

export interface ProfessionalContext {
  readonly identity: IdentitySection
  readonly subscription: SubscriptionSection
  readonly professionalProfile: ProfessionalProfileSection
  readonly session: SessionSection
}
