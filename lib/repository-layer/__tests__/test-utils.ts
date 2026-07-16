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
