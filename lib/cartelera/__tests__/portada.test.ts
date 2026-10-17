import { describe, it, expect, vi } from 'vitest'
import type { FuncionListado } from '../listado'

vi.mock('@/lib/supabase/anonimo', () => ({ clienteAnonimo: () => { throw new Error('sin red') } }))

const { seleccionPortada, enCartelPortada, MAX_PORTADA } = await import('../portada')

const esp = (id: string) => ({ id, slug: id, titulo: id, compania_nombre: 'Cía', cartel_url: null, genero_id: 'teatro', user_id: 'u' })
const fn = (id: string, inicio: string, e: string): FuncionListado => ({
  id, inicio, zona_horaria: 'Europe/Madrid', ciudad: 'Madrid', pais_code: 'ES', lugar_nombre: 'Sala', espacio_id: null, estado: 'programada', espectaculo: esp(e),
})

describe('franja «En cartel» de la portada', () => {
  it('un cartel por espectáculo, ordenados por la función más cercana', () => {
    const r = seleccionPortada([
      fn('1', '2026-10-20T18:00:00Z', 'b'),
      fn('2', '2026-10-18T18:00:00Z', 'a'),
      fn('3', '2026-10-19T18:00:00Z', 'b'),
      fn('4', '2026-10-25T18:00:00Z', 'c'),
    ])
    expect(r.map(e => e.id)).toEqual(['a', 'b', 'c'])
    expect(r[1].funciones).toBe(2)
  })

  it(`como mucho ${MAX_PORTADA}`, () => {
    const muchas = Array.from({ length: 12 }, (_, i) => fn(`f${i}`, `2026-11-${String(i + 1).padStart(2, '0')}T18:00:00Z`, `e${i}`))
    expect(seleccionPortada(muchas)).toHaveLength(MAX_PORTADA)
  })

  it('si la lectura falla, la franja queda vacía (sin relleno)', async () => {
    const r = await enCartelPortada(Date.now())
    expect(r.fichas).toEqual([])
  })
})
