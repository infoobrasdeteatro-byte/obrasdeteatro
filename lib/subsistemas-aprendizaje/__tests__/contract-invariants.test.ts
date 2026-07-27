import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['types.ts', 'run-learning-cycle.ts', 'index.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

const LIB_ROOT = join(__dirname, '..', '..', '..', 'lib')

/**
 * Conjunto B (incidente de trazabilidad, docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md)
 * excluido explicitamente: su contenido no es codigo verificado.
 */
const EXCLUDED_DIRS = new Set(['spo', 'analitica', 'sistemas-cache', 'observabilidad'])

function listTsFiles(dir: string, base: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relativePath = join(base, entry)

    if (statSync(fullPath).isDirectory()) {
      if (base === '' && EXCLUDED_DIRS.has(entry)) continue
      files.push(...listTsFiles(fullPath, relativePath))
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(relativePath)
    }
  }

  return files
}

describe('Subsistemas de Aprendizaje — invariantes de integración (R-02, Plan Técnico aprobado 2026-07-23)', () => {
  it('no participa en el flujo síncrono: no importa ni es importado por el Orquestador, Procesos Asíncronos ni ningún componente del Núcleo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /from '@\/lib\/verified\/orquestador'|from '@\/lib\/procesos-asincronos'|from '@\/lib\/request-interpreter'|from '@\/lib\/professional-context-engine'|from '@\/lib\/scenaia-knowledge-model'|from '@\/lib\/decision-engine'|from '@\/lib\/credit-manager'|from '@\/lib\/ai-gateway'|from '@\/lib\/response-composer'/
    )
  })

  it('no importa Repository Layer, Knowledge Assets ni ExecutionAudit', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'|from '@\/lib\/knowledge-assets'|ExecutionAudit/)
  })

  it('no accede a Supabase ni a ninguna fuente de datos', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('nunca marca executed como true en el código fuente (ningún vacío se ha rellenado por inercia)', () => {
    expect(MODULE_SOURCE).not.toMatch(/executed:\s*true/)
  })

  it('exclusividad: ningún otro módulo del proyecto importa este componente todavía', () => {
    const allFiles = listTsFiles(LIB_ROOT, '')
    const importPattern = /from ['"]@\/lib\/subsistemas-aprendizaje['"]/

    const offendingFiles = allFiles.filter((relativePath) => {
      if (relativePath.startsWith(join('subsistemas-aprendizaje'))) return false

      const source = readFileSync(join(LIB_ROOT, relativePath), 'utf-8')
      return importPattern.test(source)
    })

    expect(offendingFiles).toEqual([])
  })
})
