import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getOrSet } from '../cache'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getOrSet', () => {
  it('invoca el loader en el primer acceso a una clave y devuelve su resultado', async () => {
    const loader = vi.fn().mockResolvedValue('valor-1')

    const result = await getOrSet('clave-primer-acceso', 60, loader)

    expect(result).toBe('valor-1')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('devuelve el valor cacheado sin invocar el loader de nuevo dentro del TTL', async () => {
    const loader = vi.fn().mockResolvedValue('valor-2')

    await getOrSet('clave-dentro-ttl', 60, loader)
    const second = await getOrSet('clave-dentro-ttl', 60, loader)

    expect(second).toBe('valor-2')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('invoca el loader de nuevo una vez expirado el TTL', async () => {
    const loader = vi.fn().mockResolvedValueOnce('valor-inicial').mockResolvedValueOnce('valor-refrescado')

    await getOrSet('clave-expira', 60, loader)
    vi.advanceTimersByTime(61_000)
    const afterExpiry = await getOrSet('clave-expira', 60, loader)

    expect(afterExpiry).toBe('valor-refrescado')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('mantiene entradas independientes para claves distintas', async () => {
    const loaderA = vi.fn().mockResolvedValue('valor-a')
    const loaderB = vi.fn().mockResolvedValue('valor-b')

    const a = await getOrSet('clave-a', 60, loaderA)
    const b = await getOrSet('clave-b', 60, loaderB)

    expect(a).toBe('valor-a')
    expect(b).toBe('valor-b')
    expect(loaderA).toHaveBeenCalledTimes(1)
    expect(loaderB).toHaveBeenCalledTimes(1)
  })

  it('no cachea si el loader lanza: la siguiente llamada vuelve a invocarlo', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('valor-tras-fallo')

    await expect(getOrSet('clave-fallo', 60, loader)).rejects.toThrow('boom')
    const result = await getOrSet('clave-fallo', 60, loader)

    expect(result).toBe('valor-tras-fallo')
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
