import { describe, it, expect } from 'vitest'
import {
  PERSON_PROFILE_TYPES,
  ORGANIZATION_PROFILE_TYPES,
  INDIVIDUAL_PROFILE_TYPES,
  ORGANIZATIONAL_PROFILE_TYPES,
  classifyProfileType,
} from '../profile-classification'

/** Los 11 valores del ENUM real `tipo_perfil` (baseline_schema:26-29). */
const TODOS = [
  'actor',
  'director',
  'dramaturgo',
  'compania',
  'productora',
  'teatro',
  'festival',
  'escuela',
  'institucion',
  'profesional',
  'publico',
]

describe('classifyProfileType — clasificacion canonica', () => {
  it('clasifica como PERSONA a quien representa a una persona fisica', () => {
    for (const tipo of ['actor', 'director', 'dramaturgo', 'profesional']) {
      expect(classifyProfileType(tipo), tipo).toBe('PERSONA')
    }
  })

  it('clasifica como ORGANIZACION a quien representa a una entidad', () => {
    for (const tipo of ['compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion']) {
      expect(classifyProfileType(tipo), tipo).toBe('ORGANIZACION')
    }
  })

  it('clasifica como AUDIENCIA la cuenta de publico', () => {
    expect(classifyProfileType('publico')).toBe('AUDIENCIA')
  })

  it('es TOTAL: los 11 valores reales del ENUM reciben una clase', () => {
    for (const tipo of TODOS) {
      expect(['PERSONA', 'ORGANIZACION', 'AUDIENCIA'], tipo).toContain(classifyProfileType(tipo))
    }
  })

  it('un valor desconocido se excluye del conocimiento, nunca se clasifica mal', () => {
    expect(classifyProfileType('cualquier-cosa')).toBe('AUDIENCIA')
    expect(classifyProfileType('')).toBe('AUDIENCIA')
  })

  it('PERSONA y ORGANIZACION son conjuntos disjuntos', () => {
    for (const tipo of PERSON_PROFILE_TYPES) {
      expect(ORGANIZATION_PROFILE_TYPES, tipo).not.toContain(tipo)
    }
  })

  it('juntos cubren exactamente los 11 valores del ENUM, ni uno mas ni uno menos', () => {
    const cubiertos = [...PERSON_PROFILE_TYPES, ...ORGANIZATION_PROFILE_TYPES, 'publico'].sort()

    expect(cubiertos).toEqual([...TODOS].sort())
  })

  it('conserva la clasificacion ya ratificada por IA-002 para los tipos con tabla perfil_*', () => {
    expect(INDIVIDUAL_PROFILE_TYPES).toEqual(['actor', 'director', 'dramaturgo'])
    expect(ORGANIZATIONAL_PROFILE_TYPES).toEqual(['compania', 'productora', 'teatro', 'festival', 'escuela'])
  })

  it('los subconjuntos con tabla perfil_* estan contenidos en su clase', () => {
    for (const tipo of INDIVIDUAL_PROFILE_TYPES) expect(classifyProfileType(tipo), tipo).toBe('PERSONA')
    for (const tipo of ORGANIZATIONAL_PROFILE_TYPES) expect(classifyProfileType(tipo), tipo).toBe('ORGANIZACION')
  })

  it('es pura y determinista', () => {
    expect(classifyProfileType('teatro')).toBe(classifyProfileType('teatro'))
  })
})
