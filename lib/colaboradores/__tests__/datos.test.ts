import { describe, it, expect, vi, beforeEach } from 'vitest'

// unstable_cache como envoltorio transparente que recuerda sus opciones.
const cache = vi.hoisted(() => ({ opciones: null as unknown, claves: null as unknown }))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>, claves: unknown, opciones: unknown) => {
    cache.claves = claves
    cache.opciones = opciones
    return fn
  },
}))

const respuesta = { data: [] as unknown[] | null, error: null as { message: string } | null, consultas: 0 }
vi.mock('@/lib/supabase/anonimo', () => ({
  clienteAnonimo: () => ({
    from: () => {
      respuesta.consultas++
      const cadena = {
        select: () => cadena,
        eq: () => cadena,
        order: (col: string) => (col === 'nombre'
          ? Promise.resolve({ data: respuesta.data, error: respuesta.error })
          : cadena),
      }
      return cadena
    },
  }),
}))

import { colaboradoresActivos, hayColaboradoresActivos } from '../datos'

beforeEach(() => {
  respuesta.data = []
  respuesta.error = null
  respuesta.consultas = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('lectura pública cacheada de colaboradores', () => {
  it('se cachea 10 minutos con la etiqueta «colaboradores»', () => {
    expect(cache.opciones).toEqual({ revalidate: 600, tags: ['colaboradores'] })
    expect(cache.claves).toEqual(['colaboradores-activos'])
  })

  it('sin activos: lista vacía y el pie no enlaza', async () => {
    expect(await colaboradoresActivos()).toEqual([])
    expect(await hayColaboradoresActivos()).toBe(false)
  })

  it('con alguno activo: el pie enlaza', async () => {
    respuesta.data = [{ id: 'm1', nombre: 'Revista Escena', tipo: 'medio', orden: 1 }]
    expect(await hayColaboradoresActivos()).toBe(true)
  })

  it('un error no rompe la página ni el pie: lista vacía (y la función cacheada lanza, así que no se guarda)', async () => {
    respuesta.data = null
    respuesta.error = { message: 'tabla inexistente' }
    expect(await colaboradoresActivos()).toEqual([])
    expect(await hayColaboradoresActivos()).toBe(false)
  })
})
