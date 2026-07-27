interface CacheEntry<T> {
  readonly value: T
  readonly expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

/**
 * Unico punto de acceso publico (Plan Tecnico aprobado, Sistemas de Cache,
 * 2026-07-23). Cache-aside en memoria del proceso. Nunca intercepta,
 * modifica ni transforma un fallo de `loader` -- se propaga exactamente
 * igual que si este mecanismo no existiera. Un fallo interno propio (del
 * propio almacen) degrada de forma silenciosa a invocar `loader()`
 * directamente -- nunca lanza excepcion por si mismo.
 */
export async function withCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  try {
    const entry = store.get(key)
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value as T
    }
  } catch {
    // Fallo interno del propio mecanismo de cache: degrada a loader().
  }

  const value = await loader()

  try {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  } catch {
    // Fallo interno al guardar: no afecta al valor ya obtenido de loader().
  }

  return value
}

/**
 * Uso exclusivo de pruebas -- no se exporta desde index.ts, no forma parte
 * del contrato publico del modulo.
 */
export function __resetCacheForTests(): void {
  store.clear()
}
