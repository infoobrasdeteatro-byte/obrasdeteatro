import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/** Codigo del interprete SIN comentarios: la documentacion puede nombrar
 *  lo que ya no se hace, y nombrarlo no es hacerlo. */
const INTERPRETER_SOURCE = readFileSync(join(__dirname, '..', 'interpreter.ts'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*/g, '')

// `types.ts` quedaba fuera de la frontera que este archivo declara vigilar:
// un import prohibido en el contrato habria pasado inadvertido. Incorporado
// por autorizacion expresa de Direccion (Fase 3) -- endurecimiento del
// invariante existente, sin ampliar ningun permiso.
const MODULE_SOURCE = ['normalize-text.ts', 'domain-rules.ts', 'request-type-rules.ts', 'interpreter.ts', 'types.ts']
  .map((file) => readFileSync(join(__dirname, '..', file), 'utf-8'))
  .join('\n')

describe('Request Interpreter — invariantes de integración (SC-004.4)', () => {
  it('nunca accede a Supabase, ni directa ni indirectamente a Repository Layer', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('solo importa de Knowledge Assets el tipo KnowledgeDomain, nunca sus accesores', () => {
    expect(MODULE_SOURCE).toMatch(/import type \{ KnowledgeDomain \} from '@\/lib\/knowledge-assets'/)
    expect(MODULE_SOURCE).not.toMatch(/getWorkKnowledge|getOrganizationKnowledge|listStructuredKnowledge/)
  })

  it('no importa ningún componente del Núcleo (PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer)', () => {
    expect(MODULE_SOURCE).not.toMatch(
      /professional-context-engine|skm|decision-engine|credit-manager|ai-gateway|response-composer|accounting-engine/i
    )
  })

  it('es una función pura y síncrona: sin async/await, sin I/O', () => {
    expect(MODULE_SOURCE).not.toMatch(/\basync\b|\bawait\b/)
  })

  it('no expone ningún dato del dominio Subscription', () => {
    expect(MODULE_SOURCE).not.toMatch(/is_premium|isPremium|subscriptions|stripe/i)
  })
})


/**
 * F5F-1 — el interprete NO nombra el turno.
 *
 * Interpretar y nombrar son cosas distintas: una peticion puede
 * interpretarse dos veces dentro de un mismo turno, y si cada
 * interpretacion se bautizara a si misma, el turno tendria dos nombres.
 * Es exactamente lo que ocurrio en produccion.
 */
describe('Request Interpreter — identidad recibida, no acuñada (F5F-1)', () => {
  it('NUNCA genera identidad: ningun UUID se acuña en este componente', () => {
    expect(INTERPRETER_SOURCE).not.toMatch(/randomUUID|uuid\(|nanoid/i)
  })

  it('el identificador es un parametro OBLIGATORIO, ni opcional ni con valor por defecto', () => {
    // Un valor por defecto reintroduciria el defecto en silencio: bastaria
    // con que un llamador lo omitiera.
    expect(INTERPRETER_SOURCE).toMatch(/export function normalizeRequest\(\s*originalRequest: string,\s*requestId: string,/)
    expect(INTERPRETER_SOURCE).not.toMatch(/requestId\?:/)
    expect(INTERPRETER_SOURCE).not.toMatch(/requestId: string =/)
  })

  it('lo devuelve tal cual: no lo transforma, no lo prefija, no lo deriva', () => {
    expect(INTERPRETER_SOURCE).toMatch(/^\s*requestId,\s*$/m)
  })
})
