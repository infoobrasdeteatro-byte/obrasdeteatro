import { vi } from 'vitest'

export interface FakeQueryResult {
  data: unknown
  error: unknown
}

export function createFakeSupabaseClient(result: FakeQueryResult) {
  const builder = {
    select: vi.fn((_columns: string) => builder),
    eq: vi.fn((_column: string, _value: unknown) => builder),
    is: vi.fn((_column: string, _value: unknown) => builder),
    ilike: vi.fn((_column: string, _pattern: string) => builder),
    neq: vi.fn((_column: string, _value: unknown) => builder),
    in: vi.fn((_column: string, _values: readonly unknown[]) => builder),
    gte: vi.fn((_column: string, _value: unknown) => builder),
    lte: vi.fn((_column: string, _value: unknown) => builder),
    order: vi.fn((_column: string, _options?: { ascending: boolean }) => builder),
    limit: vi.fn((_count: number) => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  const client = { from: vi.fn(() => builder) }
  return { client, builder }
}

/**
 * Fake para llamadas `.rpc(...)`: unas se resuelven directamente al await
 * (funciones que devuelven una fila unica, p. ej. settle/release), otras
 * encadenan `.single()` (funciones RETURNS TABLE, p. ej. verify-and-reserve)
 * -- el resultado debe soportar ambas formas de uso.
 */
export function createFakeSupabaseRpcClient(result: FakeQueryResult) {
  const rpcResult = {
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (value: FakeQueryResult) => unknown) => Promise.resolve(result).then(onFulfilled),
  }
  const rpc = vi.fn((_fn: string, _args?: Record<string, unknown>) => rpcResult)
  const client = { rpc }
  return { client, rpc, rpcResult }
}

/** Fake para `.from(table).insert(row)`, que se resuelve directamente al await, sin encadenar `.select()`. */
export function createFakeSupabaseInsertClient(result: FakeQueryResult) {
  const insert = vi.fn((_row: Record<string, unknown>) => Promise.resolve(result))
  const builder = { insert }
  const from = vi.fn((_table: string) => builder)
  const client = { from }
  return { client, from, insert }
}

/** Fake para `.from(table).update(row).eq(...).is(...)`, resuelto al await tras la última cláusula encadenada. */
export function createFakeSupabaseUpdateClient(result: FakeQueryResult) {
  const eqResult = { is: vi.fn((_column: string, _value: unknown) => Promise.resolve(result)) }
  const eq = vi.fn((_column: string, _value: unknown) => eqResult)
  const update = vi.fn((_row: Record<string, unknown>) => ({ eq }))
  const builder = { update }
  const from = vi.fn((_table: string) => builder)
  const client = { from }
  return { client, from, update, eq, isFn: eqResult.is }
}
