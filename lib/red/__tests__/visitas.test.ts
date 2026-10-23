import { describe, expect, it } from 'vitest'
import { esBot, huellaVisitante, ipDe, variacion } from '../visitas'

describe('visitas', () => {
  it('detecta bots y vistas previas', () => {
    expect(esBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(esBot('WhatsApp/2.23')).toBe(true)
    expect(esBot('facebookexternalhit/1.1')).toBe(true)
    expect(esBot(null)).toBe(true)
    expect(esBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36')).toBe(false)
  })
  it('la huella cambia con el día y no contiene datos en claro', () => {
    const a = huellaVisitante({ ip: '1.2.3.4', userAgent: 'X', dia: '2026-10-24' })
    const b = huellaVisitante({ ip: '1.2.3.4', userAgent: 'X', dia: '2026-10-25' })
    expect(a).toHaveLength(64)
    expect(a).not.toBe(b)
    expect(a).not.toContain('1.2.3.4')
    expect(huellaVisitante({ userId: 'u1', ip: '9.9.9.9', dia: '2026-10-24' }))
      .toBe(huellaVisitante({ userId: 'u1', ip: '8.8.8.8', dia: '2026-10-24' }))
  })
  it('ip de x-forwarded-for', () => {
    expect(ipDe(new Headers({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }))).toBe('5.6.7.8')
    expect(ipDe(new Headers())).toBeNull()
  })
  it('variación', () => {
    expect(variacion(12, 10)).toBe(20)
    expect(variacion(5, 0)).toBeNull()
    expect(variacion(5, 10)).toBe(-50)
  })
})
