import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['cache.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

describe('Sistemas de Caché — invariantes de integración (infraestructura auxiliar, no dependencia funcional)', () => {
  it('no depende de ningún otro módulo del proyecto -- infraestructura pura', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\//)
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('el contrato mínimo se limita a getOrSet -- sin invalidate() (revisión arquitectónica: sin caso de uso real todavía)', () => {
    expect(MODULE_SOURCE).toMatch(/export (async )?function getOrSet/)
    expect(MODULE_SOURCE).not.toMatch(/export (async )?function invalidate/i)
  })

  it('es ciego al significado de lo que cachea -- nunca inspecciona ni transforma el valor del loader', () => {
    expect(MODULE_SOURCE).not.toMatch(/responseType|profileId|ExecutionAudit|KnowledgeContext|DecisionContext/)
  })
})
