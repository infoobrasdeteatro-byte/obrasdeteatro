import { describe, it, expect } from 'vitest'
import {
  deriveActorFunctions,
  deriveCompaniaFunctions,
  deriveDirectorFunctions,
  deriveDramaturgoFunctions,
  deriveEscuelaFunctions,
  deriveFestivalFunctions,
  deriveInstitutionFunctions,
  derivePersonFunctions,
  deriveProductoraFunctions,
  deriveTeatroFunctions,
} from '../theatrical-function'

const AUTORIZADAS = [
  'interpretacion',
  'direccion',
  'dramaturgia',
  'produccion',
  'distribucion',
  'formacion',
  'gestion_cultural',
  'programacion',
  'sala',
]

describe('derivacion de funcion — respaldada columna a columna', () => {
  it('1) distribucion procede de perfil_productora.tipo_distribucion', () => {
    expect(deriveProductoraFunctions({ tipo_distribucion: true })).toEqual(['distribucion'])
    expect(deriveProductoraFunctions({ tipo_distribucion: false })).toEqual([])
  })

  it('2) formacion procede de perfil_escuela, y tambien de disp_formacion / serv_formacion', () => {
    expect(deriveEscuelaFunctions()).toEqual(['formacion'])
    expect(deriveDirectorFunctions({ disp_formacion: true })).toEqual(['direccion', 'formacion'])
    expect(deriveCompaniaFunctions({ serv_formacion: true })).toEqual(['formacion'])
  })

  it('3) produccion procede de tipo_teatral, serv_contratacion y form_produccion', () => {
    expect(deriveProductoraFunctions({ tipo_teatral: true })).toEqual(['produccion'])
    expect(deriveCompaniaFunctions({ serv_contratacion: true })).toEqual(['produccion'])
    expect(deriveEscuelaFunctions({ form_produccion: true })).toEqual(['produccion', 'formacion'])
  })

  it('4) programacion y sala proceden de perfil_teatro y perfil_festival', () => {
    expect(deriveTeatroFunctions()).toEqual(['programacion'])
    expect(deriveTeatroFunctions({ disponible_alquiler: true })).toEqual(['programacion', 'sala'])
    expect(deriveTeatroFunctions({ disponible_ensayos: true })).toEqual(['programacion', 'sala'])
    expect(deriveFestivalFunctions()).toEqual(['programacion'])
  })

  it('5) una entidad puede desempenar varias funciones a la vez', () => {
    expect(
      deriveProductoraFunctions({ tipo_teatral: true, tipo_distribucion: true, tipo_gestion_cultural: true })
    ).toEqual(['produccion', 'distribucion', 'gestion_cultural'])
  })

  it('interpretacion y dramaturgia proceden de la existencia del propio perfil', () => {
    expect(deriveActorFunctions()).toEqual(['interpretacion'])
    expect(deriveDramaturgoFunctions()).toEqual(['dramaturgia'])
  })

  it('7) una entidad sin funcion declarada no recibe ninguna inventada', () => {
    expect(deriveProductoraFunctions()).toEqual([])
    expect(deriveProductoraFunctions({})).toEqual([])
    expect(deriveCompaniaFunctions({ serv_contratacion: false, serv_formacion: false })).toEqual([])
    expect(deriveCompaniaFunctions({ serv_contratacion: null })).toEqual([])
  })

  it('exige el valor booleano exacto: null y undefined nunca declaran funcion', () => {
    expect(deriveTeatroFunctions({ disponible_alquiler: null, disponible_ensayos: undefined })).toEqual([
      'programacion',
    ])
  })

  it('el orden de salida es canonico, no el de evaluacion', () => {
    const a = deriveProductoraFunctions({ tipo_gestion_cultural: true, tipo_teatral: true })
    const b = deriveProductoraFunctions({ tipo_teatral: true, tipo_gestion_cultural: true })

    expect(a).toEqual(b)
    expect(a).toEqual(['produccion', 'gestion_cultural'])
  })

  it('nunca emite un valor fuera de las nueve funciones autorizadas', () => {
    const todas = [
      ...deriveActorFunctions(),
      ...deriveDirectorFunctions({ disp_formacion: true }),
      ...deriveDramaturgoFunctions(),
      ...deriveEscuelaFunctions({ form_produccion: true, form_gestion_cultural: true }),
      ...deriveCompaniaFunctions({ serv_contratacion: true, serv_formacion: true }),
      ...deriveProductoraFunctions({ tipo_teatral: true, tipo_distribucion: true, tipo_gestion_cultural: true }),
      ...deriveTeatroFunctions({ disponible_alquiler: true }),
      ...deriveFestivalFunctions(),
    ]

    for (const funcion of todas) expect(AUTORIZADAS).toContain(funcion)
  })

  it('NO declara todavia vestuario, escenografia, iluminacion, sonido ni maquillaje: no hay columna que los respalde', () => {
    const todas = [
      ...deriveActorFunctions(),
      ...deriveCompaniaFunctions({ serv_contratacion: true, serv_formacion: true }),
      ...deriveProductoraFunctions({ tipo_teatral: true, tipo_distribucion: true, tipo_gestion_cultural: true }),
      ...deriveTeatroFunctions({ disponible_alquiler: true }),
    ]

    for (const pendiente of ['vestuario', 'escenografia', 'iluminacion', 'sonido', 'maquillaje', 'caracterizacion']) {
      expect(todas).not.toContain(pendiente)
    }
  })
})

describe('REGLA DE SELECTIVIDAD — genero y especialidad NO son funcion', () => {
  it('6) los generos de perfil_dramaturgo nunca se convierten en funcion', () => {
    const funciones = deriveDramaturgoFunctions()

    for (const genero of ['comedia', 'drama', 'tragedia', 'musical', 'infantil', 'historico', 'monologo']) {
      expect(funciones).not.toContain(genero)
    }
    expect(funciones).toEqual(['dramaturgia'])
  })

  it('las especialidades de perfil_director nunca se convierten en funcion', () => {
    const funciones = deriveDirectorFunctions({ disp_formacion: false })

    for (const especialidad of ['clasico', 'contemporaneo', 'musical', 'experimental', 'opera', 'zarzuela']) {
      expect(funciones).not.toContain(especialidad)
    }
    expect(funciones).toEqual(['direccion'])
  })

  it('los tipos de genero de perfil_compania y perfil_festival tampoco', () => {
    expect(deriveCompaniaFunctions({})).toEqual([])
    expect(deriveFestivalFunctions()).toEqual(['programacion'])
  })

  it('la derivacion es explicita, nunca automatica por prefijo: no todo form_* es funcion', () => {
    // form_musical, form_danza, form_voz son materias, no funciones del ecosistema.
    expect(deriveEscuelaFunctions({ form_produccion: false, form_gestion_cultural: false })).toEqual(['formacion'])
  })
})

describe('deriveInstitutionFunctions — solo lo que el tipo entrana de forma inequivoca', () => {
  it('mapea los tres tipos cuya funcion se deduce sin suponer', () => {
    expect(deriveInstitutionFunctions('university')).toEqual(['formacion'])
    expect(deriveInstitutionFunctions('festival')).toEqual(['programacion'])
    expect(deriveInstitutionFunctions('theater')).toEqual(['sala'])
  })

  it('ante la duda, ninguna funcion antes que una funcion equivocada', () => {
    for (const tipo of ['company', 'editorial', 'platform', 'cultural_org', 'foundation', 'other']) {
      expect(deriveInstitutionFunctions(tipo), tipo).toEqual([])
    }
  })

  it('un tipo desconocido nunca produce funcion', () => {
    expect(deriveInstitutionFunctions('lo-que-sea')).toEqual([])
    expect(deriveInstitutionFunctions('')).toEqual([])
  })

  it('es pura y determinista', () => {
    expect(deriveInstitutionFunctions('festival')).toEqual(deriveInstitutionFunctions('festival'))
  })
})

describe('derivePersonFunctions — solo desde tipo_perfil, columna enumerada', () => {
  it('mapea los tipos cuya funcion se deduce sin suponer', () => {
    expect(derivePersonFunctions('actor')).toEqual(['interpretacion'])
    expect(derivePersonFunctions('director')).toEqual(['direccion'])
    expect(derivePersonFunctions('dramaturgo')).toEqual(['dramaturgia'])
    expect(derivePersonFunctions('productora')).toEqual(['produccion'])
    expect(derivePersonFunctions('compania')).toEqual(['produccion'])
    expect(derivePersonFunctions('escuela')).toEqual(['formacion'])
    expect(derivePersonFunctions('teatro')).toEqual(['programacion'])
    expect(derivePersonFunctions('festival')).toEqual(['programacion'])
  })

  it('los tipos sin funcion inequivoca devuelven [] -- mejor ninguna que inventada', () => {
    for (const tipo of ['profesional', 'institucion', 'publico', 'desconocido', '']) {
      expect(derivePersonFunctions(tipo), tipo).toEqual([])
    }
  })

  it('nunca emite una funcion fuera de las nueve autorizadas', () => {
    for (const tipo of ['actor', 'director', 'dramaturgo', 'productora', 'compania', 'escuela', 'teatro', 'festival']) {
      for (const funcion of derivePersonFunctions(tipo)) expect(AUTORIZADAS).toContain(funcion)
    }
  })

  it('es pura y determinista', () => {
    expect(derivePersonFunctions('actor')).toEqual(derivePersonFunctions('actor'))
  })
})
