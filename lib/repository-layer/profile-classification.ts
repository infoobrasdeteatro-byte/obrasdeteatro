/**
 * Clasificacion canonica de `profiles.tipo_perfil`: unica fuente de verdad
 * del proyecto para decidir si un perfil representa a una persona o a una
 * organizacion.
 *
 * NO es una regla nueva. Es la que ya regia el Professional Context Engine
 * desde IA-002 (`INDIVIDUAL_TYPES` / `ORGANIZATIONAL_TYPES`) y la que ya
 * declaraban `individual-profile.ts` y `organizational-profile.ts` por
 * separado. Estaba escrita tres veces; aqui queda escrita una sola,
 * ampliada con los tres valores que ninguna de las tres clasificaba.
 *
 * Los tres valores antes sin clasificar:
 *   - `profesional`: persona fisica que presta un servicio (costurera,
 *     escenografo, tecnico). Es persona, aunque todavia no tenga tabla
 *     `perfil_*` propia ni funcion derivable.
 *   - `institucion`: entidad, no persona. Poblacion distinta de la tabla
 *     `institutions`, que recoge organizaciones SIN cuenta de usuario.
 *   - `publico`: cuenta de audiencia. No forma parte del conocimiento
 *     profesional del ecosistema y no pertenece a ningun dominio.
 */
import type { ProfileType } from './types'

export type ProfileEntityKind = 'PERSONA' | 'ORGANIZACION' | 'AUDIENCIA'

/** Perfiles que representan a una persona fisica. */
export const PERSON_PROFILE_TYPES: readonly ProfileType[] = ['actor', 'director', 'dramaturgo', 'profesional']

/** Perfiles que representan a una entidad, no a una persona. */
export const ORGANIZATION_PROFILE_TYPES: readonly ProfileType[] = [
  'compania',
  'productora',
  'teatro',
  'festival',
  'escuela',
  'institucion',
]

/**
 * Subconjunto de `PERSON_PROFILE_TYPES` con tabla `perfil_*` individual
 * (IA-002). `profesional` queda fuera: es persona, pero no tiene tabla
 * especializada todavia.
 */
export const INDIVIDUAL_PROFILE_TYPES: readonly ProfileType[] = ['actor', 'director', 'dramaturgo']

/**
 * Subconjunto de `ORGANIZATION_PROFILE_TYPES` con tabla `perfil_*`
 * organizativa (IA-002). `institucion` queda fuera por el mismo motivo.
 */
export const ORGANIZATIONAL_PROFILE_TYPES: readonly ProfileType[] = [
  'compania',
  'productora',
  'teatro',
  'festival',
  'escuela',
]

/**
 * Funcion pura y total: todo valor de `tipo_perfil` recibe una clase.
 * Un valor desconocido se clasifica como `AUDIENCIA` -- es decir, se
 * excluye del conocimiento. Ante un tipo que no sabemos interpretar,
 * preferimos no publicarlo antes que clasificarlo mal.
 */
export function classifyProfileType(profileType: string): ProfileEntityKind {
  if (PERSON_PROFILE_TYPES.includes(profileType as ProfileType)) return 'PERSONA'
  if (ORGANIZATION_PROFILE_TYPES.includes(profileType as ProfileType)) return 'ORGANIZACION'
  return 'AUDIENCIA'
}
