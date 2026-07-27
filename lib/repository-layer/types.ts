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
}

export interface Organization {
  id: string
  name: string
  type: string
  countryCode: string | null
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
  authorizedLimitSnapshot: number
  expiresAt: string
  createdAt: string
  settledAt: string | null
}

export interface ReservationAuthorized {
  authorized: true
  reservation: CreditReservation
}

export interface ReservationDenied {
  authorized: false
  currentConsumption: number
  denialReason: string
}

export type ReservationOutcome = ReservationAuthorized | ReservationDenied
