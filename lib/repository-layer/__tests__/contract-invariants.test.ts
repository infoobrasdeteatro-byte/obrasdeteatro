import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['identity.ts', 'professional-profile.ts', 'works.ts', 'organizations.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Repository Layer — invariantes de integración (SC-005.1)', () => {
  it('usa exclusivamente el cliente ya existente de lib/supabase/server, sin instanciar otro', () => {
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/supabase\/server'/)
    expect(MODULE_SOURCE).not.toMatch(/createServerClient|createBrowserClient|@supabase\/ssr|@supabase\/supabase-js/)
  })

  it('no crea ningún cliente privilegiado (service role)', () => {
    expect(MODULE_SOURCE).not.toMatch(/service[_-]?role/i)
  })

  it('es exclusivamente de lectura: no contiene ninguna operación de escritura', () => {
    expect(MODULE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('no expone ningún dato del dominio Subscription (Incidencia A)', () => {
    expect(MODULE_SOURCE).not.toMatch(/is_premium|isPremium|subscriptions|stripe/i)
  })
})
