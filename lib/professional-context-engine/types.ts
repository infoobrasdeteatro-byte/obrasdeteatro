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
 * plan/status: fuente autoritativa subscriptions.plan/status (IA-001
 * resuelta). usageLimits: fuente autoritativa Repository Layer, mapeo
 * plan->limite (IA-AUTH-001 resuelta, 2026-07-23) -- 'ILIMITADO' para
 * planes sin cuota, cadena numerica para el resto, `null` si no hay plan.
 * availableCapabilities permanece "no disponible", fuera de alcance.
 */
export interface SubscriptionSection {
  readonly plan: string | null
  readonly status: string | null
  readonly availableCapabilities: string | null
  readonly usageLimits: string | null
}

/**
 * specialty/disciplines/experience: derivados del contrato de familia
 * (Individual u Organizacional) de Repository Layer (IA-002 resuelta,
 * 2026-07-22) -- ver professional-profile-section.ts. `null` cuando no
 * existe fila especializada o el tipo de perfil no pertenece a ninguna
 * de las dos familias (institucion/profesional/publico).
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
