import { describe, it, expect } from 'vitest'
import { detectKnowledgeDomains } from '@/lib/request-interpreter/domain-rules'
import { interpretWorkQuery } from '@/lib/knowledge-assets/interpret-work-query'
import { interpretOrganizationQuery } from '@/lib/knowledge-assets/interpret-organization-query'
import { interpretPersonQuery } from '@/lib/knowledge-assets/interpret-person-query'
import {
  RESOLVABLE_TERMS,
  buildResolverPrompt,
  composeAugmentedRequest,
  mayNeedResolution,
  parseResolvedTerms,
} from '../vocabulary'

/**
 * INVARIANTE BIDIRECCIONAL de la frontera del resolutor (Bloque A2).
 *
 * `RESOLVABLE_TERMS` no es una lista independiente: es el espejo del
 * vocabulario canonico que los motores deterministas ya reconocen. Hasta A2
 * solo se verificaba una de las dos direcciones, y por eso la lista pudo
 * quedarse atras en silencio mientras Personas y Organizaciones crecian: el
 * modelo traducia bien y el parser descartaba el resultado.
 *
 * Direccion A -> nada emitible sin motor que lo reconozca (impide que la
 *                frontera se relaje e introduzca criterios fantasma).
 * Direccion B -> nada reconocido por un motor queda fuera de lo emitible
 *                (impide que el resolutor sea sordo a lo que el sistema ya
 *                sabe interpretar).
 *
 * La direccion B se comprueba sobre los CANONICOS de cada motor, no sobre
 * cada variante flexiva: el resolutor emite el termino canonico ("actor"),
 * nunca sus variantes ("actriz", "actrices"), que son trabajo del motor.
 */
describe('vocabulario cerrado — invariante bidireccional con los motores reales', () => {
  it('A) todo termino emitible es reconocido hoy por algun motor determinista: la lista no puede relajarse', () => {
    for (const term of RESOLVABLE_TERMS) {
      const esDominio = detectKnowledgeDomains(term).length > 0
      const esCriterioDeObra = Object.keys(interpretWorkQuery(term)).length > 0
      const esTipoDeOrganizacion = Object.keys(interpretOrganizationQuery(term)).length > 0
      const esTipoDePersona = Object.keys(interpretPersonQuery(term)).length > 0

      expect(
        esDominio || esCriterioDeObra || esTipoDeOrganizacion || esTipoDePersona,
        `termino sin motor: ${term}`
      ).toBe(true)
    }
  })

  it('B) todo tipo de perfil que Personas sabe interpretar tiene un termino emitible', () => {
    // Valores canonicos reales de `tipo_perfil` que interpretPersonQuery resuelve.
    for (const tipo of ['actor', 'director', 'dramaturgo', 'profesional']) {
      expect(interpretPersonQuery(tipo).profileType, `${tipo} no lo resuelve el motor`).toBe(tipo)
      expect(RESOLVABLE_TERMS, `el resolutor no puede emitir: ${tipo}`).toContain(tipo)
    }
  })

  it('B) todo tipo de organizacion que el motor sabe interpretar tiene al menos un termino emitible', () => {
    const tiposCubiertos = new Set(
      RESOLVABLE_TERMS.map((term) => interpretOrganizationQuery(term).type).filter((tipo) => tipo !== undefined)
    )

    // Los 8 valores de ORGANIZATION_TYPE_TERMS, que son los admitidos por
    // `institutions_type_check`. Ninguno puede quedar inalcanzable.
    const tipos = ['company', 'theater', 'festival', 'editorial', 'university', 'foundation', 'platform', 'cultural_org']

    for (const tipo of tipos) {
      expect(tiposCubiertos, `ningun termino emitible produce el tipo: ${tipo}`).toContain(tipo)
    }
  })

  it('B) todo concepto que Obras sabe interpretar tiene un termino emitible', () => {
    // Conceptos canonicos de CANONICAL_TERMS, cada uno con el criterio que produce.
    const conceptos = ['comedia', 'musical', 'infantil', 'clasico', 'contemporaneo', 'corta', 'larga', 'pocos actores']

    for (const concepto of conceptos) {
      expect(Object.keys(interpretWorkQuery(concepto)).length, `${concepto} no lo resuelve el motor`).toBeGreaterThan(0)
      expect(RESOLVABLE_TERMS, `el resolutor no puede emitir: ${concepto}`).toContain(concepto)
    }
  })

  it('B) los tres dominios con motor de recuperacion son alcanzables desde la lista', () => {
    const dominios = new Set(RESOLVABLE_TERMS.flatMap((term) => detectKnowledgeDomains(term)))

    expect(dominios).toContain('Obras')
    expect(dominios).toContain('Personas')
    expect(dominios).toContain('Organizaciones')
  })

  it('la ampliacion de A2 no relaja la frontera: un termino ajeno sigue siendo rechazado', () => {
    expect(RESOLVABLE_TERMS).not.toContain('vestuario')
    expect(RESOLVABLE_TERMS).not.toContain('gente')
    expect(RESOLVABLE_TERMS).not.toContain('alguien')
    expect(parseResolvedTerms('vestuario :: vestuario', 'busco vestuario')).toEqual([])
  })

  it('el prompt es puro y determinista, y transporta la lista cerrada completa', () => {
    const prompt = buildResolverPrompt('tienes algo breve?')

    expect(prompt).toBe(buildResolverPrompt('tienes algo breve?'))
    for (const term of RESOLVABLE_TERMS) expect(prompt).toContain(term)
    expect(prompt).toContain('tienes algo breve?')
  })

  it('el prompt exige justificar cada termino y prohibe inventar y devolver cifras', () => {
    const prompt = buildResolverPrompt('x')

    expect(prompt).toContain('fragmento LITERAL')
    expect(prompt).toContain('Nunca inventes terminos')
    expect(prompt).toContain('Nunca devuelvas numeros')
    expect(prompt).toContain('NINGUNO')
  })
})

describe('parseResolvedTerms — todo termino debe estar anclado en lo que el usuario escribio', () => {
  const PETICION = 'tienes alguna pieza breve para un grupo pequeno?'

  it('acepta los terminos cuyo fragmento justificante aparece literalmente en la peticion', () => {
    const bruto = ['obra :: pieza', 'corta :: breve', 'pocos actores :: grupo pequeno'].join('\n')

    expect(parseResolvedTerms(bruto, PETICION)).toEqual(['obra', 'corta', 'pocos actores'])
  })

  it('BLINDAJE: descarta un concepto que el usuario no pidio, aunque el proveedor lo devuelva', () => {
    const bruto = ['obra :: pieza', 'corta :: breve', 'comedia :: divertida'].join('\n')

    expect(parseResolvedTerms(bruto, PETICION)).toEqual(['obra', 'corta'])
  })

  it('BLINDAJE: descarta el termino aunque el proveedor lo devuelva sin ancla alguna', () => {
    expect(parseResolvedTerms('obra, corta, comedia', PETICION)).toEqual([])
  })

  it('BLINDAJE: no vale citar la peticion entera para justificar cualquier cosa', () => {
    expect(parseResolvedTerms(`comedia :: ${PETICION}`, PETICION)).toEqual([])
  })

  it('BLINDAJE: no vale un ancla larga que arrastre media frase', () => {
    expect(parseResolvedTerms('comedia :: alguna pieza breve para un grupo pequeno', PETICION)).toEqual([])
  })

  it('BLINDAJE: no vale un ancla inventada que no figura en la peticion', () => {
    expect(parseResolvedTerms('comedia :: humor y risas', PETICION)).toEqual([])
  })

  it('descarta cualquier termino fuera de la lista cerrada', () => {
    const bruto = ['obra :: pieza', 'inmersiva :: pieza', 'experimental :: breve'].join('\n')

    expect(parseResolvedTerms(bruto, PETICION)).toEqual(['obra'])
  })

  it('descarta cifras: la IA nunca puede fijar un umbral', () => {
    expect(parseResolvedTerms('45 :: breve\n60 minutos :: breve', PETICION)).toEqual([])
  })

  it('NINGUNO, texto libre y respuestas vacias producen lista vacia', () => {
    expect(parseResolvedTerms('NINGUNO', PETICION)).toEqual([])
    expect(parseResolvedTerms('No encuentro terminos aplicables.', PETICION)).toEqual([])
    expect(parseResolvedTerms('', PETICION)).toEqual([])
    expect(parseResolvedTerms(null, PETICION)).toEqual([])
  })

  it('es determinista y no depende del orden en que responda el proveedor', () => {
    const a = parseResolvedTerms('corta :: breve\nobra :: pieza', PETICION)
    const b = parseResolvedTerms('obra :: pieza\ncorta :: breve', PETICION)

    expect(a).toEqual(b)
  })
})

describe('mayNeedResolution — guarda de coste, nunca de significado', () => {
  it('A) una peticion sin criterio no consulta al proveedor', () => {
    expect(mayNeedResolution('¿Qué obras tienes?')).toBe(false)
    expect(mayNeedResolution('¿Qué obras hay disponibles?')).toBe(false)
    expect(mayNeedResolution('¿Qué companias hay?')).toBe(false)
  })

  it('A) tampoco cuando el determinista ya entiende todo el vocabulario empleado', () => {
    expect(mayNeedResolution('¿Qué obras cortas tienes?')).toBe(false)
    expect(mayNeedResolution('¿Qué obras de comedia tienes?')).toBe(false)
    expect(mayNeedResolution('¿Hay alguna obra para pocos actores?')).toBe(false)
  })

  it('B) si queda contenido que el determinista no consume, si merece traducirse', () => {
    expect(mayNeedResolution('¿Qué obras que duren poco tienes?')).toBe(true)
    expect(mayNeedResolution('¿Tienes alguna pieza breve?')).toBe(true)
    expect(mayNeedResolution('Busco algo de Lorca.')).toBe(true)
    expect(mayNeedResolution('algo que podamos montar con pocos interpretes')).toBe(true)
  })

  it('nunca produce ni altera un criterio: solo decide si se gasta una llamada', () => {
    expect(typeof mayNeedResolution('lo que sea')).toBe('boolean')
  })
})

describe('composeAugmentedRequest — la peticion del usuario nunca se altera', () => {
  it('conserva el texto literal y anade los terminos al final', () => {
    expect(composeAugmentedRequest('Tienes algo breve?', ['obra', 'corta'])).toContain('Tienes algo breve?')
  })

  it('sin terminos resueltos, devuelve la peticion intacta', () => {
    expect(composeAugmentedRequest('Tienes algo breve?', [])).toBe('Tienes algo breve?')
  })

  it('introduce los criterios como complemento para no activar dominios ajenos', () => {
    const texto = composeAugmentedRequest('tienes algo?', ['obra', 'corta', 'pocos actores'])

    expect(detectKnowledgeDomains(texto.toLowerCase())).toEqual(['Obras'])
  })
})

describe('composeAugmentedRequest — sin dominio resuelto no se anade criterio alguno', () => {
  it('un criterio suelto NO se anade: activaria un dominio ajeno', () => {
    const texto = composeAugmentedRequest('quiero algo que podamos montar con pocos interpretes', [
      'corta',
      'pocos actores',
    ])

    expect(texto).toBe('quiero algo que podamos montar con pocos interpretes')
    expect(detectKnowledgeDomains(texto)).toEqual([])
  })

  it('con dominio resuelto, los criterios si se anaden subordinados', () => {
    const texto = composeAugmentedRequest('quiero algo breve', ['obra', 'corta', 'pocos actores'])

    expect(detectKnowledgeDomains(texto)).toEqual(['Obras'])
    expect(texto).toContain('para corta pocos actores')
  })

  it('preferir no reconocer nada antes que reconocer un dominio equivocado', () => {
    for (const conceptos of [['pocos actores'], ['corta'], ['comedia', 'pocos actores']]) {
      expect(detectKnowledgeDomains(composeAugmentedRequest('quiero algo', conceptos))).toEqual([])
    }
  })
})

/**
 * Caso que motivo el Bloque A2, reproducido con la salida LITERAL que el
 * proveedor real devolvio durante el diagnostico.
 */
describe('A2 — la frontera deja de descartar lo que el proveedor ya traducia bien', () => {
  it('"quien dirige obras en Ciudad de Mexico": conserva `director`, que antes se perdia', () => {
    const respuestaReal = 'obra :: obras  \ndirector :: dirige'

    expect(parseResolvedTerms(respuestaReal, 'Quien dirige obras en Ciudad de Mexico?')).toEqual([
      'obra',
      'director',
    ])
  })

  it('el termino conservado llega al motor de Personas como criterio real', () => {
    const aumentada = composeAugmentedRequest('quien dirige obras en ciudad de mexico?', ['obra', 'director'])

    expect(detectKnowledgeDomains(aumentada)).toContain('Personas')
    expect(interpretPersonQuery(aumentada).profileType).toBe('director')
  })

  it('acepta los tipos de perfil que antes no podia emitir, siempre anclados', () => {
    expect(parseResolvedTerms('dramaturgo :: escribe obras', 'busco quien escribe obras')).toEqual(['dramaturgo'])
    expect(parseResolvedTerms('profesional :: profesional', 'busco un profesional')).toEqual(['profesional'])
  })

  it('acepta los tipos de organizacion que antes no podia emitir', () => {
    expect(parseResolvedTerms('escuela :: escuela', 'que escuelas hay?')).toEqual(['escuela'])
    expect(parseResolvedTerms('productora :: productora', 'que productoras hay?')).toEqual(['productora'])
  })

  it('ANCLAJE INTACTO: un termino nuevo sin fragmento literal se descarta igual que antes', () => {
    expect(parseResolvedTerms('director :: dirige', 'busco una obra de comedia')).toEqual([])
    expect(parseResolvedTerms('dramaturgo', 'busco un dramaturgo')).toEqual([])
    expect(parseResolvedTerms('escuela :: escuela de teatro de madrid', 'escuela')).toEqual([])
  })

  it('los terminos nuevos NO producen ningun criterio numerico: los umbrales siguen siendo del motor', () => {
    expect(interpretWorkQuery('director dramaturgo profesional escuela productora')).toEqual({})
  })
})

/**
 * A1 — referencias humanas indefinidas.
 *
 * Las respuestas que se pasan al parser son las que el proveedor real
 * devolvio en la bateria de A1, estables en tres pasadas. Estos tests
 * comprueban lo que hace EL SISTEMA con esa salida -- que acepta, que
 * descarta y que dominio resulta --, nunca lo que el proveedor decida
 * decir: eso no es determinista y no se puede fijar en una suite.
 */
describe('A1 — comprension de referencias humanas indefinidas', () => {
  it('POSITIVO: "necesito personas para el reparto" produce el generico de persona', () => {
    const respuestaReal = 'perfil :: personas'
    const terminos = parseResolvedTerms(respuestaReal, 'Necesito personas para el reparto')

    expect(terminos).toEqual(['perfil'])
    expect(detectKnowledgeDomains(composeAugmentedRequest('necesito personas para el reparto', terminos))).toEqual([
      'Personas',
    ])
  })

  it('POSITIVO: "busco gente para una obra" alcanza Personas sin perder Obras', () => {
    const terminos = parseResolvedTerms('perfil :: gente  \nobra :: obra', 'Busco gente para una obra')
    const dominios = detectKnowledgeDomains(composeAugmentedRequest('busco gente para una obra', terminos))

    expect(terminos).toEqual(['obra', 'perfil'])
    expect(dominios).toContain('Personas')
  })

  it('CONTEXTO SUFICIENTE: cuando el usuario expresa el oficio, ademas del generico llega el tipo concreto', () => {
    const terminos = parseResolvedTerms(
      'director :: dirija teatro  \nperfil :: alguien',
      '¿Conoces a alguien que dirija teatro?'
    )

    expect(terminos).toContain('director')
    expect(terminos).toContain('perfil')
  })

  it('AUSENCIA DE CONTEXTO: las palabras indefinidas no son vocabulario emitible por si solas', () => {
    // No se han convertido en terminos: no hay atajo palabra -> dominio.
    expect(RESOLVABLE_TERMS).not.toContain('alguien')
    expect(RESOLVABLE_TERMS).not.toContain('gente')
    expect(RESOLVABLE_TERMS).not.toContain('personas')

    expect(parseResolvedTerms('gente :: gente', 'busco gente')).toEqual([])
    expect(parseResolvedTerms('alguien :: alguien', 'hay alguien?')).toEqual([])
  })

  it('ANTI-FALSO POSITIVO: "una obra con mucha gente en escena" sigue siendo solo Obras', () => {
    const terminos = parseResolvedTerms('obra :: obra', 'Una obra con mucha gente en escena')
    const aumentada = composeAugmentedRequest('una obra con mucha gente en escena', terminos)

    expect(detectKnowledgeDomains(aumentada)).toEqual(['Obras'])
    expect(detectKnowledgeDomains(aumentada)).not.toContain('Personas')
  })

  it('ANTI-FALSO POSITIVO: el tamano del reparto es rasgo de la obra, nunca una peticion de personas', () => {
    // "grupo reducido" describe el reparto: produce criterio de Obras, no Personas.
    const terminos = parseResolvedTerms(
      'obra :: algo  \npocos actores :: grupo reducido',
      'Busco algo para un grupo reducido'
    )
    const aumentada = composeAugmentedRequest('busco algo para un grupo reducido', terminos)

    expect(detectKnowledgeDomains(aumentada)).toEqual(['Obras'])
    expect(interpretWorkQuery(aumentada)).toEqual({ maxCastSize: 4 })
  })

  it('ANTI-INVENCION: el generico de persona exige ancla literal, igual que cualquier otro termino', () => {
    expect(parseResolvedTerms('perfil :: alguien', 'busco una obra de comedia')).toEqual([])
    expect(parseResolvedTerms('perfil', 'necesito personas')).toEqual([])
    expect(parseResolvedTerms('perfil :: necesito personas para el reparto', 'necesito personas')).toEqual([])
  })

  it('ANTI-INVENCION: el generico de persona no produce ningun criterio; Personas queda sin filtrar por tipo', () => {
    const aumentada = composeAugmentedRequest('necesito personas para el reparto', ['perfil'])

    expect(interpretPersonQuery(aumentada)).toEqual({})
    expect(interpretWorkQuery(aumentada)).toEqual({})
  })

  it('las instrucciones declaran la regla de reconocimiento y su contencion, no una lista de frases', () => {
    const prompt = buildResolverPrompt('x')

    expect(prompt).toContain('"perfil" es el termino generico de una persona del ecosistema')
    expect(prompt).toContain('solo piden personas cuando designan a QUIEN se busca')
    expect(prompt).toContain('ahi corresponde "pocos actores", y solo cuando el reparto sea pequeno')
  })

  it('NO REGRESION: la regla de "obra" sigue intacta y sigue siendo la primera', () => {
    const prompt = buildResolverPrompt('x')

    expect(prompt).toContain('"obra" es el termino generico de una pieza teatral')
    expect(prompt.indexOf('"obra" es el termino generico')).toBeLessThan(
      prompt.indexOf('"perfil" es el termino generico')
    )
  })

  it('NO REGRESION: Obras, Organizaciones y Personas conservan su comportamiento determinista', () => {
    expect(detectKnowledgeDomains('que obras de teatro tienes?')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('que companias de teatro hay?')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('que directores hay?')).toEqual(['Personas'])
    expect(interpretWorkQuery('que obras cortas tienes?')).toEqual({ maxDurationMinutes: 60 })
  })
})
