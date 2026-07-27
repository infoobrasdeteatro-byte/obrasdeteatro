import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = readFileSync(join(__dirname, '..', 'execute-ai-request.ts'), 'utf-8')

const LIB_ROOT = join(__dirname, '..', '..')
const EXCLUDED_DIRS = new Set(['spo', 'analitica', 'sistemas-cache', 'observabilidad'])

function listTsFiles(dir: string, base: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (base === '' && EXCLUDED_DIRS.has(entry.name)) continue
      files.push(...listTsFiles(join(dir, entry.name), join(base, entry.name)))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(join(base, entry.name))
    }
  }
  return files
}

describe('AI Gateway — invariantes de integración (SC-004.7)', () => {
  it('nunca accede a Supabase directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
  })

  it('no invoca directamente a los constructores de PCE, SKM, Decision Engine ni Credit Manager: solo consume sus tipos', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /buildProfessionalContext|buildKnowledgeContext|buildDecisionContext|buildAuthorizationContext|normalizeRequest/
    )
  })

  it('nunca importa Accounting Engine (IA-007: fuera de su responsabilidad)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/accounting-engine'/)
  })

  it('no decide el proveedor por su cuenta: nunca contiene un catálogo ni una tabla de proveedores propia', () => {
    expect(MODULE_SOURCE).not.toMatch(/'claude'|'openai'|'gpt-|anthropic-ai|@anthropic-ai|openai\//i)
  })

  it('no importa ningún SDK de proveedor ni realiza llamadas de red directas (IA-OPENAI-002: esa responsabilidad vive exclusivamente en los adaptadores registrados)', () => {
    // Se comprueban patrones reales de import/uso de SDK, no la subcadena "openai" sin más
    // (colisionaría con referencias documentales al propio expediente IA-OPENAI-002 en comentarios).
    expect(MODULE_SOURCE).not.toMatch(/fetch\(|axios|from 'openai'|from "openai"|require\(['"]openai['"]\)|new OpenAI\(/)
  })

  it('delega toda ejecución real en el registro de adaptadores, nunca importa un adaptador de proveedor concreto', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '\.\/openai-adapter'/)
    expect(MODULE_SOURCE).toMatch(/from '\.\/provider-registry'/)
  })

  it('exclusividad: solo provider-registry.ts conoce el adaptador de OpenAI en todo el repositorio', () => {
    const allFiles = listTsFiles(LIB_ROOT, '')
    const importPattern = /from ['"].*openai-adapter['"]/

    const offendingFiles = allFiles.filter((relativePath) => {
      if (relativePath === join('ai-gateway', 'provider-registry.ts')) return false
      if (relativePath === join('ai-gateway', 'openai-adapter.ts')) return false
      if (relativePath.includes(join('ai-gateway', '__tests__'))) return false

      const source = readFileSync(join(LIB_ROOT, relativePath), 'utf-8')
      return importPattern.test(source)
    })

    expect(offendingFiles).toEqual([])
  })
})
