import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'coordinate-flow.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const COORDINATE_FLOW_SOURCE = readFileSync(join(__dirname, '..', 'coordinate-flow.ts'), 'utf-8')

const AUTHORIZED_IMPORTS = [
  "from '@/lib/request-interpreter'",
  "from '@/lib/professional-context-engine'",
  "from '@/lib/scenaia-knowledge-model'",
  "from '@/lib/decision-engine'",
  "from '@/lib/credit-manager'",
  "from '@/lib/ai-gateway'",
  "from '@/lib/response-composer'",
  "from '@/lib/procesos-asincronos'",
  "from '@/lib/execution-audit-router'",
  "from '@/lib/direct-content-builder'",
  "from '@/lib/prompt-composer'",
  "from '@/lib/intent-resolver'",
  // Fase 0 (Plan Maestro): punto de integracion de observabilidad
  // autorizado expresamente por Direccion. El Orquestador es el unico
  // componente con visibilidad completa del turno; sigue SIN importar
  // Telemetria directamente (invariante comprobada mas abajo).
  "from '@/lib/verified/observabilidad'",
  // Cierre del circuito economico: liquidar o liberar la reserva exige
  // conocer AuthorizationContext y ExecutionAudit a la vez, y el
  // Orquestador es el unico punto que dispone de ambos. Sigue SIN acceder
  // a Supabase ni a Repository Layer (invariante comprobada mas arriba).
  "from '@/lib/accounting-engine'",
]

describe('Orquestador (lib/verified) — invariantes de integración (Plan Técnico aprobado, Acta de Autorización 2026-07-19)', () => {
  it('nunca accede a Supabase ni a Repository Layer directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('depende exclusivamente de los 14 contratos autorizados (10 del Plan Técnico + Prompt Composer, SCENAIA-002A + Intent Resolver + Observabilidad + Accounting Engine), ningún otro', () => {
    const importLines = MODULE_SOURCE.match(/from '@\/lib\/[^']+'/g) ?? []
    for (const importLine of importLines) {
      expect(AUTHORIZED_IMPORTS.some((authorized) => importLine === authorized)).toBe(true)
    }
  })

  it('no depende de Mi Trayectoria®, Telemetría, Analítica, Sistemas de Caché ni de ningún artefacto del Conjunto B (lib/spo)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/mi-trayectoria'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/telemetria'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/analitica'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/sistemas-cache'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/spo'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/observabilidad'/)
  })

  it('no invoca recordMetric() directamente (ya delega en recordExecutionTrace, Vacío 2 del Plan Técnico)', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/recordMetric/)
  })

  it('sin estado propio a nivel de módulo (PAO-04): sin variables mutables fuera de la función', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/^(let|var)\s/m)
  })
})
