import { describe, it, expect } from 'vitest'
import {
  diaLocal, rangoCuando, enCuando, agruparPorEspectaculo, etiquetaProxima, contarPor, ciudadDetectada,
  normalizarCiudad, terminaPronto, type FuncionListado,
} from '../listado'
import { enlaceAfiliado, leerConfigAfiliados } from '../afiliados'

const esp = (id: string, titulo = id) => ({ id, slug: id, titulo, compania_nombre: 'Cía', cartel_url: null, genero_id: 'teatro', user_id: 'u' })
const fn = (id: string, inicio: string, e = esp('a'), ciudad = 'Madrid', zona = 'Europe/Madrid'): FuncionListado => ({
  id, inicio, zona_horaria: zona, ciudad, pais_code: 'ES', lugar_nombre: 'Sala', espacio_id: null, estado: 'programada', espectaculo: e,
})

describe('fechas', () => {
  it('día local según la zona de la función', () => {
    // 23:30 UTC del 15 → en Madrid ya es el 16; en Buenos Aires sigue siendo el 15.
    expect(diaLocal('2026-10-15T23:30:00Z', 'Europe/Madrid')).toBe('2026-10-16')
    expect(diaLocal('2026-10-15T23:30:00Z', 'America/Argentina/Buenos_Aires')).toBe('2026-10-15')
  })

  it('rangos de «Cuándo»', () => {
    // Jueves 15/10/2026
    expect(rangoCuando('hoy', '2026-10-15')).toEqual(['2026-10-15', '2026-10-15'])
    expect(rangoCuando('manana', '2026-10-15')).toEqual(['2026-10-16', '2026-10-16'])
    expect(rangoCuando('finde', '2026-10-15')).toEqual(['2026-10-16', '2026-10-18'])
    expect(rangoCuando('finde', '2026-10-17')).toEqual(['2026-10-17', '2026-10-18']) // sábado
    expect(rangoCuando('finde', '2026-10-18')).toEqual(['2026-10-18', '2026-10-18']) // domingo
    expect(rangoCuando('7d', '2026-10-15')).toEqual(['2026-10-15', '2026-10-21'])
    expect(rangoCuando('2026-11-01', '2026-10-15')).toEqual(['2026-11-01', '2026-11-01'])
  })

  it('enCuando y etiqueta de la próxima función', () => {
    const ahora = Date.parse('2026-10-15T09:00:00Z')
    expect(enCuando(fn('1', '2026-10-15T18:00:00Z'), 'hoy', ahora)).toBe(true)
    expect(enCuando(fn('1', '2026-10-16T18:00:00Z'), 'hoy', ahora)).toBe(false)
    expect(etiquetaProxima(fn('1', '2026-10-15T18:00:00Z'), ahora)).toBe('HOY 20:00')
    expect(etiquetaProxima(fn('1', '2026-10-16T17:30:00Z'), ahora)).toBe('MAÑANA 19:30')
    expect(etiquetaProxima(fn('1', '2026-10-24T18:00:00Z'), ahora)).toMatch(/^SÁB 24 OCT/)
  })
})

describe('agrupar y contar', () => {
  const a = esp('a', 'Yerma'), b = esp('b', 'Bodas')
  const lista = [
    fn('1', '2026-10-20T18:00:00Z', a, 'Madrid'),
    fn('2', '2026-10-18T18:00:00Z', b, 'Sevilla'),
    fn('3', '2026-10-22T18:00:00Z', a, 'Málaga'),
  ]
  it('un espectáculo por tarjeta, ordenados por la próxima función', () => {
    const g = agruparPorEspectaculo(lista)
    expect(g.map(x => x.titulo)).toEqual(['Bodas', 'Yerma'])
    expect(g[1]).toMatchObject({ funciones: 2, ciudades: ['Madrid', 'Málaga'], ultima: '2026-10-22T18:00:00Z' })
    expect(terminaPronto(g[1], Date.parse('2026-10-18T00:00:00Z'))).toBe(true)
    expect(terminaPronto(g[1], Date.parse('2026-10-01T00:00:00Z'))).toBe(false)
  })
  it('cuenta espectáculos (no funciones) por ciudad', () => {
    const c = contarPor([...lista, fn('4', '2026-10-25T18:00:00Z', a, 'Madrid')], f => f.ciudad)
    expect(c.get('Madrid')).toBe(1)
    expect(c.get('Sevilla')).toBe(1)
  })
  it('ciudad detectada por la cabecera (codificada y sin tildes)', () => {
    expect(normalizarCiudad(' Málaga ')).toBe('malaga')
    expect(ciudadDetectada('M%C3%A1laga', ['Madrid', 'Málaga'])).toBe('Málaga')
    expect(ciudadDetectada('Santa%20Cruz%20de%20Tenerife', ['Santa Cruz de Tenerife'])).toBe('Santa Cruz de Tenerife')
    expect(ciudadDetectada('Lima', ['Madrid'])).toBeNull()
    expect(ciudadDetectada(null, ['Madrid'])).toBeNull()
  })
})

describe('afiliados', () => {
  it('sin configuración, el enlace sale tal cual', () => {
    expect(enlaceAfiliado('https://www.tomaticket.es/x', 'tomaticket', {})).toBe('https://www.tomaticket.es/x')
    expect(leerConfigAfiliados('no es json')).toEqual({})
  })
  it('parámetros y plantilla', () => {
    const c = leerConfigAfiliados('{"tomaticket":{"parametros":{"aff":"123"}},"entradas_com":{"plantilla":"https://red.example/c?u={url}"}}')
    expect(enlaceAfiliado('https://www.tomaticket.es/x?a=1', 'tomaticket', c)).toBe('https://www.tomaticket.es/x?a=1&aff=123')
    expect(enlaceAfiliado('https://www.entradas.com/e/1', 'entradas_com', c)).toBe('https://red.example/c?u=https%3A%2F%2Fwww.entradas.com%2Fe%2F1')
    expect(enlaceAfiliado('https://misala.com', 'externo', c)).toBe('https://misala.com')
  })
})
