import { describe, it, expect } from 'vitest'
import {
  localAUtc, utcALocal, fechaFuncion, validarFuncion, validarEspectaculo, aFilaEspectaculo, CAMPOS_VACIOS,
  detectarProveedor, validarOpcion, aFilaOpcion, precioTexto, cartelValido, zonaPorDefecto, mensajeErrorCartelera,
} from '../cartelera'

describe('fechas de las funciones', () => {
  it('hora local de la sala → UTC (Madrid en verano e invierno, Canarias, Buenos Aires)', () => {
    expect(localAUtc('2026-07-10T20:00', 'Europe/Madrid')).toBe('2026-07-10T18:00:00.000Z')
    expect(localAUtc('2026-12-10T20:00', 'Europe/Madrid')).toBe('2026-12-10T19:00:00.000Z')
    expect(localAUtc('2026-12-10T20:00', 'Atlantic/Canary')).toBe('2026-12-10T20:00:00.000Z')
    expect(localAUtc('2026-12-10T21:30', 'America/Argentina/Buenos_Aires')).toBe('2026-12-11T00:30:00.000Z')
  })

  it('texto no válido → null', () => {
    expect(localAUtc('', 'Europe/Madrid')).toBeNull()
    expect(localAUtc('2026-02-30T20:00', 'Europe/Madrid')).toBeNull()
  })

  it('ida y vuelta', () => {
    const iso = localAUtc('2026-10-25T19:00', 'America/Mexico_City')!
    expect(utcALocal(iso, 'America/Mexico_City')).toBe('2026-10-25T19:00')
  })

  it('fecha legible en la zona de la función', () => {
    expect(fechaFuncion('2026-12-10T20:00:00.000Z', 'Atlantic/Canary')).toMatch(/^Jue 10 dic.*· 20:00 h$/)
  })

  it('zona por defecto: Canarias tiene la suya', () => {
    expect(zonaPorDefecto('ES', 'Canarias')).toBe('Atlantic/Canary')
    expect(zonaPorDefecto('ES', 'Cataluña')).toBe('Europe/Madrid')
    expect(zonaPorDefecto('MX')).toBe('America/Mexico_City')
  })
})

describe('validaciones', () => {
  const ahora = Date.UTC(2026, 9, 14)
  const base = { inicio: '2026-11-01T20:00', zona_horaria: 'Europe/Madrid', espacio_id: null, lugar_nombre: '', ciudad: '', pais_code: '', nota: '' }

  it('función: sin sala hace falta lugar, ciudad y país; fechas pasadas no', () => {
    expect(validarFuncion(base, ahora)).toMatch(/sala o escribe/)
    expect(validarFuncion({ ...base, lugar_nombre: 'Plaza', ciudad: 'Lima', pais_code: 'PE' }, ahora)).toBeNull()
    expect(validarFuncion({ ...base, espacio_id: 'x' }, ahora)).toBeNull()
    expect(validarFuncion({ ...base, espacio_id: 'x', inicio: '2026-01-01T20:00' }, ahora)).toMatch(/ya ha pasado/)
  })

  it('espectáculo: título, compañía y números', () => {
    expect(validarEspectaculo(CAMPOS_VACIOS)).toMatch(/título/)
    const ok = { ...CAMPOS_VACIOS, titulo: 'Yerma', compania_nombre: 'Cía. Lorca' }
    expect(validarEspectaculo(ok)).toBeNull()
    expect(validarEspectaculo({ ...ok, duracion_min: '1h' })).toMatch(/minutos/)
    expect(aFilaEspectaculo({ ...ok, duracion_min: '90', sinopsis: '  ' })).toMatchObject({ duracion_min: 90, sinopsis: null, edad_minima: null })
  })

  it('opciones de compra', () => {
    const base = { tipo: 'venta', url: '', precio_desde: '', moneda: 'EUR', etiqueta: '', funcion_id: '' }
    expect(validarOpcion(base)).toMatch(/enlace/)
    expect(validarOpcion({ ...base, url: 'javascript:alert(1)' })).toMatch(/no es válido/)
    expect(validarOpcion({ ...base, url: 'https://www.tomaticket.es/x', precio_desde: '12,50' })).toBeNull()
    expect(validarOpcion({ ...base, tipo: 'gratis', precio_desde: '5' })).toMatch(/gratuita/)
    expect(aFilaOpcion({ ...base, url: 'https://www.tomaticket.es/x', precio_desde: '12,50' }))
      .toMatchObject({ proveedor: 'tomaticket', precio_desde: 12.5, moneda: 'EUR', funcion_id: null })
    expect(aFilaOpcion({ ...base, tipo: 'taquilla' })).toMatchObject({ url: null, precio_desde: null, moneda: null })
  })

  it('proveedor por dominio', () => {
    expect(detectarProveedor('https://www.ticketmaster.es/event/1')).toBe('ticketmaster')
    expect(detectarProveedor('https://feverup.com/m/1')).toBe('fever')
    expect(detectarProveedor('https://www.entradas.com/event/1')).toBe('entradas_com')
    expect(detectarProveedor('https://misala.com/entradas')).toBe('externo')
    expect(detectarProveedor('no es url')).toBe('externo')
  })

  it('precio legible', () => {
    expect(precioTexto(15, 'EUR')).toBe('Desde 15 €')
    expect(precioTexto(3500, 'ARS')).toBe('Desde 3500 ARS'.replace('3500', new Intl.NumberFormat('es-ES').format(3500)))
    expect(precioTexto(null, null, 'gratis')).toBe('Gratis')
    expect(precioTexto(null, null)).toBeNull()
  })
})

describe('cartel y errores', () => {
  const SB = 'https://abc.supabase.co'
  it('solo carteles de nuestro bucket y de la carpeta de quien publica', () => {
    expect(cartelValido(`${SB}/storage/v1/object/public/carteles/u1/a.webp`, SB, 'u1')).not.toBeNull()
    expect(cartelValido(`${SB}/storage/v1/object/public/carteles/u2/a.webp`, SB, 'u1')).toBeNull()
    expect(cartelValido('https://otra.com/a.jpg', SB, 'u1')).toBeNull()
  })
  it('traduce los errores de la base', () => {
    expect(mensajeErrorCartelera('Tu plan permite 2 espectáculo(s)…')).toMatch(/Tu plan permite/)
    expect(mensajeErrorCartelera('new row violates row-level security policy')).toMatch(/permiso/)
  })
})

describe('tandas de funciones y tamaño del cartel', () => {
  it('fechas diarias y semanales, cruzando de mes', async () => {
    const { fechasRepetidas } = await import('../cartelera')
    expect(fechasRepetidas('2026-10-30', 3, 1)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01'])
    expect(fechasRepetidas('2026-10-30', 2, 7)).toEqual(['2026-10-30', '2026-11-06'])
    expect(fechasRepetidas('2026-10-30', 0, 1)).toEqual([])
    expect(fechasRepetidas('2026-10-30', 61, 1)).toEqual([])
    expect(fechasRepetidas('', 1, 1)).toEqual([])
  })
  it('cartel: mínimo 600 × 900 y vertical', async () => {
    const { problemaTamanoCartel } = await import('../cartelera')
    expect(problemaTamanoCartel(1000, 1500)).toBeNull()
    expect(problemaTamanoCartel(500, 800)).toMatch(/demasiado pequeño/)
    expect(problemaTamanoCartel(1500, 1000)).toMatch(/vertical/)
  })
})

describe('limpiarCiudad', () => {
  it('quita el país y pone mayúsculas', async () => {
    const { limpiarCiudad } = await import('../cartelera')
    expect(limpiarCiudad('caracas Venezuela', 'Venezuela')).toBe('Caracas')
    expect(limpiarCiudad('buenos aires, argentina', 'Argentina')).toBe('Buenos Aires')
    expect(limpiarCiudad('santa cruz de tenerife', 'España')).toBe('Santa Cruz de Tenerife')
    expect(limpiarCiudad('Ciudad de México', 'México')).toBe('Ciudad de México')
    expect(limpiarCiudad('  Lima  ', 'Perú')).toBe('Lima')
    expect(limpiarCiudad('Panamá', 'Panamá')).toBe('Panamá')
  })
})

describe('limpiarCiudad (nombres con el país dentro)', () => {
  it('no recorta Ciudad de Panamá ni Ciudad de Guatemala', async () => {
    const { limpiarCiudad } = await import('../cartelera')
    expect(limpiarCiudad('Ciudad de Panamá', 'Panamá')).toBe('Ciudad de Panamá')
    expect(limpiarCiudad('ciudad de guatemala', 'Guatemala')).toBe('Ciudad de Guatemala')
    expect(limpiarCiudad('San Salvador, El Salvador', 'El Salvador')).toBe('San Salvador')
  })
})
