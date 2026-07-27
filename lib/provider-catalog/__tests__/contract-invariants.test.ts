import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { AI_PROVIDER_CATALOG } from '../catalog'

const CATALOG_SOURCE = readFileSync(join(__dirname, '..', 'catalog.ts'), 'utf-8')

function readComponentSource(componentDir: string): string {
  const base = join(__dirname, '..', '..', componentDir)
  const files = readdirSync(base).filter((f) => f.endsWith('.ts'))
  return files.map((f) => readFileSync(join(base, f), 'utf-8')).join('\n')
}

const OTHER_NUCLEO_COMPONENTS = [
  'request-interpreter',
  'professional-context-engine',
  'scenaia-knowledge-model',
  'credit-manager',
  'ai-gateway',
  'response-composer',
]

describe('Catálogo de proveedores de IA — invariantes (Decisión de Dirección, cierre de IA-006)', () => {
  it('es de solo lectura: no expone ninguna función de escritura ni mutador', () => {
    expect(CATALOG_SOURCE).not.toMatch(/export function|=>\s*{|\.push\(|\.splice\(/)
  })

  it('solo contiene proveedores incorporados mediante Autorización Oficial de Implementación (IA-OPENAI-001, 2026-07-23): exactamente OpenAI', () => {
    expect(AI_PROVIDER_CATALOG).toEqual([{ id: 'openai', name: 'OpenAI' }])
  })

  it('AI Gateway nunca lo importa: invoca, nunca selecciona', () => {
    expect(readComponentSource('ai-gateway')).not.toMatch(/provider-catalog/)
  })

  it('ningún componente del Núcleo distinto de Decision Engine lo importa', () => {
    for (const componentDir of OTHER_NUCLEO_COMPONENTS) {
      expect(readComponentSource(componentDir)).not.toMatch(/provider-catalog/)
    }
  })
})
