import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@/lib/supabase/anonimo', () => ({ clienteAnonimo: () => ({}) }))

import { listaDramaturgos } from '../datos'

describe('listaDramaturgos', () => {
  it('lista todos los autores con su número real de obras, sin «Anónimo» ni obras sin autor', () => {
    const lista = listaDramaturgos([
      { author: 'Lope de Vega' }, { author: ' Lope de Vega ' }, { author: 'Calderón de la Barca' },
      { author: 'Anónimo' }, { author: 'Anónimo' }, { author: 'Anónimo' }, { author: null }, { author: '  ' },
      { author: 'Tirso de Molina' }, { author: 'Juan del Encina' }, { author: 'Lucas Fernández' },
    ])
    expect(lista.map(a => [a.nombre, a.obras])).toEqual([
      ['Lope de Vega', 2], ['Calderón de la Barca', 1], ['Juan del Encina', 1], ['Lucas Fernández', 1], ['Tirso de Molina', 1],
    ])
    expect(lista[0].iniciales).toBe('LV')
  })
  it('vacía si no hay obras', () => {
    expect(listaDramaturgos([])).toEqual([])
  })
})
