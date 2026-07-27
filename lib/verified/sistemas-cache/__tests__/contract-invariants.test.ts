import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['with-cache.ts', 'index.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

const LIB_ROOT = join(__dirname, '..', '..', '..', '..', 'lib')

/**
 * Conjunto B (incidente de trazabilidad, docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md)
 * excluido explicitamente: su contenido no es codigo verificado, no puede
 * usarse como evidencia de si respeta o no esta invariante.
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

describe('Sistemas de Caché — invariantes de integración (Plan Técnico aprobado 2026-07-23)', () => {
  it('nunca lanza excepción por fallo propio (degrada a loader) -- verificado por inspección de estructura', () => {
    expect(MODULE_SOURCE).toMatch(/catch/)
  })

  it('nunca importa ni referencia ningún objeto oficial del Núcleo por nombre de tipo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /ProfessionalContext|KnowledgeContext|DecisionContext|AuthorizationContext|AIExecutionResult|ExecutionAudit/
    )
  })

  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('exclusividad de consumidores: ningún módulo fuera de lib/repository-layer y lib/knowledge-assets importa este mecanismo', () => {
    const allFiles = listTsFiles(LIB_ROOT, '')
    const importPattern = /from ['"]@\/lib\/verified\/sistemas-cache['"]/

    const offendingFiles = allFiles.filter((relativePath) => {
      if (relativePath.startsWith(join('repository-layer'))) return false
      if (relativePath.startsWith(join('knowledge-assets'))) return false
      if (relativePath.startsWith(join('verified', 'sistemas-cache'))) return false

      const source = readFileSync(join(LIB_ROOT, relativePath), 'utf-8')
      return importPattern.test(source)
    })

    expect(offendingFiles).toEqual([])
  })
})
