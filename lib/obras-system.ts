// Sistema Obras — tipos de dominio
// Complementa los tipos generados en types/supabase.ts

export type WorkAccessType =
  | 'public_download'
  | 'premium_download'
  | 'rights_request'
  | 'author_contact'
  | 'editorial_sale'
  | 'private'

export type WorkRightsStatus =
  | 'public_domain'
  | 'managed'
  | 'restricted'
  | 'unknown'

/**
 * Refleja literalmente `institutions_type_check`. `company` y `theater` los
 * incorporo la migracion 20260828120000; mantener este tipo sincronizado
 * evita que un consumidor futuro rechace valores que la base si admite.
 */
export type InstitutionType =
  | 'platform'
  | 'editorial'
  | 'university'
  | 'cultural_org'
  | 'foundation'
  | 'festival'
  | 'other'
  | 'company'
  | 'theater'

export const BIBLIOTECA_OFICIAL_SLUG = 'biblioteca-oficial' as const

export const WORK_ACCESS_LABELS: Record<WorkAccessType, string> = {
  public_download:   'Descarga libre',
  premium_download:  'Descarga Premium',
  rights_request:    'Solicitar derechos',
  author_contact:    'Contactar al autor',
  editorial_sale:    'Venta editorial',
  private:           'No disponible',
}

export const WORK_RIGHTS_LABELS: Record<WorkRightsStatus, string> = {
  public_domain: 'Dominio público',
  managed:       'Derechos gestionados',
  restricted:    'Derechos reservados',
  unknown:       'Estado desconocido',
}
