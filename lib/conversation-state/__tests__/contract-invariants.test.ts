import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MODULE_DIR = join(__dirname, '..')
const MODULE_FILES = readdirSync(MODULE_DIR).filter((file) => file.endsWith('.ts'))
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(MODULE_DIR, file), 'utf-8')).join('\n')

/**
 * Contratos que este modulo puede importar. LISTA BLANCA desde el primer
 * dia, no lista negra: el vocabulario de dominios y de conceptos pertenece
 * a Knowledge Assets, y esta es la unica dependencia que Conversation State
 * necesita para validar lo que recibe sin duplicar ese vocabulario.
 */
const AUTHORIZED_IMPORTS = ["from '@/lib/knowledge-assets'"]

describe('Conversation State — invariantes de integración (Fase 3)', () => {
  it('depende exclusivamente de Knowledge Assets: cualquier otro import falla, se llame como se llame', () => {
    const importLines = MODULE_SOURCE.match(/from '@\/lib\/[^']+'/g) ?? []

    expect(importLines.length).toBeGreaterThan(0)
    for (const importLine of importLines) {
      expect(AUTHORIZED_IMPORTS, importLine).toContain(importLine)
    }
  })

  it('nunca accede a Supabase ni a Repository Layer: no persiste nada', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('no importa ningún componente del Núcleo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /request-interpreter|professional-context-engine|scenaia-knowledge-model|decision-engine|credit-manager|ai-gateway|response-composer|accounting-engine|prompt-composer/i
    )
  })

  it('es puro y síncrono: sin async/await, sin I/O, sin red', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b|fetch\(/)
  })

  it('no lee el reloj ni genera identificadores: ambos los aporta quien invoca', () => {
    // Manteniendolo determinista, el estado es reproducible y testeable sin
    // congelar el tiempo. Quien introduce `Date` y `randomUUID` es el
    // Orquestador, que ya es impuro por naturaleza.
    expect(MODULE_SOURCE).not.toMatch(/new Date\(|Date\.now\(|randomUUID/)
  })

  it('no registra actividad ni telemetría: observar es responsabilidad de otro', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/telemetria'/)
    expect(MODULE_SOURCE).not.toMatch(/recordMetric|recordActivity/)
  })

  it('no expone identidad, autenticación ni estado de suscripción', () => {
    expect(MODULE_SOURCE).not.toMatch(/userId|authenticationStatus|is_premium|isPremium|stripe|subscription/i)
  })

  it('sin estado propio a nivel de módulo: ninguna variable mutable fuera de una función', () => {
    expect(MODULE_SOURCE).not.toMatch(/^(let|var)\s/m)
  })

  it('el contrato no contiene contenedores opacos: ni `any`, ni `unknown` como campo (PRD-001)', () => {
    const TYPES_SOURCE = readFileSync(join(MODULE_DIR, 'types.ts'), 'utf-8')

    expect(TYPES_SOURCE).not.toMatch(/\bany\b/)
    expect(TYPES_SOURCE).not.toMatch(/\bunknown\b/)
    expect(TYPES_SOURCE).not.toMatch(/Record<string, unknown>/)
  })

  it('`unknown` solo aparece como ENTRADA del validador, que es donde un dato sin forma la adquiere', () => {
    const VALIDATE_SOURCE = readFileSync(join(MODULE_DIR, 'validate.ts'), 'utf-8')
    const apariciones = VALIDATE_SOURCE.match(/\bunknown\b/g) ?? []

    // Todas en posición de parámetro o de guarda de tipo, ninguna en un campo.
    expect(apariciones.length).toBeGreaterThan(0)
    expect(VALIDATE_SOURCE).not.toMatch(/readonly \w+: unknown/)
  })

  it('la frontera rechaza un módulo NO autorizado aunque ningún nombre prohibido lo mencione', () => {
    for (const importLine of ["from '@/lib/verified/orquestador'", "from '@/lib/telemetria'", "from '@/lib/supabase/server'"]) {
      expect(AUTHORIZED_IMPORTS, importLine).not.toContain(importLine)
    }
  })
})
