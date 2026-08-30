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
    const result = normalizeRequest('busco obras y companias')

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

describe('normalizeRequest — continuidad contextual (Reconexion del Nucleo Conversacional)', () => {
  const TURNO_1 = '¿Qué obras de comedia tienes?'

  it('sin turnos previos se comporta exactamente como antes: retrievalQuery es el propio texto normalizado', () => {
    const result = normalizeRequest(TURNO_1)

    expect(result.retrievalQuery).toBe(result.normalizedIntent)
    expect(result.requestedKnowledgeDomains).toContain('Obras')
  })

  it('un turno de continuacion sin dominio propio hereda el dominio de la conversacion', () => {
    const solo = normalizeRequest('¿Y alguna más corta?')
    const enContexto = normalizeRequest('¿Y alguna más corta?', [TURNO_1])

    expect(solo.requestedKnowledgeDomains).toEqual([])
    expect(enContexto.requestedKnowledgeDomains).toContain('Obras')
  })

  it('el turno de continuacion conserva los criterios previos y suma el nuevo', () => {
    const result = normalizeRequest('¿Y alguna más corta?', [TURNO_1])

    expect(result.retrievalQuery).toContain('comedia')
    expect(result.retrievalQuery).toContain('corta')
  })

  it('un turno que nombra su propio dominio nunca hereda: la herencia se corta sola', () => {
    const result = normalizeRequest('¿Y qué obras infantiles tienes?', [TURNO_1])

    expect(result.retrievalQuery).toBe(result.normalizedIntent)
    expect(result.retrievalQuery).not.toContain('comedia')
  })

  it('normalizedIntent nunca se contamina con el contexto: sigue siendo solo el turno actual', () => {
    const result = normalizeRequest('¿Y alguna más corta?', [TURNO_1])

    expect(result.normalizedIntent).toBe('¿y alguna mas corta?')
    expect(result.normalizedIntent).not.toContain('comedia')
  })

  it('originalRequest nunca se altera: es siempre el texto literal del usuario', () => {
    const result = normalizeRequest('¿Y alguna más corta?', [TURNO_1])

    expect(result.originalRequest).toBe('¿Y alguna más corta?')
  })

  it('acota la ventana de contexto a los tres ultimos turnos del usuario', () => {
    const result = normalizeRequest('¿Y cuál recomendarías?', [
      '¿Qué compañías de teatro hay?',
      '¿Qué obras de comedia tienes?',
      '¿Y alguna más corta?',
      '¿Y alguna para pocos actores?',
    ])

    expect(result.retrievalQuery).not.toContain('companias')
    expect(result.retrievalQuery).toContain('comedia')
    expect(result.retrievalQuery).toContain('pocos actores')
  })

  it('un historial vacio se comporta igual que ausencia de historial', () => {
    const conVacio = normalizeRequest('¿Y alguna más corta?', [])
    const sinParametro = normalizeRequest('¿Y alguna más corta?')

    expect(conVacio.retrievalQuery).toBe(sinParametro.retrievalQuery)
    expect(conVacio.requestedKnowledgeDomains).toEqual(sinParametro.requestedKnowledgeDomains)
  })

  it('es determinista: misma entrada, misma retrievalQuery', () => {
    expect(normalizeRequest('¿Y alguna más corta?', [TURNO_1]).retrievalQuery).toBe(
      normalizeRequest('¿Y alguna más corta?', [TURNO_1]).retrievalQuery
    )
  })
})
