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
