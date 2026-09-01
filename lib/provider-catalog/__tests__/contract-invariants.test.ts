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
    // Lo que esta invariante protege es QUE proveedores existen, no que
    // carezcan de tarifa. Incorporar una tarifa (Bloque 3) no incorpora un
    // proveedor: la lista sigue siendo exactamente la autorizada.
    expect(AI_PROVIDER_CATALOG.map((entry) => entry.id)).toEqual(['openai'])
    expect(AI_PROVIDER_CATALOG.map((entry) => entry.name)).toEqual(['OpenAI'])
  })

  /**
   * BLOQUE 3 — el precio del proveedor vive en un unico sitio, y su moneda
   * debe coincidir con la de X. Si no coincidiera, `toCredits` devolveria
   * `null` y el sistema seguiria liquidando el importe reservado sin que
   * ninguna prueba fallara: la clase de averia que no se ve.
   */
  it('toda tarifa declara su unidad y una moneda: una tarifa sin unidad no es interpretable', () => {
    for (const entry of AI_PROVIDER_CATALOG) {
      for (const rate of entry.rates ?? []) {
        expect(rate.pricingUnit, rate.model).toBe('PER_MILLION_TOKENS')
        expect(typeof rate.currency, rate.model).toBe('string')
        expect(rate.currency.length, rate.model).toBeGreaterThan(0)
      }
    }
  })

  it('MONEDA COHERENTE: toda tarifa se expresa en la misma moneda que X', () => {
    const economicUnit = readFileSync(join(__dirname, '..', '..', 'accounting-engine', 'economic-unit.ts'), 'utf-8')
    const monedaDeX = economicUnit.match(/currency:\s*'([A-Z]+)'/)?.[1]

    expect(monedaDeX).toBeDefined()
    for (const entry of AI_PROVIDER_CATALOG) {
      for (const rate of entry.rates ?? []) {
        expect(rate.currency, `${rate.model} vs X`).toBe(monedaDeX)
      }
    }
  })

  it('SIN NUMEROS MAGICOS: ningun precio de proveedor aparece fuera del catalogo', () => {
    const precios = AI_PROVIDER_CATALOG.flatMap((entry) =>
      (entry.rates ?? []).flatMap((rate) => [rate.inputPricePerMillionTokens, rate.outputPricePerMillionTokens])
    )

    expect(precios.length).toBeGreaterThan(0)
    // El calculo de coste no puede contener ninguno de esos precios.
    const costeSource = readFileSync(join(__dirname, '..', 'execution-cost.ts'), 'utf-8')
    for (const precio of precios) {
      expect(costeSource, String(precio)).not.toContain(String(precio))
    }
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
