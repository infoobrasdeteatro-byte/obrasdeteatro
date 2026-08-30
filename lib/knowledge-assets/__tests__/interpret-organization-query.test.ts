import { describe, it, expect } from 'vitest'
import { interpretOrganizationQuery, hasUnresolvedLocation } from '../interpret-organization-query'

describe('interpretOrganizationQuery — criterios respaldados por el dato real', () => {
  it('A) 1) reconoce el tipo compania (valor "company", incorporado por la migracion 20260828120000)', () => {
    expect(interpretOrganizationQuery('que companias de teatro hay?')).toEqual({ type: 'company' })
  })

  it('2) reconoce el tipo teatro (valor "theater")', () => {
    expect(interpretOrganizationQuery('que teatros hay?')).toEqual({ type: 'theater' })
  })

  it('9) sin ningun criterio reconocible devuelve criterio vacio: "sin filtrar", nunca un valor por defecto', () => {
    expect(interpretOrganizationQuery('que organizaciones hay?')).toEqual({})
  })

  it('D) reconoce el tipo festival, valor admitido por el CHECK real de institutions', () => {
    expect(interpretOrganizationQuery('que festivales hay?')).toEqual({ type: 'festival' })
    expect(interpretOrganizationQuery('busco un festival')).toEqual({ type: 'festival' })
  })

  it('reconoce los demas tipos reales del modelo', () => {
    expect(interpretOrganizationQuery('editoriales de teatro')).toEqual({ type: 'editorial' })
    expect(interpretOrganizationQuery('universidades')).toEqual({ type: 'university' })
    expect(interpretOrganizationQuery('fundaciones culturales')).toEqual({ type: 'foundation' })
    expect(interpretOrganizationQuery('plataformas')).toEqual({ type: 'platform' })
    expect(interpretOrganizationQuery('asociacion cultural')).toEqual({ type: 'cultural_org' })
  })

  it('reconoce el pais por su nombre real del catalogo geografico del proyecto', () => {
    expect(interpretOrganizationQuery('festivales en espana')).toEqual({ type: 'festival', countryCode: 'ES' })
    expect(interpretOrganizationQuery('organizaciones en argentina')).toEqual({ countryCode: 'AR' })
  })

  it('nunca reconoce el pais por su codigo de dos letras: "es" es una palabra corriente', () => {
    expect(interpretOrganizationQuery('esto es lo que busco')).toEqual({})
    expect(interpretOrganizationQuery('ar')).toEqual({})
  })

  it('exige palabra completa: no confunde un termino dentro de otra palabra', () => {
    expect(interpretOrganizationQuery('festivalero')).toEqual({})
  })

  it('es pura y determinista', () => {
    expect(interpretOrganizationQuery('festivales en espana')).toEqual(interpretOrganizationQuery('festivales en espana'))
  })

  it('nunca produce un criterio con valores fuera del CHECK real de institutions', () => {
    const ADMITIDOS = ['platform', 'editorial', 'university', 'cultural_org', 'foundation', 'festival', 'other', 'company', 'theater']
    for (const consulta of ['festivales', 'editoriales', 'universidades', 'fundaciones', 'plataformas', 'entidad cultural']) {
      const { type } = interpretOrganizationQuery(consulta)
      if (type !== undefined) expect(ADMITIDOS).toContain(type)
    }
  })
})

describe('interpretOrganizationQuery — ubicacion tomada del catalogo real', () => {
  const CONOCIDAS = { regions: ['Canarias', 'Comunidad de Madrid'], cities: ['Madrid', 'Barcelona', 'Santa Cruz de Tenerife'] }

  it('6) reconoce la ciudad cuando existe en el catalogo', () => {
    expect(interpretOrganizationQuery('que hay en barcelona?', CONOCIDAS)).toEqual({ city: 'Barcelona' })
  })

  it('5) reconoce la region cuando existe en el catalogo', () => {
    expect(interpretOrganizationQuery('que hay en canarias?', CONOCIDAS)).toEqual({ region: 'Canarias' })
  })

  it('7) combina tipo y ciudad: "companias de teatro en Madrid"', () => {
    expect(interpretOrganizationQuery('que companias de teatro hay en madrid?', CONOCIDAS)).toEqual({
      type: 'company',
      city: 'Madrid',
    })
  })

  it('7 bis) combina tipo y ciudad: "teatros en Barcelona"', () => {
    expect(interpretOrganizationQuery('que teatros hay en barcelona?', CONOCIDAS)).toEqual({
      type: 'theater',
      city: 'Barcelona',
    })
  })

  it('8) combina tipo y region: "festivales en Canarias"', () => {
    expect(interpretOrganizationQuery('que festivales hay en canarias?', CONOCIDAS)).toEqual({
      type: 'festival',
      region: 'Canarias',
    })
  })

  it('4) el pais sigue funcionando por country_code', () => {
    expect(interpretOrganizationQuery('que festivales hay en argentina?', CONOCIDAS)).toEqual({
      type: 'festival',
      countryCode: 'AR',
    })
  })

  it('un lugar ausente del catalogo NO se reconoce como criterio: no se inventa una ubicacion', () => {
    expect(interpretOrganizationQuery('que teatros hay en cuenca?', CONOCIDAS)).toEqual({ type: 'theater' })
  })

  it('sin catalogo de ubicaciones, ninguna localidad se reconoce', () => {
    expect(interpretOrganizationQuery('que teatros hay en barcelona?')).toEqual({ type: 'theater' })
  })

  it('reconoce ubicaciones con tilde y de varias palabras', () => {
    expect(interpretOrganizationQuery('algo en santa cruz de tenerife', CONOCIDAS)).toEqual({
      city: 'Santa Cruz de Tenerife',
    })
  })

  it('emite el valor exacto del catalogo, no el texto que escribio el usuario', () => {
    const { city } = interpretOrganizationQuery('en madrid', CONOCIDAS)
    expect(city).toBe('Madrid')
  })
})

describe('interpretOrganizationQuery — nucleo del sintagma en el tipo', () => {
  it('gana el tipo que aparece antes: es el nucleo, no una lista de parejas concretas', () => {
    expect(interpretOrganizationQuery('editoriales de teatro')).toEqual({ type: 'editorial' })
    expect(interpretOrganizationQuery('companias de teatro')).toEqual({ type: 'company' })
    expect(interpretOrganizationQuery('universidades con sala de teatro')).toEqual({ type: 'university' })
    expect(interpretOrganizationQuery('teatros y editoriales')).toEqual({ type: 'theater' })
  })
})

describe('hasUnresolvedLocation — señal explicita de ubicacion pendiente', () => {
  const CONOCIDAS = { regions: ['Canarias'], cities: ['Madrid'] }

  it('1) CRITERIO COMPLETO: la ubicacion se resolvio -- nada pendiente', () => {
    const criteria = interpretOrganizationQuery('que festivales hay en argentina?', CONOCIDAS)
    expect(hasUnresolvedLocation('que festivales hay en argentina?', criteria)).toBe(false)
  })

  it('1 bis) ciudad y region resueltas tampoco dejan nada pendiente', () => {
    expect(hasUnresolvedLocation('en madrid', interpretOrganizationQuery('en madrid', CONOCIDAS))).toBe(false)
    expect(hasUnresolvedLocation('en canarias', interpretOrganizationQuery('en canarias', CONOCIDAS))).toBe(false)
  })

  it('2) CRITERIO PARCIAL: se pidio ciudad y no se resolvio', () => {
    const query = 'que teatros hay en cuenca?'
    const criteria = interpretOrganizationQuery(query, CONOCIDAS)

    expect(criteria).toEqual({ type: 'theater' })
    expect(hasUnresolvedLocation(query, criteria)).toBe(true)
  })

  it('4) SIN CRITERIO de ubicacion: no hay complemento locativo, nada pendiente', () => {
    const query = 'que companias de teatro hay?'
    expect(hasUnresolvedLocation(query, interpretOrganizationQuery(query, CONOCIDAS))).toBe(false)
  })

  it('no confunde con ubicacion lo que sigue a "en" sin ser un lugar', () => {
    expect(hasUnresolvedLocation('que festivales hay en total?', {})).toBe(false)
    expect(hasUnresolvedLocation('que hay en general?', {})).toBe(false)
    expect(hasUnresolvedLocation('que companias hay en cartel?', {})).toBe(false)
  })

  it('no confunde con ubicacion el vocabulario de tipo: "en teatro" describe el ambito', () => {
    expect(hasUnresolvedLocation('que fundaciones trabajan en teatro?', { type: 'foundation' })).toBe(false)
  })

  it('es determinista y no conoce ningun toponimo concreto', () => {
    const query = 'que teatros hay en vitoria?'
    const criteria = interpretOrganizationQuery(query, CONOCIDAS)
    expect(hasUnresolvedLocation(query, criteria)).toBe(hasUnresolvedLocation(query, criteria))
    expect(hasUnresolvedLocation(query, criteria)).toBe(true)
  })
})
