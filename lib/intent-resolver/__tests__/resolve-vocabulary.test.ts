import { describe, it, expect, vi } from 'vitest'
import { interpretWorkQuery } from '@/lib/knowledge-assets/interpret-work-query'
import { detectKnowledgeDomains } from '@/lib/request-interpreter/domain-rules'
import { normalizeText } from '@/lib/request-interpreter/normalize-text'
import { resolveVocabulary } from '../resolve-vocabulary'
import { composeAugmentedRequest } from '../vocabulary'

/** Simula al proveedor devolviendo lo que un modelo bien instruido devolveria. */
const proveedorQueDevuelve = (contenido: string | null) => vi.fn().mockResolvedValue(contenido)

/** Reproduce el cableado real: terminos resueltos -> motores deterministas. */
function criteriosResultantes(peticion: string, terminos: string[]) {
  const texto = normalizeText(composeAugmentedRequest(peticion, terminos))
  return { dominios: detectKnowledgeDomains(texto), criterios: interpretWorkQuery(texto) }
}

describe('resolveVocabulary — formulaciones equivalentes producen los mismos criterios', () => {
  it('1) "obras cortas" (vocabulario canonico) no necesita al resolutor', () => {
    expect(criteriosResultantes('que obras cortas tienes?', []).criterios).toEqual({ maxDurationMinutes: 60 })
  })

  it('2) "obras que duren poco" resuelta produce el MISMO criterio que "obras cortas"', async () => {
    const terminos = await resolveVocabulary(
      'Que obras que duren poco tienes?',
      proveedorQueDevuelve('obra :: obras\ncorta :: duren poco')
    )

    expect(criteriosResultantes('que obras que duren poco tienes?', terminos)).toEqual({
      dominios: ['Obras'],
      criterios: { maxDurationMinutes: 60 },
    })
  })

  it('3) "alguna pieza breve": el criterio ya se reconocia, lo que faltaba era el DOMINIO', async () => {
    // "breve" ya es sinonimo canonico de CORTA; sin resolutor se pierde el dominio.
    expect(criteriosResultantes('tienes alguna pieza breve?', [])).toEqual({
      dominios: [],
      criterios: { maxDurationMinutes: 60 },
    })

    const terminos = await resolveVocabulary(
      'Tienes alguna pieza breve?',
      proveedorQueDevuelve('obra :: pieza\ncorta :: breve')
    )

    expect(criteriosResultantes('tienes alguna pieza breve?', terminos)).toEqual({
      dominios: ['Obras'],
      criterios: { maxDurationMinutes: 60 },
    })
  })

  it('4) "para pocos actores" ya funciona de forma determinista', () => {
    expect(criteriosResultantes('hay alguna obra para pocos actores?', []).criterios).toEqual({ maxCastSize: 4 })
  })

  it('5) "pieza breve para un grupo pequeno" resuelve DOS criterios combinados', async () => {
    const terminos = await resolveVocabulary(
      'Tienes alguna pieza breve para un grupo pequeno?',
      proveedorQueDevuelve('obra :: pieza\ncorta :: breve\npocos actores :: grupo pequeno')
    )

    expect(criteriosResultantes('tienes alguna pieza breve para un grupo pequeno?', terminos)).toEqual({
      dominios: ['Obras'],
      criterios: { maxDurationMinutes: 60, maxCastSize: 4 },
    })
  })

  it('6) "algo de Lorca" resuelve el dominio; el autor lo sigue reconociendo el motor contra el catalogo real', async () => {
    const terminos = await resolveVocabulary('Busco algo de Lorca.', proveedorQueDevuelve('obra :: Busco algo'))
    const texto = normalizeText(composeAugmentedRequest('Busco algo de Lorca.', terminos))

    expect(detectKnowledgeDomains(texto)).toEqual(['Obras'])
    expect(interpretWorkQuery(texto, ['Federico Garcia Lorca'])).toEqual({ author: 'Federico Garcia Lorca' })
    expect(interpretWorkQuery(texto, [])).toEqual({})
  })

  it('7) formulacion ambigua: el resolutor NO inventa criterio alguno', async () => {
    const terminos = await resolveVocabulary('Tienes algo interesante?', proveedorQueDevuelve('NINGUNO'))

    expect(terminos).toEqual([])
    expect(criteriosResultantes('tienes algo interesante?', terminos)).toEqual({ dominios: [], criterios: {} })
  })

  it('7 bis) aunque el proveedor invente, nada inventado llega a los criterios', async () => {
    const terminos = await resolveVocabulary(
      'algo raro',
      proveedorQueDevuelve('experimental :: raro\ninmersiva :: raro\n75 minutos :: raro')
    )

    expect(terminos).toEqual([])
  })

  it('BLINDAJE de extremo a extremo: un concepto no pedido nunca llega a los criterios', async () => {
    const terminos = await resolveVocabulary(
      'Tienes alguna pieza breve?',
      proveedorQueDevuelve('obra :: pieza\ncorta :: breve\ncomedia :: divertida')
    )

    expect(terminos).toEqual(['obra', 'corta'])
    expect(criteriosResultantes('tienes alguna pieza breve?', terminos).criterios).not.toHaveProperty('genre')
  })

  it('los criterios se anaden como complemento: "pocos actores" no activa Personas', () => {
    const texto = normalizeText(composeAugmentedRequest('tienes algo?', ['obra', 'corta', 'pocos actores']))

    expect(detectKnowledgeDomains(texto)).toEqual(['Obras'])
  })

  it('la peticion literal del usuario nunca se altera', () => {
    expect(composeAugmentedRequest('Tienes algo breve?', ['obra', 'corta'])).toContain('Tienes algo breve?')
    expect(composeAugmentedRequest('Tienes algo breve?', [])).toBe('Tienes algo breve?')
  })

  it('nunca lanza: si el proveedor falla, degrada exactamente al comportamiento anterior', async () => {
    const roto = vi.fn().mockRejectedValue(new Error('proveedor caido'))

    await expect(resolveVocabulary('tienes alguna pieza breve?', roto)).resolves.toEqual([])
  })

  it('no invoca al proveedor con una peticion vacia', async () => {
    const proveedor = proveedorQueDevuelve('obra :: x')

    expect(await resolveVocabulary('   ', proveedor)).toEqual([])
    expect(proveedor).not.toHaveBeenCalled()
  })

  it('COSTE: no invoca al proveedor cuando el determinista ya entiende la peticion completa', async () => {
    const proveedor = proveedorQueDevuelve('obra :: obras')

    expect(await resolveVocabulary('Que obras de comedia tienes?', proveedor)).toEqual([])
    expect(await resolveVocabulary('Hay alguna obra para pocos actores?', proveedor)).toEqual([])
    expect(await resolveVocabulary('Que obras tienes?', proveedor)).toEqual([])
    expect(proveedor).not.toHaveBeenCalled()
  })

  it('COSTE: si invoca al proveedor cuando queda contenido sin interpretar', async () => {
    const proveedor = proveedorQueDevuelve('obra :: pieza')

    await resolveVocabulary('Tienes alguna pieza breve?', proveedor)

    expect(proveedor).toHaveBeenCalledTimes(1)
  })
})
