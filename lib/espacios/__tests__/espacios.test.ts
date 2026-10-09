import { describe, it, expect } from 'vitest'
import {
  type CamposEspacio,
  type EspacioFicha,
  type EspacioTarjeta,
  filaDeFormulario,
  filtrarEspacios,
  hayFiltros,
  jsonLdEspacio,
  leerFiltros,
  lugarCorto,
  municipiosConEspacios,
  normalizar,
  opcionesFiltro,
  rutaMunicipio,
  urlComoLlegar,
  urlFuente,
  validarEspacio,
  validarMensajeReclamacion,
  webEnlazable,
  webVisible,
} from '../espacios'

const t = (o: Partial<EspacioTarjeta> & Pick<EspacioTarjeta, 'nombre' | 'municipio'>): EspacioTarjeta => ({
  id: o.nombre,
  slug: o.nombre.toLowerCase().replace(/\s+/g, '-'),
  tipo: 'teatro',
  pais_code: 'ES',
  region: 'Canarias',
  isla: 'Tenerife',
  municipio_slug: normalizar(o.municipio).replace(/\s+/g, '-'),
  nombre_normalizado: normalizar(o.nombre),
  ...o,
})

const LISTA = [
  t({ nombre: 'Teatro Guimerá', municipio: 'Santa Cruz de Tenerife' }),
  t({ nombre: 'Auditorio de Tenerife Adán Martín', municipio: 'Santa Cruz de Tenerife', tipo: 'auditorio' }),
  t({ nombre: 'Teatro Leal', municipio: 'San Cristóbal de La Laguna' }),
  t({ nombre: 'Teatro Pérez Galdós', municipio: 'Las Palmas de Gran Canaria', isla: 'Gran Canaria' }),
  t({ nombre: 'Teatro Colón', municipio: 'Ciudad de Buenos Aires', pais_code: 'AR', region: 'Ciudad de Buenos Aires', isla: null }),
]

describe('leerFiltros: solo pasan valores válidos', () => {
  it('país de los 20, región de ese país, municipio con región, tipo del catálogo', () => {
    expect(leerFiltros({ pais: 'es', region: 'Canarias', m: 'santa-cruz-de-tenerife', tipo: 'teatro', q: '  guimera ' }))
      .toEqual({ pais: 'ES', region: 'Canarias', municipio: 'santa-cruz-de-tenerife', tipo: 'teatro', q: 'guimera' })
  })

  it('descarta país fuera del ámbito y todo lo que cuelga de él', () => {
    expect(leerFiltros({ pais: 'FR', region: 'Canarias', m: 'x' })).toMatchObject({ pais: null, region: null, municipio: null })
  })

  it('descarta una región de otro país y el municipio sin región', () => {
    expect(leerFiltros({ pais: 'ES', region: 'Mendoza', m: 'x' })).toMatchObject({ pais: 'ES', region: null, municipio: null })
  })

  it('descarta municipios con caracteres raros y tipos desconocidos; recorta la búsqueda', () => {
    const f = leerFiltros({ pais: 'ES', region: 'Canarias', m: "x' or 1=1", tipo: 'cine', q: 'a'.repeat(200) })
    expect(f.municipio).toBeNull()
    expect(f.tipo).toBeNull()
    expect(f.q).toHaveLength(80)
  })

  it('con parámetros repetidos usa el primero', () => {
    expect(leerFiltros({ pais: ['ES', 'AR'] }).pais).toBe('ES')
  })

  it('hayFiltros', () => {
    expect(hayFiltros(leerFiltros({}))).toBe(false)
    expect(hayFiltros(leerFiltros({ q: 'leal' }))).toBe(true)
  })
})

describe('filtrarEspacios', () => {
  it('sin filtros: todos, por municipio y nombre', () => {
    expect(filtrarEspacios(LISTA, leerFiltros({})).map(e => e.nombre)).toEqual([
      'Teatro Colón', 'Teatro Pérez Galdós', 'Teatro Leal', 'Auditorio de Tenerife Adán Martín', 'Teatro Guimerá',
    ])
  })

  it('país → región → municipio', () => {
    expect(filtrarEspacios(LISTA, leerFiltros({ pais: 'AR' })).map(e => e.nombre)).toEqual(['Teatro Colón'])
    expect(filtrarEspacios(LISTA, leerFiltros({ pais: 'ES', region: 'Canarias' }))).toHaveLength(4)
    expect(filtrarEspacios(LISTA, leerFiltros({ pais: 'ES', region: 'Canarias', m: 'santa-cruz-de-tenerife' }))).toHaveLength(2)
  })

  it('por tipo', () => {
    expect(filtrarEspacios(LISTA, leerFiltros({ tipo: 'auditorio' })).map(e => e.nombre)).toEqual(['Auditorio de Tenerife Adán Martín'])
  })

  it('por nombre, sin tildes ni mayúsculas', () => {
    expect(filtrarEspacios(LISTA, leerFiltros({ q: 'GUIMERA' })).map(e => e.nombre)).toEqual(['Teatro Guimerá'])
    expect(filtrarEspacios(LISTA, leerFiltros({ q: 'pérez' })).map(e => e.nombre)).toEqual(['Teatro Pérez Galdós'])
    expect(filtrarEspacios(LISTA, leerFiltros({ q: 'zzz' }))).toEqual([])
  })
})

describe('opcionesFiltro: solo lo que tiene espacios', () => {
  it('sin país: países con espacios, sin regiones ni municipios', () => {
    const o = opcionesFiltro(LISTA, leerFiltros({}))
    expect(o.paises.map(p => p.value)).toEqual(['ES', 'AR'])
    expect(o.regiones).toEqual([])
    expect(o.municipios).toEqual([])
  })

  it('con país y región: sus municipios, ordenados', () => {
    const o = opcionesFiltro(LISTA, leerFiltros({ pais: 'ES', region: 'Canarias' }))
    expect(o.regiones).toEqual([{ value: 'Canarias', label: 'Canarias' }])
    expect(o.municipios.map(m => m.label)).toEqual(['Las Palmas de Gran Canaria', 'San Cristóbal de La Laguna', 'Santa Cruz de Tenerife'])
  })
})

describe('páginas por municipio', () => {
  it('agrupa por país y municipio y cuenta', () => {
    const m = municipiosConEspacios(LISTA)
    expect(m.find(x => x.municipio === 'Santa Cruz de Tenerife')).toEqual({
      pais_code: 'ES', municipio: 'Santa Cruz de Tenerife', municipio_slug: 'santa-cruz-de-tenerife', total: 2,
    })
    expect(m).toHaveLength(4)
  })

  it('ruta con el país en minúsculas', () => {
    expect(rutaMunicipio('ES', 'santa-cruz-de-tenerife')).toBe('/espacios/es/santa-cruz-de-tenerife')
  })
})

describe('presentación', () => {
  it('lugarCorto usa la isla o, sin isla, la región', () => {
    expect(lugarCorto(LISTA[0])).toBe('Santa Cruz de Tenerife · Tenerife')
    expect(lugarCorto(LISTA[4])).toBe('Ciudad de Buenos Aires · Ciudad de Buenos Aires')
  })

  it('webEnlazable acepta http(s) y nada más', () => {
    expect(webEnlazable('https://teatroleal.es/')).toBe('https://teatroleal.es/')
    expect(webEnlazable('http://orfeonlapaz.com/')).toBe('http://orfeonlapaz.com/')
    expect(webEnlazable('javascript:alert(1)')).toBeNull()
    expect(webEnlazable('https://a.es/"><script>')).toBeNull()
    expect(webEnlazable(null)).toBeNull()
  })

  it('webVisible quita protocolo, www y barra final', () => {
    expect(webVisible('https://www.teatroleal.es/')).toBe('teatroleal.es')
  })

  it('«Cómo llegar» es un enlace de Google Maps con lat,lon', () => {
    expect(urlComoLlegar(28.46595, -16.25066)).toBe('https://www.google.com/maps/search/?api=1&query=28.46595,-16.25066')
  })

  it('urlFuente enlaza OSM y Wikidata solo con referencias bien formadas', () => {
    expect(urlFuente('osm', 'way/248867706')).toBe('https://www.openstreetmap.org/way/248867706')
    expect(urlFuente('wikidata', 'Q4891034')).toBe('https://www.wikidata.org/wiki/Q4891034')
    expect(urlFuente('osm', 'Q1')).toBeNull()
    expect(urlFuente('redaccion', null)).toBeNull()
  })
})

describe('datos estructurados schema.org', () => {
  const ficha: EspacioFicha = {
    id: '1', slug: 'teatro-guimera', nombre: 'Teatro Guimerá', tipo: 'teatro', pais_code: 'ES', region: 'Canarias',
    provincia: 'Santa Cruz de Tenerife', isla: 'Tenerife', municipio: 'Santa Cruz de Tenerife', municipio_slug: 'santa-cruz-de-tenerife',
    direccion: null, lat: 28.46595, lon: -16.25066, web: 'https://www.teatroguimera.es/', aforo: 700, num_salas: null, descripcion: null,
  }

  it('un teatro es PerformingArtsTheater con dirección, coordenadas, web y aforo', () => {
    const j = jsonLdEspacio(ficha, 'https://www.obrasdeteatro.com/espacios/teatro-guimera')
    expect(j).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'PerformingArtsTheater',
      name: 'Teatro Guimerá',
      url: 'https://www.obrasdeteatro.com/espacios/teatro-guimera',
      sameAs: ['https://www.teatroguimera.es/'],
      maximumAttendeeCapacity: 700,
      address: { '@type': 'PostalAddress', addressLocality: 'Santa Cruz de Tenerife', addressRegion: 'Santa Cruz de Tenerife', addressCountry: 'ES' },
      geo: { '@type': 'GeoCoordinates', latitude: 28.46595, longitude: -16.25066 },
    })
    expect(j).not.toHaveProperty('description')
  })

  it('el resto de tipos es EventVenue; sin web ni aforo no salen esos campos', () => {
    const j = jsonLdEspacio({ ...ficha, tipo: 'auditorio', web: null, aforo: null }, 'u')
    expect(j['@type']).toBe('EventVenue')
    expect(j).not.toHaveProperty('sameAs')
    expect(j).not.toHaveProperty('maximumAttendeeCapacity')
  })
})

describe('reclamación', () => {
  it('exige entre 10 y 500 caracteres', () => {
    expect(validarMensajeReclamacion(undefined)).toBeTruthy()
    expect(validarMensajeReclamacion('   corto   ')).toBeTruthy()
    expect(validarMensajeReclamacion('Directora, 600000000')).toBeNull()
    expect(validarMensajeReclamacion('a'.repeat(501))).toBeTruthy()
  })
})

describe('formulario de admin', () => {
  const OK: CamposEspacio = {
    nombre: 'Sala Nueva', tipo: 'sala', pais_code: 'ES', region: 'Canarias', provincia: 'Las Palmas', isla: '',
    municipio: 'Telde', direccion: '', lat: '27,99', lon: '-15.41', web: 'https://salanueva.es', aforo: '120',
    num_salas: '', descripcion: '', fuente: 'redaccion', fuente_ref: '',
  }

  it('acepta un alta correcta y la convierte en fila (coma decimal incluida, vacíos a null)', () => {
    expect(validarEspacio(OK)).toBeNull()
    expect(filaDeFormulario(OK)).toEqual({
      nombre: 'Sala Nueva', tipo: 'sala', pais_code: 'ES', region: 'Canarias', provincia: 'Las Palmas', isla: null,
      municipio: 'Telde', direccion: null, lat: 27.99, lon: -15.41, web: 'https://salanueva.es', aforo: 120,
      num_salas: null, descripcion: null, fuente: 'redaccion', fuente_ref: null,
    })
  })

  it('la fila nunca lleva estado, slug ni gestionado_por', () => {
    const fila = filaDeFormulario(OK)
    expect(fila).not.toHaveProperty('estado')
    expect(fila).not.toHaveProperty('slug')
    expect(fila).not.toHaveProperty('gestionado_por')
  })

  it('rechaza región de otro país, coordenadas fuera de rango y enteros no válidos', () => {
    expect(validarEspacio({ ...OK, region: 'Mendoza' })).toMatch(/región/)
    expect(validarEspacio({ ...OK, lat: '' })).toMatch(/latitud/)
    expect(validarEspacio({ ...OK, lon: '200' })).toMatch(/longitud/)
    expect(validarEspacio({ ...OK, aforo: '0' })).toMatch(/aforo/)
    expect(validarEspacio({ ...OK, num_salas: '1.5' })).toMatch(/salas/)
    expect(validarEspacio({ ...OK, descripcion: 'a'.repeat(601) })).toMatch(/600/)
  })

  it('web nueva solo https; una http ya guardada se puede conservar sin tocarla', () => {
    expect(validarEspacio({ ...OK, web: 'http://orfeonlapaz.com/' })).toMatch(/https/)
    expect(validarEspacio({ ...OK, web: 'http://orfeonlapaz.com/' }, 'http://orfeonlapaz.com/')).toBeNull()
    expect(validarEspacio({ ...OK, web: '' })).toBeNull()
  })
})
