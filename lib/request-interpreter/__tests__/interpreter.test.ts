import { describe, it, expect } from 'vitest'
import { normalizeRequest } from '../interpreter'

/**
 * F5F-1: `normalizeRequest` ya no acuña identidad -- la recibe. Estas
 * pruebas verifican INTERPRETACION, no identidad, asi que la fijan a un
 * valor constante y siguen expresando exactamente lo que expresaban antes.
 * La identidad tiene sus propias pruebas al final del fichero.
 */
const ID_DE_PRUEBA = 'turno-de-prueba'

function interpretar(
  originalRequest: string,
  previousUserRequests: readonly string[] = [],
  previousDomain: Parameters<typeof normalizeRequest>[3] = null
) {
  return normalizeRequest(originalRequest, ID_DE_PRUEBA, previousUserRequests, previousDomain)
}


describe('normalizeRequest', () => {
  it('produce un NormalizedRequest completo para una peticion clara de un unico dominio', () => {
    const result = interpretar('¿Qué casting hay esta semana?')

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
    const result = interpretar('hola, buenos dias')

    expect(result.requestType).toBe('NO_RECONOCIDA')
    expect(result.requestedKnowledgeDomains).toEqual([])
    expect(result.professionalContextLevel).toBe('MINIMAL')
    expect(result.detectedAmbiguities).toContain('no se reconoce ningun patron de dominio en la peticion')
    expect(result.interpretationConfidence).toBe(0)
  })

  it('marca ambiguedad cuando coinciden multiples dominios a la vez', () => {
    const result = interpretar('busco obras y companias')

    expect(result.requestedKnowledgeDomains).toHaveLength(2)
    expect(result.detectedAmbiguities).toContain('la peticion coincide con multiples dominios de conocimiento simultaneamente')
    expect(result.interpretationConfidence).toBe(0.5)
    expect(result.estimatedComplexity).toBe('alta')
  })

  it('marca peticion vacia como ambigua y degrada de forma segura', () => {
    const result = interpretar('')

    expect(result.detectedAmbiguities).toContain('peticion vacia')
    expect(result.requestType).toBe('NO_RECONOCIDA')
    expect(result.professionalContextLevel).toBe('MINIMAL')
  })

  it('nunca produce ProfessionalContextLevel = FULL', () => {
    const inputs = ['¿qué casting hay?', 'hola', '', 'busco una compania para representar mi obra']
    for (const input of inputs) {
      expect(interpretar(input).professionalContextLevel).not.toBe('FULL')
    }
  })

  /**
   * F5F-1 -- SUSTITUYE a la prueba que exigia "un requestId distinto en
   * cada llamada". Aquella fijaba el defecto: interpretar dos veces el
   * mismo turno producia dos identidades, y en produccion eso partio la
   * trazabilidad de un turno real en dos mitades inconexas.
   */
  it('NO acuña identidad: devuelve exactamente la que recibe', () => {
    expect(normalizeRequest('hola', 'identidad-recibida').requestId).toBe('identidad-recibida')
  })

  it('DOS interpretaciones del mismo turno conservan la identidad', () => {
    // Es literalmente lo que ocurre cuando el resolutor devuelve terminos y
    // hay que reinterpretar la peticion aumentada.
    const primera = normalizeRequest('busco algo divertido', 'turno-1')
    const segunda = normalizeRequest('busco algo divertido obra para comedia', 'turno-1')

    expect(primera.requestId).toBe(segunda.requestId)
  })

  it('turnos distintos conservan identidades distintas', () => {
    expect(normalizeRequest('hola', 'turno-1').requestId).not.toBe(normalizeRequest('hola', 'turno-2').requestId)
  })
})

describe('normalizeRequest — continuidad contextual (Reconexion del Nucleo Conversacional)', () => {
  const TURNO_1 = '¿Qué obras de comedia tienes?'

  it('sin turnos previos se comporta exactamente como antes: retrievalQuery es el propio texto normalizado', () => {
    const result = interpretar(TURNO_1)

    expect(result.retrievalQuery).toBe(result.normalizedIntent)
    expect(result.requestedKnowledgeDomains).toContain('Obras')
  })

  it('un turno de continuacion sin dominio propio hereda el dominio de la conversacion', () => {
    const solo = interpretar('¿Y alguna más corta?')
    const enContexto = interpretar('¿Y alguna más corta?', [TURNO_1])

    expect(solo.requestedKnowledgeDomains).toEqual([])
    expect(enContexto.requestedKnowledgeDomains).toContain('Obras')
  })

  it('el turno de continuacion conserva los criterios previos y suma el nuevo', () => {
    const result = interpretar('¿Y alguna más corta?', [TURNO_1])

    expect(result.retrievalQuery).toContain('comedia')
    expect(result.retrievalQuery).toContain('corta')
  })

  it('un turno que nombra su propio dominio nunca hereda: la herencia se corta sola', () => {
    const result = interpretar('¿Y qué obras infantiles tienes?', [TURNO_1])

    expect(result.retrievalQuery).toBe(result.normalizedIntent)
    expect(result.retrievalQuery).not.toContain('comedia')
  })

  it('normalizedIntent nunca se contamina con el contexto: sigue siendo solo el turno actual', () => {
    const result = interpretar('¿Y alguna más corta?', [TURNO_1])

    expect(result.normalizedIntent).toBe('¿y alguna mas corta?')
    expect(result.normalizedIntent).not.toContain('comedia')
  })

  it('originalRequest nunca se altera: es siempre el texto literal del usuario', () => {
    const result = interpretar('¿Y alguna más corta?', [TURNO_1])

    expect(result.originalRequest).toBe('¿Y alguna más corta?')
  })

  it('acota la ventana de contexto a los tres ultimos turnos del usuario', () => {
    const result = interpretar('¿Y cuál recomendarías?', [
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
    const conVacio = interpretar('¿Y alguna más corta?', [])
    const sinParametro = interpretar('¿Y alguna más corta?')

    expect(conVacio.retrievalQuery).toBe(sinParametro.retrievalQuery)
    expect(conVacio.requestedKnowledgeDomains).toEqual(sinParametro.requestedKnowledgeDomains)
  })

  it('es determinista: misma entrada, misma retrievalQuery', () => {
    expect(interpretar('¿Y alguna más corta?', [TURNO_1]).retrievalQuery).toBe(
      interpretar('¿Y alguna más corta?', [TURNO_1]).retrievalQuery
    )
  })
})

/**
 * FASE 3 — herencia de dominio desde el estado conversacional.
 *
 * El dominio previo llega ya resuelto desde fuera. Este componente no sabe
 * de donde viene, no conoce ningun estado conversacional y sigue sin poder
 * conocerlo: recibe un KnowledgeDomain, que es el unico tipo que su
 * invariante le autoriza a manejar.
 */
describe('B · dominio heredado del estado conversacional', () => {
  const OBRAS_T1 = '¿Qué obras de comedia tienes?'

  it('un turno sin dominio propio ni historial hereda el dominio vigente', () => {
    const resultado = interpretar('¿y alguna más larga?', [], 'Obras')

    expect(resultado.requestedKnowledgeDomains).toEqual(['Obras'])
  })

  it('EL DEFECTO VERIFICADO: cuando el turno inicial ya salio de la ventana, el dominio sobrevive igual', () => {
    // Tres turnos de continuacion: el que nombraba "obras" ya no esta en
    // `slice(-3)`, exactamente como ocurrio en el turno 5 de produccion.
    const ventanaSinDominio = ['¿y alguna más corta?', '¿y alguna más larga?', '¿y alguna más larga?']

    expect(interpretar('¿y alguna más larga?', ventanaSinDominio).requestedKnowledgeDomains).toEqual([])
    expect(interpretar('¿y alguna más larga?', ventanaSinDominio, 'Obras').requestedKnowledgeDomains).toEqual([
      'Obras',
    ])
  })

  it('NOMBRAR UN DOMINIO CORTA LA HERENCIA: la regla vigente se conserva intacta', () => {
    const resultado = interpretar('¿Qué compañías hay en Madrid?', [], 'Obras')

    expect(resultado.requestedKnowledgeDomains).toEqual(['Organizaciones'])
    expect(resultado.requestedKnowledgeDomains).not.toContain('Obras')
  })

  it('el historial tiene precedencia sobre el estado: lo mas reciente manda', () => {
    const resultado = interpretar('¿y alguna más larga?', [OBRAS_T1], 'Organizaciones')

    expect(resultado.requestedKnowledgeDomains).toEqual(['Obras'])
  })

  it('sin dominio previo el comportamiento es exactamente el anterior a la Fase 3', () => {
    expect(interpretar('¿y alguna más larga?', []).requestedKnowledgeDomains).toEqual(
      interpretar('¿y alguna más larga?', [], null).requestedKnowledgeDomains
    )
  })

  it('el dominio previo solo resuelve ESTE turno: no se almacena ni se propaga', () => {
    const resultado = interpretar('¿y alguna más larga?', [], 'Obras')

    expect(Object.keys(resultado)).not.toContain('previousDomain')
    expect(Object.keys(resultado)).not.toContain('conversationState')
  })
})

describe('K · compatibilidad de NormalizedRequest', () => {
  it('el contrato conserva EXACTAMENTE sus campos: la Fase 3 no anade ninguno', () => {
    expect(Object.keys(interpretar('¿Qué obras tienes?', [], 'Obras')).sort()).toEqual([
      'detectedAmbiguities',
      'estimatedComplexity',
      'interpretationConfidence',
      'normalizedIntent',
      'originalRequest',
      'professionalContextLevel',
      'requestId',
      'requestType',
      'requestedKnowledgeDomains',
      'retrievalQuery',
      'timestamp',
    ])
  })

  it('no aparece ningun campo del estado conversacional', () => {
    const claves = Object.keys(interpretar('¿Qué obras tienes?', ['previo'], 'Obras'))

    for (const prohibido of ['conversationState', 'conversationId', 'stateVersion', 'criteriaByDomain', 'lastResult']) {
      expect(claves, prohibido).not.toContain(prohibido)
    }
  })

  it('la ventana de continuidad no ha cambiado: sigue arrastrando tres turnos', () => {
    const cuatro = ['uno obras', 'dos', 'tres', 'cuatro']
    const query = interpretar('¿y alguna más?', cuatro).retrievalQuery

    expect(query).not.toContain('uno obras')
    expect(query).toContain('dos')
  })
})
