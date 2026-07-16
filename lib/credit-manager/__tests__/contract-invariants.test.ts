import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['reason-prefixes.ts', 'parse-authorized-limit.ts', 'authorize.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

describe('Credit Manager — invariantes de integración (SC-004.5)', () => {
  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('no invoca directamente a los constructores del PCE, del SKM ni de Decision Engine: solo consume sus tipos', () => {
    expect(MODULE_SOURCE).not.toMatch(/buildProfessionalContext|buildKnowledgeContext|buildDecisionContext|normalizeRequest/)
  })

  it('su única dependencia funcional nueva es verifyAndReserve de Accounting Engine -- nunca settleReservation ni releaseReservation', () => {
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/accounting-engine'/)
    expect(MODULE_SOURCE).not.toMatch(/settleReservation|releaseReservation|expireStaleReservations/)
  })

  it('no importa Repository Layer ni Knowledge Assets directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/knowledge-assets'/)
  })

  it('no modifica creditos directamente ni compone ninguna llamada SQL/RPC propia', () => {
    expect(MODULE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })
})
