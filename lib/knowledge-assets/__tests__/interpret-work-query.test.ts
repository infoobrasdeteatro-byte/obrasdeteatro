import { describe, it, expect } from 'vitest'
import { interpretWorkQuery, hasUnresolvedAuthor } from '../interpret-work-query'

const KNOWN_AUTHORS = ['Federico García Lorca', 'Lope de Vega', 'Calderón de la Barca']

describe('interpretWorkQuery', () => {
  it('reconoce un autor conocido por apellido, dentro de un nombre completo', () => {
    const result = interpretWorkQuery('obras de lorca', KNOWN_AUTHORS)

    expect(result).toEqual({ author: 'Federico García Lorca' })
  })

  it('no reconoce ningún autor si el texto no menciona a ninguno de los conocidos', () => {
    const result = interpretWorkQuery('obras de shakespeare', KNOWN_AUTHORS)

    expect(result.author).toBeUndefined()
  })

  it('reconoce un autor real con diacrítico aunque la consulta llegue sin él (normalizeText() elimina diacríticos aguas arriba; microexpediente correctivo, SCENAIA-002C)', () => {
    const result = interpretWorkQuery('obras de calderon', KNOWN_AUTHORS)

    expect(result).toEqual({ author: 'Calderón de la Barca' })
  })

  it('el autor devuelto conserva su diacrítico original: la normalización es solo para comparar, nunca para el resultado', () => {
    const result = interpretWorkQuery('obras de calderon', KNOWN_AUTHORS)

    expect(result.author).toBe('Calderón de la Barca')
    expect(result.author).not.toBe('Calderon de la Barca')
  })

  it('reconoce género por coincidencia canónica (comedia)', () => {
    const result = interpretWorkQuery('quiero comedias', [])

    expect(result).toEqual({ genre: 'comedia' })
  })

  it('múltiples sinónimos del mismo concepto canónico producen el mismo criterio', () => {
    const variantes = ['comedia', 'comedias', 'humoristica', 'divertida']

    for (const variante of variantes) {
      expect(interpretWorkQuery(`obra ${variante}`, [])).toEqual({ genre: 'comedia' })
    }
  })

  it('reconoce "musicales" como género, aunque hoy no existan resultados reales (responsabilidad de Repository Layer, no de esta función)', () => {
    const result = interpretWorkQuery('quiero musicales', [])

    expect(result).toEqual({ genre: 'musical' })
  })

  it('reconoce "infantil" como umbral de edad máxima', () => {
    const result = interpretWorkQuery('teatro infantil', [])

    expect(result).toEqual({ maxAge: 8 })
  })

  it('reconoce "corta" y "larga" como umbrales de duración, en direcciones opuestas', () => {
    expect(interpretWorkQuery('obras cortas', [])).toEqual({ maxDurationMinutes: 60 })
    expect(interpretWorkQuery('obras largas', [])).toEqual({ minDurationMinutes: 90 })
  })

  it('reconoce "contemporáneo" como umbral de año', () => {
    const result = interpretWorkQuery('teatro contemporaneo', [])

    expect(result).toEqual({ yearFrom: 1950 })
  })

  it('reconoce "clásicos" (ambigüedad señalada en el ADR SCENAIA-002C.1) hacia género, decisión explícita y documentada', () => {
    const result = interpretWorkQuery('obras clasicas', [])

    expect(result).toEqual({ genre: 'clasico' })
  })

  it('reconoce un número explícito de actores ("para dos actores")', () => {
    expect(interpretWorkQuery('obras para dos actores', [])).toEqual({ maxCastSize: 2 })
    expect(interpretWorkQuery('obras para 3 actores', [])).toEqual({ maxCastSize: 3 })
  })

  it('reconoce "pocos actores" como umbral genérico, distinto de un número explícito', () => {
    const result = interpretWorkQuery('obras para pocos actores', [])

    expect(result).toEqual({ maxCastSize: 4 })
  })

  it('combina varios criterios compatibles detectados en la misma consulta', () => {
    const result = interpretWorkQuery('comedias cortas infantiles', [])

    expect(result).toEqual({ genre: 'comedia', maxDurationMinutes: 60, maxAge: 8 })
  })

  it('un criterio no representable en el modelo (p.ej. "para gira") no produce ningún filtro -- degrada a criterio vacío, nunca inventa uno aproximado', () => {
    const result = interpretWorkQuery('obras para gira', [])

    expect(result).toEqual({})
  })

  it('una consulta sin ningún término reconocible degrada a criterio vacío', () => {
    const result = interpretWorkQuery('hola, que tal', [])

    expect(result).toEqual({})
  })

  it('es determinista: misma entrada produce siempre la misma salida', () => {
    const first = interpretWorkQuery('comedias de lorca', KNOWN_AUTHORS)
    const second = interpretWorkQuery('comedias de lorca', KNOWN_AUTHORS)

    expect(first).toEqual(second)
  })
})

describe('detectAuthor — vocabulario del dominio no identifica a un autor', () => {
  const AUTORES = ['Federico García Lorca', 'Compañía La Bicicleta', 'Teatro del Norte', 'Miguel Mihura']

  it('DEFECTO CORREGIDO: "una obra para una compania con pocos actores" no atribuye autor alguno', () => {
    expect(interpretWorkQuery('tienes una obra para una compania con pocos actores?', AUTORES)).toEqual({
      maxCastSize: 4,
    })
  })

  it('la palabra "teatro" tampoco identifica a un autor cuyo nombre la contiene', () => {
    expect(interpretWorkQuery('que obras de teatro tienes?', AUTORES)).toEqual({})
  })

  it('el nombre propio que si distingue sigue reconociendose', () => {
    expect(interpretWorkQuery('algo de lorca', AUTORES)).toEqual({ author: 'Federico García Lorca' })
    expect(interpretWorkQuery('obras de mihura', AUTORES)).toEqual({ author: 'Miguel Mihura' })
  })

  it('un autor con nombre generico sigue siendo reconocible por su parte distintiva', () => {
    expect(interpretWorkQuery('algo de la bicicleta', AUTORES)).toEqual({ author: 'Compañía La Bicicleta' })
    expect(interpretWorkQuery('obras del norte', AUTORES)).toEqual({ author: 'Teatro del Norte' })
  })
})

describe('hasUnresolvedAuthor — los cuatro estados del criterio en Obras', () => {
  const AUTORES = ['Federico García Lorca', 'Miguel Mihura']

  it('COMPLETO: el autor pedido existe en el catalogo -- nada pendiente', () => {
    const criteria = interpretWorkQuery('obras de lorca', AUTORES)

    expect(criteria).toEqual({ author: 'Federico García Lorca' })
    expect(hasUnresolvedAuthor('obras de lorca', criteria)).toBe(false)
  })

  it('SOLICITADO PERO NO APLICABLE: se pidio un autor que no esta en el catalogo', () => {
    const criteria = interpretWorkQuery('obras de shakespeare', AUTORES)

    expect(criteria).toEqual({})
    expect(hasUnresolvedAuthor('obras de shakespeare', criteria)).toBe(true)
  })

  it('PARCIAL: se aplico el genero pero el autor pedido no existe', () => {
    const criteria = interpretWorkQuery('comedias de chejov', AUTORES)

    expect(criteria).toEqual({ genre: 'comedia' })
    expect(hasUnresolvedAuthor('comedias de chejov', criteria)).toBe(true)
  })

  it('SIN CRITERIO: no se pidio autor alguno -- nada que advertir', () => {
    for (const consulta of ['que obras tienes?', 'obras cortas', 'que obras de teatro hay?']) {
      const criteria = interpretWorkQuery(consulta, AUTORES)
      expect(hasUnresolvedAuthor(consulta, criteria), consulta).toBe(false)
    }
  })

  it('no confunde con autoria el vocabulario que el propio motor consume', () => {
    for (const consulta of [
      'obras de comedia',
      'obras de poca duracion',
      'obras de pocos actores',
      'obras de mucha duracion',
      'una obra para un grupo de actores',
    ]) {
      const criteria = interpretWorkQuery(consulta, AUTORES)
      expect(hasUnresolvedAuthor(consulta, criteria), consulta).toBe(false)
    }
  })

  it('es puro y determinista, y no conoce ningun nombre propio', () => {
    const criteria = interpretWorkQuery('obras de ibsen', AUTORES)

    expect(hasUnresolvedAuthor('obras de ibsen', criteria)).toBe(
      hasUnresolvedAuthor('obras de ibsen', criteria)
    )
    expect(hasUnresolvedAuthor('obras de ibsen', criteria)).toBe(true)
  })
})
