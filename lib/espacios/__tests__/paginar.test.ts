import { describe, expect, it } from 'vitest'
import { leerTodasLasPaginas, PAGINA_SUPABASE } from '../paginar'

const filas = (n: number) => Array.from({ length: n }, (_, i) => ({ i }))

describe('leerTodasLasPaginas', () => {
  it('junta varias páginas hasta que una llega incompleta', async () => {
    const total = filas(PAGINA_SUPABASE * 2 + 255)
    const pedidas: [number, number][] = []
    const { data, error } = await leerTodasLasPaginas(async (desde, hasta) => {
      pedidas.push([desde, hasta])
      return { data: total.slice(desde, hasta + 1), error: null }
    })
    expect(error).toBeNull()
    expect(data).toHaveLength(total.length)
    expect(pedidas).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('hace una página más si el total es múltiplo exacto de 1.000', async () => {
    const total = filas(PAGINA_SUPABASE)
    let llamadas = 0
    const { data } = await leerTodasLasPaginas(async (desde, hasta) => {
      llamadas++
      return { data: total.slice(desde, hasta + 1), error: null }
    })
    expect(data).toHaveLength(PAGINA_SUPABASE)
    expect(llamadas).toBe(2)
  })

  it('devuelve el error de la página que falla', async () => {
    const { error } = await leerTodasLasPaginas(async () => ({ data: null, error: { message: 'caído' } }))
    expect(error?.message).toBe('caído')
  })
})
