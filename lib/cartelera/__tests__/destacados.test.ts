import { describe, it, expect } from 'vitest'
import { semanasUsadas, destacadosDe, diaSugerido, ordenPortada, diaCorto, type Destacado } from '../destacados'

const d = (id: string, esp: string, desde: string, hasta: string, origen = 'plan'): Destacado => ({ id, espectaculo_id: esp, desde, hasta, origen })

describe('cupo y estado', () => {
  const lista = [d('1', 'a', '2026-10-10', '2026-10-16'), d('2', 'a', '2026-10-20', '2026-10-26'), d('3', 'b', '2026-11-01', '2026-11-07'), d('4', 'b', '2026-10-30', '2026-11-05', 'moderacion')]
  it('cuenta solo las del plan, por el mes del primer día', () => {
    expect(semanasUsadas(lista, '2026-10')).toBe(2)
    expect(semanasUsadas(lista, '2026-11')).toBe(1)
  })
  it('en curso y próximas de un espectáculo', () => {
    expect(destacadosDe(lista, 'a', '2026-10-15')).toEqual({ enCurso: lista[0], proximos: [lista[1]] })
    expect(destacadosDe(lista, 'a', '2026-10-27')).toEqual({ enCurso: null, proximos: [] })
  })
  it('día sugerido', () => {
    expect(diaSugerido('2026-10-24', '2026-10-17', '2026-12-16')).toBe('2026-10-24')
    expect(diaSugerido('2027-02-01', '2026-10-17', '2026-12-16')).toBe('2026-10-17')
    expect(diaSugerido(null, '2026-10-17', '2026-12-16')).toBe('2026-10-17')
    expect(diaCorto('2026-10-24')).toBe('24 oct')
  })
})

describe('orden de la portada', () => {
  const fichas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(id => ({ id }))
  it('destacados primero (como mucho 4), el resto por fecha, total 8', () => {
    const amb = new Map([['c', ['ciudad']], ['h', ['ciudad']]])
    const r = ordenPortada(fichas, amb, 's')
    expect(r.fichas.slice(0, 2).map(f => f.id).sort()).toEqual(['c', 'h'])
    expect(r.fichas.slice(2).map(f => f.id)).toEqual(['a', 'b', 'd', 'e', 'f', 'g'])
    expect([...r.destacados].sort()).toEqual(['c', 'h'])
  })
  it('con más de 4 rotan según la semilla; los de «portada» siempre entran', () => {
    const amb = new Map(['a', 'b', 'c', 'd', 'e', 'f'].map(id => [id, ['ciudad']] as [string, string[]]))
    amb.set('j', ['portada'])
    const vistos = new Set<string>()
    for (let h = 0; h < 24; h++) {
      const r = ordenPortada(fichas, amb, `2026-10-17T${h}`)
      expect(r.destacados.size).toBe(4)
      expect(r.fichas[0].id).toBe('j')
      r.destacados.forEach(id => vistos.add(id))
    }
    expect(vistos.size).toBeGreaterThan(4)
  })
  it('sin destacados, igual que antes', () => {
    expect(ordenPortada(fichas, new Map(), 's').fichas.map(f => f.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })
})
