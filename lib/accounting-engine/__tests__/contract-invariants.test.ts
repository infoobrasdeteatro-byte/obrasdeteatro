import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['reservation.ts', 'settlement.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Accounting Engine — invariantes de integración (SC-005.3)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('nunca compone una llamada RPC ni SQL propia: toda escritura delega en Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('no importa ningún componente del Núcleo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /decision-engine|credit-manager|ai-gateway|response-composer|request-interpreter/i
    )
  })

  it('nunca lee ni deriva el límite de plan (DA-001): solo lo recibe como parámetro', () => {
    expect(MODULE_SOURCE).not.toMatch(/profiles\.plan|subscriptions\.plan|\.subscription\b/i)
  })
})
