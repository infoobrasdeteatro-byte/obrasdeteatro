import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/verified/sistemas-cache'
import type { Person, PersonLocations, PersonSearchCriteria } from './types'
import { PERSON_PROFILE_TYPES } from './profile-classification'
import { resolveLocationVariants } from './location-normalization'

const PERSON_COLUMNS = 'id, nombre, apellidos, nombre_artistico, tipo_perfil, bio, ciudad, region, country_code, slug, verificado'
const CACHE_TTL_MS = 60_000

/**
 * Solo los perfiles que representan a una PERSONA entran en este dominio.
 * Antes se excluia unicamente `publico`, de modo que un perfil de compania
 * o de teatro habria entrado como Persona. La clasificacion canonica
 * (`profile-classification.ts`) lo impide por construccion.
 */

/**
 * Etiqueta visible del perfil. Prioriza el nombre artistico porque es el
 * que el profesional ha elegido mostrar; en su ausencia usa el nombre real,
 * con apellidos si constan. Nunca compone un nombre que el perfil no
 * declare, nunca rellena una ausencia.
 */
function displayName(row: { nombre: string; apellidos: string | null; nombre_artistico: string | null }): string {
  if (row.nombre_artistico !== null && row.nombre_artistico.trim().length > 0) return row.nombre_artistico
  return row.apellidos !== null && row.apellidos.trim().length > 0 ? `${row.nombre} ${row.apellidos}` : row.nombre
}

function toPerson(row: {
  id: string
  nombre: string
  apellidos: string | null
  nombre_artistico: string | null
  tipo_perfil: string
  bio: string | null
  ciudad: string | null
  region: string | null
  country_code: string | null
  slug: string | null
  verificado: boolean
}): Person {
  return {
    id: row.id,
    name: displayName(row),
    profileType: row.tipo_perfil,
    bio: row.bio,
    city: row.ciudad,
    region: row.region,
    countryCode: row.country_code,
    slug: row.slug,
    isVerified: row.verificado,
  }
}

/**
 * Perfiles profesionales publicos del ecosistema.
 *
 * Reproduce literalmente las condiciones de la politica RLS ya vigente
 * ("Perfiles publicos visibles": `perfil_publico = true AND activo = true`)
 * y anade la exclusion de borrados logicos y de cuentas de audiencia. No
 * abre ninguna via de acceso que la politica no permitiera ya.
 *
 * Ningun criterio de busqueda todavia: este accesor enumera, igual que
 * `listPublicOrganizations` antes de tener su motor. Los criterios por
 * funcion no estan autorizados en esta fase.
 */
/**
 * Vocabulario geografico real del catalogo publico de personas -- mismo
 * patron que `listOrganizationLocations()`. Devuelve los valores TAL CUAL
 * estan almacenados, con sus mayusculas y espacios originales: la
 * normalizacion es responsabilidad de quien compara, nunca del dato.
 */
export async function listPersonLocations(): Promise<PersonLocations> {
  return withCache('persons:locations', CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('region, ciudad')
      .eq('perfil_publico', true)
      .eq('activo', true)
      .is('deleted_at', null)
      .in('tipo_perfil', [...PERSON_PROFILE_TYPES])
      .limit(200)

    if (error || !data) return { regions: [], cities: [] }

    const regions = data.map((row) => row.region).filter((value): value is string => value !== null)
    const cities = data.map((row) => row.ciudad).filter((value): value is string => value !== null)

    return { regions: [...new Set(regions)], cities: [...new Set(cities)] }
  })
}

/**
 * Perfiles profesionales publicos del ecosistema, filtrados por el criterio
 * ya resuelto. Repository Layer traduce el criterio a la consulta real;
 * nunca lo interpreta (ADR SCENAIA-002C.1).
 *
 * `region` y `city` llegan en forma canonica y se resuelven contra las
 * variantes REALES del catalogo antes de consultar: asi "tenerife" alcanza
 * tambien a la fila almacenada como "tenerife ". Una columna NULL nunca casa
 * con `in(...)`: una persona sin ciudad jamas aparece como coincidencia
 * geografica.
 */
export async function listPublicPersons(criteria: PersonSearchCriteria = {}, limit = 20): Promise<Person[]> {
  return withCache(`persons:public:${JSON.stringify(criteria)}:${limit}`, CACHE_TTL_MS, async () => {
    const locations = await listPersonLocations()
    const supabase = await createClient()

    const base = supabase
      .from('profiles')
      .select(PERSON_COLUMNS)
      .eq('perfil_publico', true)
      .eq('activo', true)
      .is('deleted_at', null)
      .in('tipo_perfil', [...PERSON_PROFILE_TYPES])

    const byType =
      criteria.profileType !== undefined
        ? base.eq('tipo_perfil', criteria.profileType as (typeof PERSON_PROFILE_TYPES)[number])
        : base
    const byCountry = criteria.countryCode !== undefined ? byType.eq('country_code', criteria.countryCode) : byType
    const byRegion =
      criteria.region !== undefined
        ? byCountry.in('region', resolveLocationVariants(criteria.region, locations.regions))
        : byCountry
    const scoped =
      criteria.city !== undefined
        ? byRegion.in('ciudad', resolveLocationVariants(criteria.city, locations.cities))
        : byRegion

    const { data, error } = await scoped.limit(limit)

    if (error || !data) return []

    return data.map(toPerson)
  })
}
