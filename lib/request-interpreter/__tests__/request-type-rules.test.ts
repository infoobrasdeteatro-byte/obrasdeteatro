import { describe, it, expect } from 'vitest'
import { detectRequestType } from '../request-type-rules'

describe('detectRequestType', () => {
  it('devuelve RECONOCIDA cuando se detecto al menos un dominio', () => {
    expect(detectRequestType(1)).toBe('RECONOCIDA')
    expect(detectRequestType(3)).toBe('RECONOCIDA')
  })

  it('devuelve NO_RECONOCIDA cuando no se detecto ningun dominio', () => {
    expect(detectRequestType(0)).toBe('NO_RECONOCIDA')
  })
})
