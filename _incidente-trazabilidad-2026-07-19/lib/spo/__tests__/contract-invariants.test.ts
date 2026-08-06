import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const SOURCE = readFileSync(join(__dirname, '..', 'process-request.ts'), 'utf-8')

const REQUIRED_CALLS = [
  'normalizeRequest(',
  'buildProfessionalContext(',
  'buildKnowledgeContext(',
  'buildDecisionContext(',
  'buildAuthorizationContext(',
  'executeAIRequest(',
  'composeResponse(',
  'recordExecutionAudit(',
  'recordActivity(',
]

describe('SPO — invariantes de composición (especificación arquitectónica congelada)', () => {
  it('invoca los 9 contratos obligatorios, en el orden congelado del recorrido', () => {
    const positions = REQUIRED_CALLS.map((call) => {
      const index = SOURCE.indexOf(call)
      expect(index, `${call} no encontrado`).toBeGreaterThan(-1)
      return index
    })

    const sorted = [...positions].sort((a, b) => a - b)
    expect(positions).toEqual(sorted)
  })

  it('nunca invoca recordMetric ni depende de Telemetría (fuera del recorrido obligatorio, Ajuste 2)', () => {
    expect(SOURCE).not.toMatch(/recordMetric|from '@\/lib\/telemetria'/)
  })

  it('no conoce ningún Dominio Funcional (DT-003) ni ningún Servicio de Plataforma de Fase D distinto de los ya autorizados', () => {
    expect(SOURCE).not.toMatch(/from '@\/lib\/mi-trayectoria'|from '@\/lib\/observabilidad'|from '@\/lib\/analitica'/)
  })

  it('nunca accede a Supabase directamente ni realiza persistencia genérica', () => {
    expect(SOURCE).not.toMatch(/supabase|createClient|\.insert\(|\.update\(|\.upsert\(|\.delete\(/i)
  })

  it('no contiene lógica condicional propia sobre las decisiones ya resueltas por los componentes especializados', () => {
    expect(SOURCE).not.toMatch(/\bif\s*\(/)
    expect(SOURCE).not.toMatch(/\.needsAI\b|\.authorizationStatus\s*===|\.executionStatus\s*===/)
  })

  it('recordExecutionAudit es la única llamada envuelta en manejo de fallo propio (asimetría ya verificada)', () => {
    const tryBlock = SOURCE.match(/try\s*{([\s\S]*?)}\s*catch/)
    expect(tryBlock).not.toBeNull()
    expect(tryBlock?.[1]).toMatch(/recordExecutionAudit\(/)
    expect(SOURCE.match(/try\s*{/g) ?? []).toHaveLength(1)
  })
})
