import { describe, it, expect } from 'vitest'
import { repartirEspectaculos, MAX_ANTERIORES, type FilaEspectaculoPerfil } from '../perfil'

const ahora = Date.parse('2026-10-17T10:00:00Z')
const fn = (id: string, inicio: string, estado = 'programada') => ({
  id, inicio, zona_horaria: 'Europe/Madrid', ciudad: 'Caracas', pais_code: 'VE', lugar_nombre: 'Sala', espacio_id: null, estado,
})
const esp = (id: string, estado: string, funciones: FilaEspectaculoPerfil['funciones']): FilaEspectaculoPerfil => ({
  id, slug: id, titulo: id, compania_nombre: 'Cía', cartel_url: null, genero_id: 'teatro', user_id: 'u', estado, funciones,
})

describe('espectáculos del perfil', () => {
  it('en cartel: publicados con funciones próximas, por fecha', () => {
    const r = repartirEspectaculos([
      esp('b', 'publicado', [fn('1', '2026-10-30T18:00:00Z')]),
      esp('a', 'publicado', [fn('2', '2026-10-01T18:00:00Z'), fn('3', '2026-10-24T18:00:00Z')]),
    ], ahora)
    expect(r.enCartel.map(e => e.id)).toEqual(['a', 'b'])
    // Solo cuentan las funciones próximas.
    expect(r.enCartel[0].funciones).toBe(1)
    expect(r.anteriores).toEqual([])
  })

  it('anteriores: finalizados, publicados sin funciones próximas o solo con canceladas', () => {
    const r = repartirEspectaculos([
      esp('fin', 'finalizado', [fn('1', '2026-12-01T18:00:00Z')]),
      esp('pasado', 'publicado', [fn('2', '2026-09-01T18:00:00Z')]),
      esp('cancelado', 'publicado', [fn('3', '2026-11-01T18:00:00Z', 'cancelada'), fn('4', '2025-05-01T18:00:00Z')]),
    ], ahora)
    expect(r.enCartel).toEqual([])
    expect(r.anteriores.map(e => e.id)).toEqual(['fin', 'pasado', 'cancelado'])
    expect(r.anteriores[2].ultima).toBe('2025-05-01T18:00:00Z')
    expect(r.anteriores[0].ciudades).toEqual(['Caracas'])
  })

  it(`como mucho ${MAX_ANTERIORES} anteriores`, () => {
    const muchos = Array.from({ length: 20 }, (_, i) => esp(`e${i}`, 'finalizado', [fn(`f${i}`, `2025-0${(i % 9) + 1}-01T18:00:00Z`)]))
    expect(repartirEspectaculos(muchos, ahora).anteriores).toHaveLength(MAX_ANTERIORES)
  })
})
