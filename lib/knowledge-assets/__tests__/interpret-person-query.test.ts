import { describe, it, expect } from 'vitest'
import { interpretPersonQuery, hasUnresolvedPersonLocation } from '../interpret-person-query'

/** Catalogo REAL observado en profiles, con su suciedad original intacta. */
const CATALOGO_REAL = {
  regions: ['Canarias', 'Comunidad de Madrid', 'Ciudad de Buenos Aires'],
  cities: ['tenerife ', 'tenerife', 'CAPITAL FEDERAL'],
}

describe('A — tipo profesional desde tipo_perfil', () => {
  it('reconoce los tipos que la clasificacion admite como persona', () => {
    expect(interpretPersonQuery('que actores hay?')).toEqual({ profileType: 'actor' })
    expect(interpretPersonQuery('que directores hay?')).toEqual({ profileType: 'director' })
    expect(interpretPersonQuery('que dramaturgos hay?')).toEqual({ profileType: 'dramaturgo' })
    expect(interpretPersonQuery('que profesionales hay?')).toEqual({ profileType: 'profesional' })
  })

  it('reconoce femeninos y singulares', () => {
    expect(interpretPersonQuery('busco una actriz')).toEqual({ profileType: 'actor' })
    expect(interpretPersonQuery('busco una directora')).toEqual({ profileType: 'director' })
    expect(interpretPersonQuery('busco un dramaturgo')).toEqual({ profileType: 'dramaturgo' })
  })

  it('NUNCA produce un tipo de organizacion: no reintroduce el defecto corregido', () => {
    for (const consulta of ['que companias hay?', 'que productoras hay?', 'que teatros hay?', 'que festivales hay?', 'que escuelas hay?']) {
      expect(interpretPersonQuery(consulta).profileType, consulta).toBeUndefined()
    }
  })

  it('gana el tipo que aparece antes: es el nucleo del sintagma', () => {
    expect(interpretPersonQuery('directores que tambien son actores')).toEqual({ profileType: 'director' })
  })

  it('exige palabra completa', () => {
    expect(interpretPersonQuery('directorio de obras')).toEqual({})
  })
})

describe('B — ubicacion contra el catalogo real', () => {
  it('reconoce la region tal como existe en el catalogo', () => {
    expect(interpretPersonQuery('que directores hay en canarias?', CATALOGO_REAL)).toEqual({
      profileType: 'director',
      region: 'canarias',
    })
  })

  it('reconoce el pais por su nombre real del catalogo geografico del proyecto', () => {
    expect(interpretPersonQuery('que dramaturgos hay en argentina?', CATALOGO_REAL)).toEqual({
      profileType: 'dramaturgo',
      countryCode: 'AR',
    })
  })

  it('reconoce una region de varias palabras', () => {
    expect(interpretPersonQuery('que actores hay en la comunidad de madrid?', CATALOGO_REAL)).toEqual({
      profileType: 'actor',
      region: 'comunidad de madrid',
    })
  })

  it('reconoce la ciudad pese a la suciedad del dato almacenado', () => {
    expect(interpretPersonQuery('hay algun director en tenerife?', CATALOGO_REAL)).toEqual({
      profileType: 'director',
      city: 'tenerife',
    })
  })

  it('normaliza mayusculas, acentos y espacios de forma determinista', () => {
    expect(interpretPersonQuery('alguien en capital federal?', CATALOGO_REAL).city).toBe('capital federal')
    expect(interpretPersonQuery('alguien en TENERIFE?'.toLowerCase(), CATALOGO_REAL).city).toBe('tenerife')
  })

  it('emite la forma canonica, nunca la forma sucia del catalogo', () => {
    expect(interpretPersonQuery('en tenerife', CATALOGO_REAL).city).not.toContain(' ')
  })
})

describe('C — ubicacion inexistente en el catalogo', () => {
  it('"Cuenca" NO se convierte en criterio por ser una ciudad real', () => {
    const criteria = interpretPersonQuery('que directores hay en cuenca?', CATALOGO_REAL)

    expect(criteria).toEqual({ profileType: 'director' })
    expect(criteria.city).toBeUndefined()
  })

  it('pero SI queda declarada como ubicacion pedida y no resuelta', () => {
    const consulta = 'que directores hay en cuenca?'
    const criteria = interpretPersonQuery(consulta, CATALOGO_REAL)

    expect(hasUnresolvedPersonLocation(consulta, criteria)).toBe(true)
  })

  it('sin catalogo, ninguna ubicacion se reconoce', () => {
    expect(interpretPersonQuery('que directores hay en canarias?')).toEqual({ profileType: 'director' })
  })

  it('una ubicacion resuelta no deja nada pendiente', () => {
    const consulta = 'que directores hay en canarias?'
    expect(hasUnresolvedPersonLocation(consulta, interpretPersonQuery(consulta, CATALOGO_REAL))).toBe(false)
  })

  it('sin complemento locativo no hay nada pendiente: no se advierte de lo que nadie pidio', () => {
    const consulta = 'que directores hay?'
    expect(hasUnresolvedPersonLocation(consulta, interpretPersonQuery(consulta, CATALOGO_REAL))).toBe(false)
  })

  it('no confunde con ubicacion lo que sigue a "en" sin ser un lugar', () => {
    for (const consulta of ['que actores hay en total?', 'que actores trabajan en television?', 'que actores hay en general?']) {
      expect(hasUnresolvedPersonLocation(consulta, interpretPersonQuery(consulta, CATALOGO_REAL)), consulta).toBe(false)
    }
  })
})

describe('separacion de ejes: TIPO no es FUNCION', () => {
  it('produce un tipo de perfil, jamas una funcion teatral', () => {
    const criteria = interpretPersonQuery('que directores hay?', CATALOGO_REAL)

    expect(criteria.profileType).toBe('director')
    expect(JSON.stringify(criteria)).not.toContain('direccion')
  })

  it('es puro y determinista', () => {
    const consulta = 'que directores hay en tenerife?'
    expect(interpretPersonQuery(consulta, CATALOGO_REAL)).toEqual(interpretPersonQuery(consulta, CATALOGO_REAL))
  })
})
