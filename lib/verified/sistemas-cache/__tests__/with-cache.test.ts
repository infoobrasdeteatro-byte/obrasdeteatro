import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withCache, __resetCacheForTests } from '../with-cache'

describe('withCache', () => {
  beforeEach(() => {
    __resetCacheForTests()
  })

  it('invoca loader() en caso de miss y devuelve su resultado', async () => {
    const loader = vi.fn().mockResolvedValue('valor-1')

    const result = await withCache('key-1', 60_000, loader)

    expect(result).toBe('valor-1')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('en un hit vigente, no vuelve a invocar loader()', async () => {
    const loader = vi.fn().mockResolvedValue('valor-1')

    await withCache('key-2', 60_000, loader)
    const result = await withCache('key-2', 60_000, loader)

    expect(result).toBe('valor-1')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('tras expirar el TTL, vuelve a invocar loader()', async () => {
    vi.useFakeTimers()
    const loader = vi.fn().mockResolvedValueOnce('valor-1').mockResolvedValueOnce('valor-2')

    const first = await withCache('key-3', 1_000, loader)
    vi.advanceTimersByTime(1_001)
    const second = await withCache('key-3', 1_000, loader)

    expect(first).toBe('valor-1')
    expect(second).toBe('valor-2')
    expect(loader).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('claves distintas nunca comparten entrada', async () => {
    const loaderA = vi.fn().mockResolvedValue('a')
    const loaderB = vi.fn().mockResolvedValue('b')

    const resultA = await withCache('key-a', 60_000, loaderA)
    const resultB = await withCache('key-b', 60_000, loaderB)

    expect(resultA).toBe('a')
    expect(resultB).toBe('b')
  })

  it('un fallo de loader() se propaga sin interceptar, modificar ni transformar', async () => {
    const failure = new Error('fallo del origen de datos')
    const loader = vi.fn().mockRejectedValue(failure)

    await expect(withCache('key-4', 60_000, loader)).rejects.toBe(failure)
  })

  it('un fallo de loader() nunca se almacena en caché: la siguiente llamada vuelve a invocar loader()', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('primer fallo')).mockResolvedValueOnce('valor-recuperado')

    await expect(withCache('key-5', 60_000, loader)).rejects.toThrow('primer fallo')
    const result = await withCache('key-5', 60_000, loader)

    expect(result).toBe('valor-recuperado')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('nunca lanza excepción por fallo propio del mecanismo (independiente de loader)', async () => {
    const loader = vi.fn().mockResolvedValue('valor-ok')

    await expect(withCache('key-6', 60_000, loader)).resolves.toBe('valor-ok')
  })
})
