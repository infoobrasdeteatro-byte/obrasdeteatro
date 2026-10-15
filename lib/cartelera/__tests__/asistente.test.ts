import { describe, it, expect } from 'vitest'
import {
  funcionesDelAsistente, opcionesDelAsistente, equipoDelAsistente, problemaDelPaso, estadoInicial, lugarVacio, fechaVacia,
  opcionVacia, papelVacio, leerBorradorLocal, tieneContenido,
} from '../asistente'

const AHORA = Date.UTC(2026, 9, 15)
const sala = { id: 's1', nombre: 'Teatro Guimerá', municipio: 'Santa Cruz de Tenerife', region: 'Canarias', pais_code: 'ES' }

describe('funciones del asistente', () => {
  it('una sala con varias fechas y una tanda diaria', () => {
    const l = { ...lugarVacio('ES'), zona: 'Atlantic/Canary', sala,
      fechas: [fechaVacia({ fecha: '2026-11-01', hora: '20', minuto: '30' }), fechaVacia({ fecha: '2026-11-05', hora: '19', cantidad: '3', cadaDias: 1 })] }
    const r = funcionesDelAsistente([l], AHORA)
    expect(r.error).toBeNull()
    expect(r.filas).toHaveLength(4)
    expect(r.filas[0]).toMatchObject({ inicio: '2026-11-01T20:30:00.000Z', espacio_id: 's1', lugar_nombre: null, zona_horaria: 'Atlantic/Canary' })
  })

  it('gira: otro lugar escrito a mano en Venezuela', () => {
    const l = { ...lugarVacio('VE'), otroLugar: true, lugar: 'Centro Cultural Chacao', ciudad: 'Caracas',
      fechas: [fechaVacia({ fecha: '2026-10-24', hora: '19', minuto: '30' })] }
    const r = funcionesDelAsistente([l], AHORA)
    expect(r.error).toBeNull()
    expect(r.filas[0]).toMatchObject({ inicio: '2026-10-24T23:30:00.000Z', pais_code: 'VE', ciudad: 'Caracas', zona_horaria: 'America/Caracas' })
  })

  it('errores con su sitio: ciudad vacía, sin sala, repetidas; los lugares en blanco se ignoran', () => {
    const sinCiudad = { ...lugarVacio('VE'), otroLugar: true, lugar: 'Sala', fechas: [fechaVacia({ fecha: '2026-10-24' })] }
    expect(funcionesDelAsistente([sinCiudad], AHORA)).toMatchObject({ error: 'Lugar: escribe la ciudad.', donde: sinCiudad.clave })
    const sinSala = { ...lugarVacio(), fechas: [fechaVacia({ fecha: '2026-10-24' })] }
    expect(funcionesDelAsistente([sinSala], AHORA).error).toMatch(/elige la sala/)
    const rep = { ...lugarVacio(), sala, fechas: [fechaVacia({ fecha: '2026-11-01' }), fechaVacia({ fecha: '2026-11-01' })] }
    expect(funcionesDelAsistente([rep], AHORA).error).toMatch(/repetidas/)
    const bueno = { ...lugarVacio(), sala, fechas: [fechaVacia({ fecha: '2026-11-01' })] }
    expect(funcionesDelAsistente([bueno, lugarVacio()], AHORA).filas).toHaveLength(1)
  })
})

describe('entradas y equipo', () => {
  it('venta online + taquilla; las vacías no cuentan', () => {
    const r = opcionesDelAsistente([{ ...opcionVacia('USD'), url: 'https://tickets.liveri.com.ve/event/x', precio_desde: '20', taquilla: true }, opcionVacia()])
    expect(r.error).toBeNull()
    expect(r.filas.map(f => f.tipo)).toEqual(['venta', 'taquilla'])
    expect(r.filas[1]).toMatchObject({ url: null, precio_desde: 20, moneda: 'USD' })
  })
  it('opción con error', () => {
    expect(opcionesDelAsistente([{ ...opcionVacia(), precio_desde: '15' }]).error).toMatch(/enlace/)
  })
  it('varios nombres por papel, los vacíos se ignoran', () => {
    const r = equipoDelAsistente([{ ...papelVacio('direccion'), nombres: 'Daniel Uribe' }, { ...papelVacio('reparto'), nombres: 'Rafael Romero, Antonio Delli; María Duque' }, papelVacio('produccion')])
    expect(r.filas.map(f => f.nombre)).toEqual(['Daniel Uribe', 'Rafael Romero', 'Antonio Delli', 'María Duque'])
    expect(r.filas[1].rol).toBe('reparto')
  })
})

describe('pasos y borrador local', () => {
  it('no se pasa del paso 1 sin título ni del 2 sin funciones', () => {
    const e = estadoInicial()
    expect(problemaDelPaso(1, e, AHORA)?.error).toMatch(/título/)
    expect(problemaDelPaso(2, e, AHORA)?.error).toMatch(/al menos una función/)
    expect(problemaDelPaso(3, e, AHORA)).toBeNull()
    expect(problemaDelPaso(4, e, AHORA)).toBeNull()
  })
  it('recupera lo guardado en el navegador y descarta basura', () => {
    const e = { ...estadoInicial(), paso: 9, datos: { ...estadoInicial().datos, titulo: 'Yerma' } }
    const r = leerBorradorLocal(JSON.stringify(e))
    expect(r?.paso).toBe(4)
    expect(r && tieneContenido(r)).toBe(true)
    expect(leerBorradorLocal('{malo')).toBeNull()
    expect(leerBorradorLocal(null)).toBeNull()
    expect(tieneContenido(estadoInicial())).toBe(false)
  })
})
