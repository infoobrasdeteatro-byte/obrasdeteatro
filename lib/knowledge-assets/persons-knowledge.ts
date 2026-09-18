import { listPublicPersons } from '@/lib/repository-layer'
import type { PersonSearchCriteria } from '@/lib/repository-layer'
import type { PersonKnowledgeItem } from './types'
import { catalogProvenance } from './provenance'
import { derivePersonFunctions } from './theatrical-function'

/**
 * Dominio Personas -- mismo patron que `works-knowledge` y
 * `organizations-knowledge`: empaqueta lo que Repository Layer ya devuelve,
 * sin acceder nunca a persistencia por su cuenta.
 *
 * La procedencia es la del catalogo propio: el perfil es dato verificado del
 * ecosistema. `sourceName`/`sourceUrl` viajan en `null` porque `profiles` no
 * declara fuente externa alguna -- nunca se fabrica una.
 *
 * La funcion se deriva EXCLUSIVAMENTE de `tipo_perfil`, columna enumerada.
 * Nunca de la biografia, nunca del nombre, nunca de la ubicacion.
 */
export async function listPersonKnowledge(
  criteria: PersonSearchCriteria = {},
  limit?: number
): Promise<PersonKnowledgeItem[]> {
  const persons = await listPublicPersons(criteria, limit)

  return persons.map((data) => ({
    domain: 'Personas' as const,
    data,
    provenance: catalogProvenance(),
    functions: derivePersonFunctions(data.profileType),
  }))
}
