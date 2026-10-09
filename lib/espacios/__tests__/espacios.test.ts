import { describe, it, expect } from 'vitest'
import {
  type CamposEspacio,
  type EspacioFicha,
  type EspacioTarjeta,
  REDES_VACIAS,
  creditoImagen,
  filaDeFormulario,
  filtrarEspacios,
  hayFiltros,
  hrefTelefono,
  imagenSegura,
  nivelExploracion,
  otrosDelMunicipio,
  paisesConEspacios,
  redesDe,
  textoCredito,
  urlFiltro,
  validarSugerencia,
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
  lat: 28.4,
  lon: -16.2,
  aforo: null,
  accesibilidad: null,
  verificado: false,
  imagen_url: null,
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
      .toEqual({ pais: 'ES', region: 'Canarias', municipio: 'santa-cruz-de-tenerife', tipo: 'teatro', aforo: null, accesible: false, q: 'guimera' })
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
      pais_code: 'ES', region: 'Canarias', municipio: 'Santa Cruz de Tenerife', municipio_slug: 'santa-cruz-de-tenerife', total: 2,
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
    direccion: null, codigo_postal: null, lat: 28.46595, lon: -16.25066, web: 'https://www.teatroguimera.es/', telefono: null,
    email: null, redes: null, aforo: 700, num_salas: null, accesibilidad: null, anio_inauguracion: null, arquitecto: null,
    titularidad: null, descripcion: null, imagen_url: null, imagen_autor: null, imagen_licencia: null, imagen_fuente_url: null,
    verificado: false,
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
    municipio: 'Telde', direccion: '', codigo_postal: '', lat: '27,99', lon: '-15.41', web: 'https://salanueva.es',
    telefono: '', email: '', redes: REDES_VACIAS, aforo: '120', num_salas: '', accesibilidad: '', anio_inauguracion: '',
    arquitecto: '', titularidad: '', wikidata_id: '', imagen_url: '', imagen_autor: '', imagen_licencia: '',
    imagen_fuente_url: '', descripcion: '', descripcion_origen: '', fuente: 'redaccion', fuente_ref: '',
  }

  it('acepta un alta correcta y la convierte en fila (coma decimal incluida, vacíos a null)', () => {
    expect(validarEspacio(OK)).toBeNull()
    expect(filaDeFormulario(OK)).toEqual({
      nombre: 'Sala Nueva', tipo: 'sala', pais_code: 'ES', region: 'Canarias', provincia: 'Las Palmas', isla: null,
      municipio: 'Telde', direccion: null, codigo_postal: null, lat: 27.99, lon: -15.41, web: 'https://salanueva.es',
      telefono: null, email: null, redes: null, aforo: 120, num_salas: null, accesibilidad: null, anio_inauguracion: null,
      arquitecto: null, titularidad: null, wikidata_id: null, imagen_url: null, imagen_autor: null, imagen_licencia: null,
      imagen_fuente_url: null, descripcion: null, descripcion_origen: null, fuente: 'redaccion', fuente_ref: null,
    })
  })

  it('la fila nunca lleva estado, slug ni gestionado_por', () => {
    const fila = filaDeFormulario(OK)
    expect(fila).not.toHaveProperty('estado')
    expect(fila).not.toHaveProperty('slug')
    expect(fila).not.toHaveProperty('gestionado_por')
    expect(fila).not.toHaveProperty('verificado')
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

describe('fase 2: filtros de aforo y accesibilidad', () => {
  const L = [
    t({ nombre: 'Sala Pequeña', municipio: 'Telde', aforo: 80 }),
    t({ nombre: 'Teatro Medio', municipio: 'Telde', aforo: 151, accesibilidad: 'si' }),
    t({ nombre: 'Auditorio Grande', municipio: 'Telde', aforo: 1600, accesibilidad: 'parcial' }),
    t({ nombre: 'Sin Aforo', municipio: 'Telde' }),
  ]

  it('lee tramo de aforo y accesible=1; ignora valores desconocidos', () => {
    expect(leerFiltros({ aforo: '151-500', accesible: '1' })).toMatchObject({ aforo: '151-500', accesible: true })
    expect(leerFiltros({ aforo: 'enorme', accesible: 'si' })).toMatchObject({ aforo: null, accesible: false })
  })

  it('los tramos: hasta 150, 151–500 y más de 500; sin aforo no entra en ninguno', () => {
    const nombres = (aforo: string) => filtrarEspacios(L, leerFiltros({ aforo })).map(e => e.nombre)
    expect(nombres('hasta150')).toEqual(['Sala Pequeña'])
    expect(nombres('151-500')).toEqual(['Teatro Medio'])
    expect(nombres('mas500')).toEqual(['Auditorio Grande'])
  })

  it('«accesible» solo deja los de accesibilidad total', () => {
    expect(filtrarEspacios(L, leerFiltros({ accesible: '1' })).map(e => e.nombre)).toEqual(['Teatro Medio'])
  })

  it('dentro de cada municipio, primero los verificados y después alfabético', () => {
    const lista = [
      t({ nombre: 'Auditorio A', municipio: 'Madrid' }),
      t({ nombre: 'Zarzuela', municipio: 'Madrid', verificado: true }),
      t({ nombre: 'Teatro B', municipio: 'Alcalá de Henares' }),
      t({ nombre: 'Circo', municipio: 'Madrid', verificado: true }),
    ]
    expect(filtrarEspacios(lista, leerFiltros({})).map(e => e.nombre)).toEqual(['Teatro B', 'Circo', 'Zarzuela', 'Auditorio A'])
  })
})

describe('fase 2: exploración por país y municipio', () => {
  it('nivel: sin filtros, países; con país o región, municipios; con municipio u otro filtro, espacios', () => {
    expect(nivelExploracion(leerFiltros({}))).toBe('paises')
    expect(nivelExploracion(leerFiltros({ pais: 'ES' }))).toBe('municipios')
    expect(nivelExploracion(leerFiltros({ pais: 'ES', region: 'Canarias' }))).toBe('municipios')
    expect(nivelExploracion(leerFiltros({ pais: 'ES', region: 'Canarias', m: 'telde' }))).toBe('espacios')
    expect(nivelExploracion(leerFiltros({ tipo: 'sala' }))).toBe('espacios')
    expect(nivelExploracion(leerFiltros({ pais: 'ES', accesible: '1' }))).toBe('espacios')
    expect(nivelExploracion(leerFiltros({ q: 'leal' }))).toBe('espacios')
  })

  it('países con su número, de más a menos', () => {
    expect(paisesConEspacios(LISTA)).toEqual([
      { code: 'ES', nombre: 'España', total: 4 },
      { code: 'AR', nombre: 'Argentina', total: 1 },
    ])
  })

  it('urlFiltro arma la URL del nivel siguiente y no deja municipio sin región', () => {
    expect(urlFiltro({})).toBe('/espacios')
    expect(urlFiltro({ pais: 'ES' })).toBe('/espacios?pais=ES')
    expect(urlFiltro({ pais: 'ES', region: 'Comunidad de Madrid', m: 'madrid' })).toBe('/espacios?pais=ES&region=Comunidad+de+Madrid&m=madrid')
    expect(urlFiltro({ pais: 'ES', m: 'madrid' })).toBe('/espacios?pais=ES')
  })

  it('municipiosConEspacios lleva la región para el enlace', () => {
    expect(municipiosConEspacios(LISTA).find(m => m.municipio === 'Ciudad de Buenos Aires')?.region).toBe('Ciudad de Buenos Aires')
  })

  it('otros del municipio: sin el propio, verificados primero, hasta 6', () => {
    const muchos = Array.from({ length: 9 }, (_, i) => t({ nombre: `Sala ${i}`, municipio: 'Madrid', verificado: i === 7 }))
    const otros = otrosDelMunicipio(muchos, { id: 'Sala 0', pais_code: 'ES', municipio_slug: 'madrid' })
    expect(otros).toHaveLength(6)
    expect(otros[0].nombre).toBe('Sala 7')
    expect(otros.map(o => o.id)).not.toContain('Sala 0')
  })
})

describe('fase 2: foto, crédito, contacto y redes', () => {
  const FOTO = {
    imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Teatro.jpg',
    imagen_autor: 'Ana Pérez',
    imagen_licencia: 'CC BY-SA 4.0',
    imagen_fuente_url: 'https://commons.wikimedia.org/wiki/File:Teatro.jpg',
  }

  it('solo fotos de upload.wikimedia.org', () => {
    expect(imagenSegura(FOTO.imagen_url)).toBe(FOTO.imagen_url)
    expect(imagenSegura('https://example.com/a.jpg')).toBeNull()
    expect(imagenSegura('http://upload.wikimedia.org/a.jpg')).toBeNull()
    expect(imagenSegura('https://upload.wikimedia.org.evil.com/a.jpg')).toBeNull()
  })

  it('crédito «Foto: autor · licencia · Wikimedia Commons»; sin licencia o sin página de Commons, no hay foto', () => {
    const c = creditoImagen(FOTO)!
    expect(textoCredito(c)).toBe('Foto: Ana Pérez · CC BY-SA 4.0 · Wikimedia Commons')
    expect(c.fuente).toBe(FOTO.imagen_fuente_url)
    expect(textoCredito(creditoImagen({ ...FOTO, imagen_autor: null })!)).toBe('Foto: CC BY-SA 4.0 · Wikimedia Commons')
    expect(creditoImagen({ ...FOTO, imagen_licencia: null })).toBeNull()
    expect(creditoImagen({ ...FOTO, imagen_fuente_url: 'https://example.com/x' })).toBeNull()
  })

  it('redes: orden fijo, solo https y del dominio de cada red', () => {
    expect(redesDe({
      tiktok: 'https://www.tiktok.com/@teatro',
      instagram: 'https://instagram.com/teatro',
      facebook: 'http://facebook.com/teatro',
      x: 'https://evil.com/x.com',
      youtube: 'https://youtube.com.evil.com/c',
      otra: 'https://otra.com',
    })).toEqual([
      { clave: 'instagram', label: 'Instagram', url: 'https://instagram.com/teatro' },
      { clave: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@teatro' },
    ])
    expect(redesDe(null)).toEqual([])
    expect(redesDe(['https://instagram.com/x'])).toEqual([])
  })

  it('enlace tel: solo con dígitos y +', () => {
    expect(hrefTelefono('+34 922 (60) 94-50')).toBe('tel:+34922609450')
  })

  it('el JSON-LD lleva dirección con CP, teléfono, imagen, redes y aforo', () => {
    const ficha = {
      id: '1', slug: 'teatro-leal', nombre: 'Teatro Leal', tipo: 'teatro', pais_code: 'ES', region: 'Canarias',
      provincia: 'Santa Cruz de Tenerife', isla: 'Tenerife', municipio: 'San Cristóbal de La Laguna', municipio_slug: 'san-cristobal-de-la-laguna',
      direccion: 'Calle Obispo Rey Redondo, 54', codigo_postal: '38201', lat: 28.48968, lon: -16.31812, web: 'https://www.teatroleal.es/',
      telefono: '+34 922 609 450', email: 'info@teatroleal.es', redes: { instagram: 'https://instagram.com/teatroleal' },
      aforo: 680, num_salas: 1, accesibilidad: 'si', anio_inauguracion: 1915, arquitecto: 'Antonio Pintor', titularidad: 'publica',
      descripcion: 'Teatro histórico.', ...FOTO, verificado: true,
    }
    const j = jsonLdEspacio(ficha, 'https://www.obrasdeteatro.com/espacios/teatro-leal')
    expect(j).toMatchObject({
      image: FOTO.imagen_url,
      telephone: '+34 922 609 450',
      email: 'info@teatroleal.es',
      maximumAttendeeCapacity: 680,
      sameAs: ['https://www.teatroleal.es/', 'https://instagram.com/teatroleal'],
      address: { streetAddress: 'Calle Obispo Rey Redondo, 54', postalCode: '38201', addressLocality: 'San Cristóbal de La Laguna' },
    })
    expect(jsonLdEspacio({ ...ficha, imagen_licencia: null }, 'u')).not.toHaveProperty('image')
  })
})

describe('fase 2: sugerencia de corrección', () => {
  it('texto de 10 a 1000 caracteres; email opcional pero válido si se da', () => {
    expect(validarSugerencia('corto', '')).toBeTruthy()
    expect(validarSugerencia('a'.repeat(1001), '')).toBeTruthy()
    expect(validarSugerencia('El teléfono ha cambiado', '')).toBeNull()
    expect(validarSugerencia('El teléfono ha cambiado', undefined)).toBeNull()
    expect(validarSugerencia('El teléfono ha cambiado', 'ana@teatro.es')).toBeNull()
    expect(validarSugerencia('El teléfono ha cambiado', 'no-es-email')).toMatch(/email/)
    expect(validarSugerencia(42, '')).toBeTruthy()
  })
})

describe('fase 2: formulario de admin con los campos nuevos', () => {
  const BASE: CamposEspacio = {
    nombre: 'Teatro Leal', tipo: 'teatro', pais_code: 'ES', region: 'Canarias', provincia: '', isla: 'Tenerife',
    municipio: 'San Cristóbal de La Laguna', direccion: '', codigo_postal: '38201', lat: '28.48968', lon: '-16.31812', web: '',
    telefono: '+34 922 609 450', email: 'info@teatroleal.es', redes: { ...REDES_VACIAS, instagram: 'https://www.instagram.com/teatroleal' },
    aforo: '', num_salas: '', accesibilidad: 'si', anio_inauguracion: '1915', arquitecto: 'Antonio Pintor', titularidad: 'publica',
    wikidata_id: 'Q950052', imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Leal.jpg', imagen_autor: 'Ana',
    imagen_licencia: 'CC BY-SA 4.0', imagen_fuente_url: 'https://commons.wikimedia.org/wiki/File:Leal.jpg', descripcion: '',
    descripcion_origen: 'ia_revisada', fuente: 'wikidata', fuente_ref: 'Q950052',
  }

  it('acepta una ficha completa y guarda las redes como objeto (sin las vacías)', () => {
    expect(validarEspacio(BASE)).toBeNull()
    const fila = filaDeFormulario(BASE)
    expect(fila.redes).toEqual({ instagram: 'https://www.instagram.com/teatroleal' })
    expect(fila.anio_inauguracion).toBe(1915)
    expect(fila.accesibilidad).toBe('si')
  })

  it('rechaza teléfono, email, CP, año, Wikidata y valores fuera de catálogo', () => {
    expect(validarEspacio({ ...BASE, telefono: 'llamar mañana' })).toMatch(/teléfono/)
    expect(validarEspacio({ ...BASE, email: 'info@' })).toMatch(/email/)
    expect(validarEspacio({ ...BASE, codigo_postal: '#' })).toMatch(/postal/)
    expect(validarEspacio({ ...BASE, anio_inauguracion: '1499' })).toMatch(/1500/)
    expect(validarEspacio({ ...BASE, wikidata_id: '950052' })).toMatch(/Q123/)
    expect(validarEspacio({ ...BASE, accesibilidad: 'total' })).toMatch(/accesibilidad/)
    expect(validarEspacio({ ...BASE, titularidad: 'mixta' })).toMatch(/titularidad/)
    expect(validarEspacio({ ...BASE, descripcion_origen: 'chatgpt' })).toMatch(/descripción/)
  })

  it('cada red debe ser https de su dominio', () => {
    expect(validarEspacio({ ...BASE, redes: { ...REDES_VACIAS, facebook: 'https://instagram.com/x' } })).toMatch(/Facebook/)
    expect(validarEspacio({ ...BASE, redes: { ...REDES_VACIAS, x: 'http://x.com/teatro' } })).toMatch(/X/)
    expect(validarEspacio({ ...BASE, redes: { ...REDES_VACIAS, x: 'https://twitter.com/teatro' } })).toBeNull()
  })

  it('foto: solo de upload.wikimedia.org y siempre con licencia y página de Commons', () => {
    expect(validarEspacio({ ...BASE, imagen_url: 'https://example.com/a.jpg' })).toMatch(/upload\.wikimedia/)
    expect(validarEspacio({ ...BASE, imagen_licencia: '' })).toMatch(/licencia/)
    expect(validarEspacio({ ...BASE, imagen_fuente_url: '' })).toMatch(/Commons/)
    expect(validarEspacio({ ...BASE, imagen_url: '', imagen_licencia: '', imagen_fuente_url: '' })).toBeNull()
  })
})
