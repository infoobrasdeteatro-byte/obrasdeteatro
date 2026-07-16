import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const READ_ONLY_MODULES = ['identity.ts', 'professional-profile.ts', 'works.ts', 'organizations.ts']
const READ_ONLY_SOURCE = READ_ONLY_MODULES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join(
  '\n'
)

const ACCOUNTING_SOURCE = readFileSync(join(__dirname, '..', 'accounting.ts'), 'utf-8')

const MODULE_SOURCE = [READ_ONLY_SOURCE, ACCOUNTING_SOURCE].join('\n')

describe('Repository Layer — invariantes de integración (SC-005.1)', () => {
  it('usa exclusivamente el cliente ya existente de lib/supabase/server, sin instanciar otro', () => {
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/supabase\/server'/)
    expect(MODULE_SOURCE).not.toMatch(/createServerClient|createBrowserClient|@supabase\/ssr|@supabase\/supabase-js/)
  })

  it('no crea ningún cliente privilegiado (service role)', () => {
    expect(MODULE_SOURCE).not.toMatch(/service[_-]?role/i)
  })

  it('no expone ningún dato del dominio Subscription (Incidencia A)', () => {
    expect(MODULE_SOURCE).not.toMatch(/is_premium|isPremium|subscriptions|stripe/i)
  })
})

describe('Repository Layer — módulos de solo lectura (identity, professional-profile, works, organizations)', () => {
  it('no contienen ninguna operación de escritura ni de RPC', () => {
    expect(READ_ONLY_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })
})

describe('Repository Layer — accounting.ts (invariante de componente, aprobado 2026-07-16)', () => {
  it('nunca realiza una mutación directa y genérica sobre la tabla (solo operaciones nombradas vía RPC)', () => {
    expect(ACCOUNTING_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
  })

  it('toda escritura pasa por una función RPC nombrada y con contrato propio', () => {
    expect(ACCOUNTING_SOURCE).toMatch(
      /\.rpc\('accounting_verify_and_reserve'|\.rpc\('accounting_settle_reservation'|\.rpc\('accounting_release_reservation'|\.rpc\('accounting_expire_stale_reservations'/
    )
  })
})
