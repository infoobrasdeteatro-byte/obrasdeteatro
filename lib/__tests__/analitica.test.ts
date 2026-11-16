import { describe, it, expect } from 'vitest'
import { ANALITICA_DESDE, GA_ID, analiticaConsentida, consentimientoAnterior } from '../analitica'

const DESPUES = '2026-11-20T10:00:00.000Z'
const ANTES = '2026-10-01T10:00:00.000Z'
const prefs = (analytics: unknown) => JSON.stringify({ necessary: true, preferences: true, analytics, marketing: false })

describe('consentimiento de la analítica', () => {
  it('el ID de medición tiene el formato de GA4', () => {
    expect(GA_ID).toMatch(/^G-[A-Z0-9]{8,12}$/)
  })
  it('vale si aceptó las analíticas después de que el aviso informara de ellas', () => {
    expect(analiticaConsentida(prefs(true), DESPUES)).toBe(true)
    expect(analiticaConsentida(prefs(true), ANALITICA_DESDE)).toBe(true)
  })
  it('no vale un «aceptar» anterior: entonces el aviso decía que no había analíticas', () => {
    expect(analiticaConsentida(prefs(true), ANTES)).toBe(false)
    expect(consentimientoAnterior(ANTES)).toBe(true)
  })
  it('no vale si las rechazó, ni sin datos, ni con datos corruptos', () => {
    expect(analiticaConsentida(prefs(false), DESPUES)).toBe(false)
    expect(analiticaConsentida(prefs('true'), DESPUES)).toBe(false)
    expect(analiticaConsentida(null, DESPUES)).toBe(false)
    expect(analiticaConsentida(prefs(true), null)).toBe(false)
    expect(analiticaConsentida('{no es json', DESPUES)).toBe(false)
    expect(consentimientoAnterior('no es una fecha')).toBe(true)
  })
})
