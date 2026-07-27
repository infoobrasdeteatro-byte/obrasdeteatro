import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'registry.ts', 'distribute.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')
const DISTRIBUTE_SOURCE = readFileSync(join(__dirname, '..', 'distribute.ts'), 'utf-8')

function readComponentSource(componentDir: string): string {
  const base = join(__dirname, '..', '..', componentDir)
  const files = readdirSync(base).filter((f) => f.endsWith('.ts'))
  return files.map((f) => readFileSync(join(base, f), 'utf-8')).join('\n')
}

describe('execution-audit-router — invariantes (IA-007, Decisión de Dirección y Plan Técnico aprobados 2026-07-22)', () => {
  it('AI Gateway nunca importa el enrutador: preserva el desacoplamiento productor-consumidores', () => {
    expect(readComponentSource('ai-gateway')).not.toMatch(/execution-audit-router/)
  })

  it('distribute.ts no contiene lógica específica de ningún consumidor: solo delega en deliver()', () => {
    expect(DISTRIBUTE_SOURCE).not.toMatch(/recordExecutionTrace|recordMetric|recordActivity|settleReservation|verifyAndReserve/)
  })

  it('degrada de forma segura: distribute.ts nunca deja que el fallo de un consumidor detenga a los demás', () => {
    expect(DISTRIBUTE_SOURCE).toMatch(/allSettled/)
  })

  it('no accede a Supabase ni a Repository Layer directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
  })
})
