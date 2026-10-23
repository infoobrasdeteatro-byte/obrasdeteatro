import { describe, expect, it } from 'vitest'
import { bloquesQueCuentan, porcentajeCompleto } from '../completitud'
import type { BlockStatus } from '@/components/dashboard/BlockCard'

const b = (estados: BlockStatus[]) => estados.map((status, i) => ({ n: i + 1, status }))

describe('bloquesQueCuentan', () => {
  it('quita los bloqueados por el plan y los «próximamente»', () => {
    const r = bloquesQueCuentan(b(['complete', 'empty', 'complete', 'empty', 'locked', 'empty', 'complete', 'locked', 'soon']), 'actor')
    expect(r.map(x => x.n)).toEqual([1, 2, 3, 4, 6, 7])
  })
  it('quita Profesiones en organizaciones, no en personas', () => {
    const estados = b(['complete', 'empty', 'empty'])
    expect(bloquesQueCuentan(estados, 'teatro').map(x => x.n)).toEqual([1, 2])
    expect(bloquesQueCuentan(estados, 'profesional').map(x => x.n)).toEqual([1, 2, 3])
  })
})

describe('porcentajeCompleto', () => {
  it('completo y verificado suman 1; en progreso, medio', () => {
    // El caso del panel de Dirección: 4 completos + 2 en progreso de 9 → 56 %
    expect(porcentajeCompleto(b(['complete', 'empty', 'complete', 'empty', 'empty', 'partial', 'complete', 'partial', 'verified']))).toBe(56)
  })
  it('una cuenta gratuita con todo lo suyo completo llega al 100 %', () => {
    const bloques = bloquesQueCuentan(b(['complete', 'complete', 'complete', 'complete', 'locked', 'complete', 'complete', 'locked', 'verified']), 'actor')
    expect(porcentajeCompleto(bloques)).toBe(100)
  })
  it('sin bloques, 0', () => {
    expect(porcentajeCompleto([])).toBe(0)
  })
})
