import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/verified/sistemas-cache'
import type { Organization, OrganizationLocations, OrganizationSearchCriteria } from './types'

const ORGANIZATION_COLUMNS = 'id, name, type, country_code, region, ciudad, website, slug'
const CACHE_TTL_MS = 60_000

function toOrganization(row: {
  id: string
  name: string
  type: string
  country_code: string | null
  region: string | null
  ciudad: string | null
  website: string | null
  slug: string
}): Organization {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    countryCode: row.country_code,
    region: row.region,
    city: row.ciudad,
    website: row.website,
    slug: row.slug,
  }
}

export async function getPublicOrganizationById(organizationId: string): Promise<Organization | null> {
  return withCache(`org:${organizationId}`, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('institutions')
      .select(ORGANIZATION_COLUMNS)
      .eq('id', organizationId)
      .eq('is_public', true)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    return toOrganization(data)
  })
}

/**
 * Traduce el criterio YA RESUELTO a la consulta real -- nunca lo interpreta
 * ni lo construye (esa responsabilidad es de Knowledge Assets, ADR
 * SCENAIA-002C.1). Solo se filtran los dos atributos que la tabla
 * `institutions` contiene realmente.
 */
export async function listPublicOrganizations(
  criteria: OrganizationSearchCriteria = {},
  limit = 20
): Promise<Organization[]> {
  const cacheKey = `orgs:public:${JSON.stringify(criteria)}:${limit}`

  return withCache(cacheKey, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const baseQuery = supabase
      .from('institutions')
      .select(ORGANIZATION_COLUMNS)
      .eq('is_public', true)
      .eq('is_active', true)

    // Cada filtro se aplica sobre su columna real. Una fila con la columna a
    // NULL nunca casa con `eq`/`ilike`: una organizacion sin ubicacion jamas
    // aparece como coincidencia geografica.
    const byType = criteria.type !== undefined ? baseQuery.eq('type', criteria.type) : baseQuery
    const byCountry = criteria.countryCode !== undefined ? byType.eq('country_code', criteria.countryCode) : byType
    const byRegion = criteria.region !== undefined ? byCountry.ilike('region', criteria.region) : byCountry
    const scoped = criteria.city !== undefined ? byRegion.ilike('ciudad', criteria.city) : byRegion

    const { data, error } = await scoped.limit(limit)

    if (error || !data) return []

    return data.map(toOrganization)
  })
}

/**
 * Vocabulario geografico real del catalogo publico -- mismo patron que
 * `listPublishedWorkAuthors()`. Devuelve solo lo que existe: si ninguna
 * organizacion tiene ciudad, la lista de ciudades queda vacia y ninguna
 * consulta por ciudad se reconocera como criterio.
 */
export async function listOrganizationLocations(): Promise<OrganizationLocations> {
  return withCache('orgs:locations', CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('institutions')
      .select('region, ciudad')
      .eq('is_public', true)
      .eq('is_active', true)
      .limit(200)

    if (error || !data) return { regions: [], cities: [] }

    const regions = data.map((row) => row.region).filter((value): value is string => value !== null)
    const cities = data.map((row) => row.ciudad).filter((value): value is string => value !== null)

    return { regions: [...new Set(regions)], cities: [...new Set(cities)] }
  })
}
