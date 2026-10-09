import { describe, it, expect, afterEach, vi } from 'vitest'
import { hashIp, ipDeLaPeticion } from '../ip'
import { ESTILO_OPENFREEMAP, puntosDe, urlWorker } from '../mapa'

afterEach(() => vi.unstubAllEnvs())

describe('hash de la IP', () => {
  it('x-real-ip primero, luego la primera de x-forwarded-for, si no «desconocida»', () => {
    expect(ipDeLaPeticion(new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.1.1.1' }))).toBe('203.0.113.7')
    expect(ipDeLaPeticion(new Headers({ 'x-forwarded-for': ' 198.51.100.2 , 10.0.0.1' }))).toBe('198.51.100.2')
    expect(ipDeLaPeticion(new Headers())).toBe('desconocida')
  })

  it('HMAC-SHA256 en hex: estable con el mismo secreto, distinto con otro, sin la IP dentro', () => {
    const a = hashIp('203.0.113.7', 's1')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(hashIp('203.0.113.7', 's1')).toBe(a)
    expect(hashIp('203.0.113.7', 's2')).not.toBe(a)
    expect(hashIp('203.0.113.8', 's1')).not.toBe(a)
  })

  it('sin SUGERENCIAS_IP_SECRET usa la clave de servicio; sin ninguna, lanza', () => {
    vi.stubEnv('SUGERENCIAS_IP_SECRET', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'clave-servicio')
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4', 'clave-servicio'))
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(() => hashIp('1.2.3.4')).toThrow(/SUGERENCIAS_IP_SECRET/)
  })
})

describe('mapa', () => {
  it('teselas de OpenFreeMap, sin clave', () => {
    expect(ESTILO_OPENFREEMAP).toBe('https://tiles.openfreemap.org/styles/positron')
  })

  it('el worker se sirve desde public/vendor con la versión en la ruta', () => {
    expect(urlWorker('6.11.2')).toBe('/vendor/maplibre-gl/6.11.2/maplibre-gl-worker.mjs')
  })

  it('puntos con nombre, tipo legible y enlace a la ficha; descarta coordenadas imposibles', () => {
    expect(puntosDe([
      { lat: 40.41821, lon: -3.71058, nombre: 'Teatro Real', tipo: 'teatro', slug: 'teatro-real' },
      { lat: 120, lon: 0, nombre: 'Roto', tipo: 'sala', slug: 'roto' },
      { lat: Number.NaN, lon: 0, nombre: 'NaN', tipo: 'sala', slug: 'nan' },
    ])).toEqual([{ lat: 40.41821, lon: -3.71058, nombre: 'Teatro Real', tipo: 'Teatro', url: '/espacios/teatro-real' }])
  })
})
