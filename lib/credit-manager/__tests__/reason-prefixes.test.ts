import { describe, it, expect } from 'vitest'
import { formatReason } from '../reason-prefixes'

describe('formatReason', () => {
  it('antepone el prefijo determinista correspondiente', () => {
    expect(formatReason('NO_APLICA', 'no se requiere IA')).toBe('NO_APLICA: no se requiere IA')
    expect(formatReason('VERIFICADO', 'reserva confirmada')).toBe('VERIFICADO: reserva confirmada')
    expect(formatReason('SIN_DATOS_VERIFICABLES', 'coste no disponible')).toBe(
      'SIN_DATOS_VERIFICABLES: coste no disponible'
    )
    expect(formatReason('VERIFICACION_NEGATIVA', 'creditos insuficientes')).toBe(
      'VERIFICACION_NEGATIVA: creditos insuficientes'
    )
  })
})
