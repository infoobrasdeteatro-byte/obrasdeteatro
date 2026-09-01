import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MODULE_SOURCE = ['reservation.ts', 'settlement.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Accounting Engine — invariantes de integración (SC-005.3)', () => {
  it('nunca accede a Supabase directamente: toda persistencia pasa por Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('nunca compone una llamada RPC ni SQL propia: toda escritura delega en Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('no importa ningún componente del Núcleo', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /decision-engine|credit-manager|ai-gateway|response-composer|request-interpreter/i
    )
  })

  it('nunca lee ni deriva el límite de plan (DA-001): solo lo recibe como parámetro', () => {
    expect(MODULE_SOURCE).not.toMatch(/profiles\.plan|subscriptions\.plan|\.subscription\b/i)
  })
})

/**
 * BLOQUE 3 — X tiene un unico domicilio.
 *
 * Un segundo lugar donde escribir el valor del credito seria un segundo
 * lugar donde olvidarlo al cambiarlo, y el sistema pasaria a liquidar con
 * dos unidades economicas distintas sin que nada fallara. Estas invariantes
 * existen para que eso no pueda ocurrir en silencio.
 */
describe('Accounting Engine — X, fuente unica (Bloque 3)', () => {
  const LIB_ROOT = join(__dirname, '..', '..')
  const ECONOMIC_UNIT = readFileSync(join(__dirname, '..', 'economic-unit.ts'), 'utf-8')

  /** Todos los .ts de produccion del repositorio (sin pruebas). */
  function ficherosDeProduccion(dir: string): string[] {
    const salida: string[] = []
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      if (entrada.isDirectory()) {
        if (entrada.name === '__tests__') continue
        salida.push(...ficherosDeProduccion(join(dir, entrada.name)))
      } else if (entrada.name.endsWith('.ts')) {
        salida.push(join(dir, entrada.name))
      }
    }
    return salida
  }

  it('X esta declarada, con moneda, en economic-unit.ts', () => {
    expect(ECONOMIC_UNIT).toMatch(/export const CREDIT_VALUE[^=]*=\s*\{[^}]*amountPerCredit:\s*[\d.]+/)
    expect(ECONOMIC_UNIT).toMatch(/currency:\s*'[A-Z]+'/)
  })

  it('SIN DUPLICADOS: el valor de X no aparece en ningun otro archivo de produccion', () => {
    const valor = ECONOMIC_UNIT.match(/amountPerCredit:\s*([\d.]+)/)?.[1]
    expect(valor).toBeDefined()

    const infractores = ficherosDeProduccion(LIB_ROOT).filter((ruta) => {
      if (ruta.endsWith(join('accounting-engine', 'economic-unit.ts'))) return false
      return readFileSync(ruta, 'utf-8').includes(valor!)
    })

    expect(infractores).toEqual([])
  })

  it('X NO se deriva del proveedor: economic-unit no contiene ninguna tarifa', () => {
    // Importa `calculateExecutionCost` para usarla, pero jamas un precio.
    expect(ECONOMIC_UNIT).not.toMatch(/PricePerMillionTokens:\s*[\d.]+/)
  })

  it('la conversion no redondea: una sola division, sin toFixed ni Math.round', () => {
    expect(ECONOMIC_UNIT).not.toMatch(/toFixed\(|Math\.round\(|Math\.floor\(|Math\.ceil\(/)
  })
})
