import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/verified/sistemas-cache'
import type { Organization, OrganizationSearchCriteria } from './types'
import { ORGANIZATION_PROFILE_TYPES } from './profile-classification'

const ORGANIZATION_PROFILE_COLUMNS = 'id, nombre, nombre_artistico, tipo_perfil, ciudad, region, country_code, slug, website_url'
const CACHE_TTL_MS = 60_000

/**
 * Organizaciones que existen como CUENTA DE USUARIO en `profiles` --
 * companias, productoras, teatros, festivales, escuelas e instituciones.
 *
 * Poblacion distinta y complementaria de la tabla `institutions`, que
 * recoge organizaciones sin cuenta. Ninguna de las dos duplica a la otra:
 * un teatro con cuenta vive en `profiles`; la Biblioteca Oficial, en
 * `institutions`.
 *
 * IMPORTANTE sobre `type`: aqui viaja el valor literal de `tipo_perfil`
 * ("teatro", "compania", "productora"...), NO el vocabulario de
 * `institutions.type` ("theater", "company"...). No se traduce entre ambos
 * porque tres de los seis valores no tienen equivalente inequivoco
 * (`productora`, `escuela`, `institucion`): inventar la correspondencia
 * seria exactamente el tipo de suposicion que la arquitectura evita. La
 * consecuencia -- un criterio `type` no cruza entre ambos vocabularios --
 * queda documentada como limitacion, nunca resuelta con una equivalencia
 * fabricada.
 */
function toOrganization(row: {
  id: string
  nombre: string
  nombre_artistico: string | null
  tipo_perfil: string
  ciudad: string | null
  region: string | null
  country_code: string | null
  slug: string | null
  website_url: string | null
}): Organization {
  const artistico = row.nombre_artistico

  return {
    id: row.id,
    name: artistico !== null && artistico.trim().length > 0 ? artistico : row.nombre,
    type: row.tipo_perfil,
    countryCode: row.country_code,
    region: row.region,
    city: row.ciudad,
    website: row.website_url,
    slug: row.slug ?? row.id,
  }
}

/**
 * Reproduce las mismas condiciones de visibilidad que `listPublicPersons`
 * -- la politica RLS ya vigente sobre `profiles` -- y aplica los criterios
 * ya declarados en `OrganizationSearchCriteria` sobre las columnas que
 * `profiles` contiene realmente. No introduce ningun criterio nuevo.
 */
export async function listPublicOrganizationProfiles(
  criteria: OrganizationSearchCriteria = {},
  limit = 20
): Promise<Organization[]> {
  return withCache(`orgprofiles:public:${JSON.stringify(criteria)}:${limit}`, CACHE_TTL_MS, async () => {
    // El criterio `type` se compara contra `tipo_perfil` tal cual llega. Si
    // pide un tipo que esta poblacion no puede tener -- porque trae el
    // vocabulario de `institutions` ("theater") o cualquier otro valor --,
    // el resultado correcto es NINGUNO, nunca la lista sin filtrar.
    const tipoPedido = criteria.type
    if (tipoPedido !== undefined && !ORGANIZATION_PROFILE_TYPES.some((tipo) => tipo === tipoPedido)) return []

    const supabase = await createClient()

    const base = supabase
      .from('profiles')
      .select(ORGANIZATION_PROFILE_COLUMNS)
      .eq('perfil_publico', true)
      .eq('activo', true)
      .is('deleted_at', null)
      .in('tipo_perfil', [...ORGANIZATION_PROFILE_TYPES])

    const byType =
      tipoPedido !== undefined
        ? base.eq('tipo_perfil', tipoPedido as (typeof ORGANIZATION_PROFILE_TYPES)[number])
        : base
    const byCountry = criteria.countryCode !== undefined ? byType.eq('country_code', criteria.countryCode) : byType
    const byRegion = criteria.region !== undefined ? byCountry.ilike('region', criteria.region) : byCountry
    const scoped = criteria.city !== undefined ? byRegion.ilike('ciudad', criteria.city) : byRegion

    const { data, error } = await scoped.limit(limit)

    if (error || !data) return []

    return data.map(toOrganization)
  })
}
