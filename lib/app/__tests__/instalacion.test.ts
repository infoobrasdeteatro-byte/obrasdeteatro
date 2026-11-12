import { describe, it, expect } from 'vitest'
import { esIOS, estadoInstalacion, type EntornoInstalacion } from '../instalacion'

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

const entorno = (e: Partial<EntornoInstalacion>): EntornoInstalacion => ({
  enPantallaCompleta: false,
  recienInstalada: false,
  hayAvisoDelNavegador: false,
  userAgent: UA_ANDROID,
  plataforma: 'Linux armv81',
  puntosTactiles: 5,
  ...e,
})

describe('esIOS', () => {
  it('reconoce el iPhone por su user agent', () => {
    expect(esIOS(UA_IPHONE, 'iPhone', 5)).toBe(true)
  })
  it('reconoce el iPad, que se presenta como un Mac con pantalla táctil', () => {
    expect(esIOS(UA_MAC, 'MacIntel', 5)).toBe(true)
  })
  it('no confunde un Mac de escritorio ni un Android', () => {
    expect(esIOS(UA_MAC, 'MacIntel', 0)).toBe(false)
    expect(esIOS(UA_ANDROID, 'Linux armv81', 5)).toBe(false)
  })
})

describe('estadoInstalacion', () => {
  it('instalada: a pantalla completa, aunque el navegador aún ofrezca instalar', () => {
    expect(estadoInstalacion(entorno({ enPantallaCompleta: true, hayAvisoDelNavegador: true }))).toBe('instalada')
  })
  it('recien-instalada: instalada desde el navegador, sin estar aún dentro de la aplicación', () => {
    expect(estadoInstalacion(entorno({ recienInstalada: true }))).toBe('recien-instalada')
    // Dentro de la aplicación manda «instalada», aunque se acabe de instalar.
    expect(estadoInstalacion(entorno({ recienInstalada: true, enPantallaCompleta: true }))).toBe('instalada')
  })
  it('disponible: el navegador ha ofrecido instalar', () => {
    expect(estadoInstalacion(entorno({ hayAvisoDelNavegador: true }))).toBe('disponible')
  })
  it('ios: iPhone o iPad sin instalar', () => {
    expect(estadoInstalacion(entorno({ userAgent: UA_IPHONE, plataforma: 'iPhone' }))).toBe('ios')
  })
  it('manual: el resto de navegadores', () => {
    expect(estadoInstalacion(entorno({}))).toBe('manual')
    expect(estadoInstalacion(entorno({ userAgent: UA_MAC, plataforma: 'MacIntel', puntosTactiles: 0 }))).toBe('manual')
  })
})
