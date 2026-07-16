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
