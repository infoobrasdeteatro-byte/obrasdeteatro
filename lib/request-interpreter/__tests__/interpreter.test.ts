import { describe, it, expect } from 'vitest'
import { normalizeRequest } from '../interpreter'

describe('normalizeRequest', () => {
  it('produce un NormalizedRequest completo para una peticion clara de un unico dominio', () => {
    const result = normalizeRequest('¿Qué casting hay esta semana?')

    expect(result.originalRequest).toBe('¿Qué casting hay esta semana?')
    expect(result.normalizedIntent).toBe('¿que casting hay esta semana?')
    expect(result.requestType).toBe('RECONOCIDA')
    expect(result.requestedKnowledgeDomains).toEqual(['Oportunidades'])
    expect(result.professionalContextLevel).toBe('STANDARD')
    expect(result.detectedAmbiguities).toEqual([])
    expect(result.interpretationConfidence).toBe(1)
    expect(typeof result.requestId).toBe('string')
    expect(result.requestId).not.toBe('')
    expect(typeof result.timestamp).toBe('string')
  })

  it('degrada de forma segura ante una peticion no reconocida, sin bloquear el pipeline', () => {
    const result = normalizeRequest('hola, buenos dias')

    expect(result.requestType).toBe('NO_RECONOCIDA')
    expect(result.requestedKnowledgeDomains).toEqual([])
    expect(result.professionalContextLevel).toBe('MINIMAL')
    expect(result.detectedAmbiguities).toContain('no se reconoce ningun patron de dominio en la peticion')
    expect(result.interpretationConfidence).toBe(0)
  })

  it('marca ambiguedad cuando coinciden multiples dominios a la vez', () => {
    const result = normalizeRequest('busco una compania para representar mi obra')

    expect(result.requestedKnowledgeDomains).toHaveLength(2)
    expect(result.detectedAmbiguities).toContain('la peticion coincide con multiples dominios de conocimiento simultaneamente')
    expect(result.interpretationConfidence).toBe(0.5)
    expect(result.estimatedComplexity).toBe('alta')
  })

  it('marca peticion vacia como ambigua y degrada de forma segura', () => {
    const result = normalizeRequest('')

    expect(result.detectedAmbiguities).toContain('peticion vacia')
    expect(result.requestType).toBe('NO_RECONOCIDA')
    expect(result.professionalContextLevel).toBe('MINIMAL')
  })

  it('nunca produce ProfessionalContextLevel = FULL', () => {
    const inputs = ['¿qué casting hay?', 'hola', '', 'busco una compania para representar mi obra']
    for (const input of inputs) {
      expect(normalizeRequest(input).professionalContextLevel).not.toBe('FULL')
    }
  })

  it('genera un requestId distinto en cada llamada', () => {
    const first = normalizeRequest('hola')
    const second = normalizeRequest('hola')
    expect(first.requestId).not.toBe(second.requestId)
  })
})
