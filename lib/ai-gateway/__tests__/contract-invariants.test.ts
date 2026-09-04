import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { MAX_OUTPUT_TOKENS_BY_OPERATION } from '../types'

const SEPARADOR_DE_RUTA = join('a', 'b').slice(1, -1)
const MODULE_SOURCE = readFileSync(join(__dirname, '..', 'execute-ai-request.ts'), 'utf-8')
const TYPES_SOURCE = readFileSync(join(__dirname, '..', 'types.ts'), 'utf-8')

/** Todo adaptador de proveedor registrado en el modulo. */
const ADAPTER_FILES = readdirSync(join(__dirname, '..')).filter((file) => file.endsWith('-adapter.ts') && file !== 'provider-adapter.ts')

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

/**
 * BLOQUE 1 — el techo de generacion es del Gateway, nunca del adaptador.
 *
 * La longitud de la respuesta es la unica magnitud del turno que el
 * proveedor decidia por su cuenta, y la salida se tarifa varias veces mas
 * cara que la entrada. Estas invariantes existen para que ese techo no
 * pueda volver a diluirse dentro de la integracion de un proveedor
 * concreto -- que es donde dejaria de aplicarse en cuanto se registrase
 * un segundo.
 */
describe('AI Gateway — techo de generacion (Bloque 1)', () => {
  it('el techo se declara en el contrato del Gateway, no dentro de ningun adaptador', () => {
    // REFORMULADA en el Bloque 5D: el techo deja de ser un numero unico y
    // pasa a ser una politica por operacion. La INTENCION es la misma y no
    // se ha relajado -- sigue viviendo aqui, sigue siendo unica y sigue sin
    // poder esconderse en la integracion de un proveedor.
    expect(TYPES_SOURCE).toMatch(/export const MAX_OUTPUT_TOKENS_BY_OPERATION/)
    expect(TYPES_SOURCE).toMatch(/Readonly<Record<OperationKind, number>>/)
  })

  it('toda ejecucion lo entrega: el Gateway nunca invoca a un adaptador sin techo', () => {
    // REFORMULADA en el Bloque 5D: el techo se resuelve contra la politica
    // en lugar de leerse de una constante suelta. Lo que se protege es lo
    // mismo: ninguna invocacion sale de aqui sin techo.
    expect(MODULE_SOURCE).toMatch(/maxOutputTokens:\s*maxOutputTokensFor\(/)
    // Y el numero jamas se escribe en el punto de llamada.
    expect(MODULE_SOURCE).not.toMatch(/maxOutputTokens:\s*\d/)
  })

  it('NINGUN adaptador elige su propio techo ni trae un valor por defecto', () => {
    for (const file of ADAPTER_FILES) {
      const source = readFileSync(join(__dirname, '..', file), 'utf-8')

      // Un numero literal junto al parametro del proveedor seria una
      // politica de coste escondida en la integracion.
      expect(source, file).not.toMatch(/max_completion_tokens:\s*\d/)
      expect(source, file).not.toMatch(/max_tokens:\s*\d/)
      // Un valor por defecto haria opcional lo que el contrato exige.
      expect(source, file).not.toMatch(/maxOutputTokens\s*=\s*\d/)
    }
  })

  it('NINGUN adaptador puede generar mas de lo autorizado: todos aplican el techo recibido', () => {
    expect(ADAPTER_FILES.length).toBeGreaterThan(0)

    for (const file of ADAPTER_FILES) {
      const source = readFileSync(join(__dirname, '..', file), 'utf-8')

      expect(source, file).toMatch(/request\.maxOutputTokens/)
    }
  })

  it('el contrato del adaptador exige el techo: no admite una peticion sin el', () => {
    // ACOTADA en F5F-2 al bloque de la PETICION. El mismo fichero declara
    // ahora un techo en el RESULTADO, que si es anulable -- un adaptador
    // puede no poder declarar el que aplico. Son dos cosas distintas: el
    // techo que se EXIGE al invocar, y el que se OBSERVA al terminar.
    // Mirar el fichero entero confundia ambos.
    const contrato = readFileSync(join(__dirname, '..', 'provider-adapter.ts'), 'utf-8')
    const peticion = contrato.slice(contrato.indexOf('export interface ProviderExecutionRequest'))

    expect(peticion).toMatch(/readonly maxOutputTokens: number/)
    // Ni opcional, ni anulable: un techo que se pueda omitir no es un techo.
    expect(peticion).not.toMatch(/maxOutputTokens\?:/)
    expect(peticion).not.toMatch(/maxOutputTokens: number \| null/)
  })
})


/**
 * BLOQUE 5C — truncamiento observable, y SOLO eso.
 *
 * Este bloque instrumenta; no cambia ninguna politica. Las dos primeras
 * invariantes existen precisamente para acreditarlo: si alguien aprovechara
 * la instrumentacion para tocar un techo, fallarian.
 */
describe('AI Gateway — truncamiento (Bloque 5C)', () => {
  it('LA POLITICA VIGENTE: TEXT_STANDARD=512, RESOLVER=1024 (Bloque 5D)', () => {
    // SUSTITUYE a la invariante de 5C que exigia un techo unico de 1024:
    // aquel bloque instrumentaba sin cambiar politica, este la cambia por
    // autorizacion expresa. Las cifras se ratifican una sola vez, aqui.
    expect(MAX_OUTPUT_TOKENS_BY_OPERATION.TEXT_STANDARD).toBe(512)
    expect(MAX_OUTPUT_TOKENS_BY_OPERATION.RESOLVER).toBe(1024)
    // El techo universal desaparece: mantenerlo junto a la tabla duplicaria
    // la cifra y crearia una segunda fuente.
    expect(TYPES_SOURCE).not.toMatch(/export const MAX_OUTPUT_TOKENS\b\s*=/)
  })

  it('el contrato del adaptador EXIGE informar del truncamiento: no admite omitirlo', () => {
    const contrato = readFileSync(join(__dirname, '..', 'provider-adapter.ts'), 'utf-8')

    expect(contrato).toMatch(/readonly truncated: boolean/)
    // Ni opcional, ni anulable: de una ejecucion real siempre se sabe como
    // termino, y "no consta" seria una forma de no mirar.
    expect(contrato).not.toMatch(/truncated\?:/)
    expect(contrato).not.toMatch(/truncated: boolean \| null/)
  })

  it('NINGUN adaptador inventa el truncamiento: lo deriva de lo que informa el proveedor', () => {
    for (const file of ADAPTER_FILES) {
      const source = readFileSync(join(__dirname, '..', file), 'utf-8')

      // Un literal fijo convertiria la señal en una afirmacion del
      // adaptador, no en un hecho del proveedor.
      expect(source, file).not.toMatch(/truncated:\s*(true|false)/)
      expect(source, file).toMatch(/truncated:/)
    }
  })

  it('SOLO `length` cuenta como truncamiento: ninguna otra causa se mezcla', () => {
    const adaptador = readFileSync(join(__dirname, '..', 'openai-adapter.ts'), 'utf-8')

    expect(adaptador).toMatch(/finish_reason === 'length'/)
    // Filtro de contenido, llamadas a herramientas o parada normal
    // describen otra cosa; contarlas aqui haria que la metrica midiera una
    // mezcla de causas y dejara de servir para decidir un techo.
    expect(adaptador).not.toMatch(/finish_reason === '(stop|content_filter|tool_calls|function_call)'/)
  })

  it('el aviso es una señal declarada en el contrato del Gateway, no una frase suelta', () => {
    expect(TYPES_SOURCE).toMatch(/export const TRUNCATION_WARNING/)
    // Quien la emite la referencia; no la reescribe.
    const emisor = readFileSync(join(__dirname, '..', 'execute-ai-request.ts'), 'utf-8')
    expect(emisor).toMatch(/TRUNCATION_WARNING/)
    expect(emisor).not.toMatch(/executionWarnings.*finish_reason=length/)
  })
})


/**
 * BLOQUE 5D — techo POR OPERACION.
 *
 * Lo que estas invariantes custodian no son las dos cifras actuales, sino
 * la propiedad que las hace seguras: que exista un unico sitio donde se
 * declaran, que toda operacion tenga la suya, y que nadie fuera de este
 * modulo pueda elegir un numero.
 */
describe('AI Gateway — politica de techo por operacion (Bloque 5D)', () => {
  const ORQUESTADOR = readFileSync(join(LIB_ROOT, 'verified', 'orquestador', 'coordinate-flow.ts'), 'utf-8')

  it('TODA operacion tiene techo declarado: ninguna hereda en silencio el de otra', () => {
    // `Record<OperationKind, number>` ya lo exige en compilacion; esta
    // prueba lo comprueba tambien en ejecucion, y sobre todo documenta POR
    // QUE: cuando entren WEB o MODEL_PREMIUM, no compilaran hasta que
    // alguien decida su techo. Una operacion 40 veces mas cara heredando el
    // techo del texto es exactamente el fallo que esto impide.
    for (const [operacion, techo] of Object.entries(MAX_OUTPUT_TOKENS_BY_OPERATION)) {
      expect(typeof techo, operacion).toBe('number')
      expect(techo, operacion).toBeGreaterThan(0)
    }
    expect(Object.keys(MAX_OUTPUT_TOKENS_BY_OPERATION).length).toBeGreaterThan(1)
  })

  it('FUENTE UNICA: ningun otro modulo declara una tabla de techos', () => {
    const declarantes = listTsFiles(LIB_ROOT, '').filter((fichero) =>
      /MAX_OUTPUT_TOKENS_BY_OPERATION\s*:\s*Readonly<Record</.test(readFileSync(join(LIB_ROOT, fichero), 'utf-8'))
    )

    expect(declarantes).toHaveLength(1)
    expect(declarantes[0].split(SEPARADOR_DE_RUTA).join('/')).toBe('ai-gateway/types.ts')
  })

  it('EL ORQUESTADOR NO ELIGE NUMEROS: identifica la operacion, nada mas', () => {
    // Reenvia la politica y nombra la operacion. En cuanto apareciera aqui
    // una cifra de techo, dejaria de haber una fuente unica.
    expect(ORQUESTADOR).toMatch(/operationKind: 'TEXT_STANDARD'/)
    expect(ORQUESTADOR).toMatch(/operationKind: 'RESOLVER'/)
    expect(ORQUESTADOR).not.toMatch(/maxOutputTokens\s*[:=]\s*\d/)
    expect(ORQUESTADOR).not.toMatch(/\b(512|1024)\b/)
  })

  it('el techo se resuelve por operacion, nunca se recibe ya resuelto del llamador', () => {
    // Si el numero viajara en `NormalizedAIRequest`, la politica habria
    // salido del Gateway aunque la tabla siguiera declarada aqui.
    expect(TYPES_SOURCE).toMatch(/readonly operationKind: OperationKind/)
    expect(TYPES_SOURCE).not.toMatch(/NormalizedAIRequest[\s\S]{0,200}maxOutputTokens/)
  })

  it('BLOQUE 1 INTACTO: el contrato del adaptador no cambia y ningun adaptador elige', () => {
    const contrato = readFileSync(join(__dirname, '..', 'provider-adapter.ts'), 'utf-8')

    expect(contrato).toMatch(/readonly prompt: string/)
    expect(contrato).toMatch(/readonly maxOutputTokens: number/)
    for (const file of ADAPTER_FILES) {
      const source = readFileSync(join(__dirname, '..', file), 'utf-8')
      expect(source, file).toMatch(/request\.maxOutputTokens/)
      expect(source, file).not.toMatch(/MAX_OUTPUT_TOKENS_BY_OPERATION|maxOutputTokensFor/)
    }
  })
})


/**
 * F5F-2 — el techo aplicado es un hecho observado, no una deduccion.
 *
 * La direccion del dato es lo unico que hace util a esta metrica:
 * ProviderExecutionOutcome → ExecutionAudit → telemetria. Si el Gateway
 * releyera su politica para rellenar el audit, una divergencia entre lo
 * que la politica dice y lo que la ejecucion hizo seria indetectable.
 */
describe('AI Gateway — observabilidad del techo (F5F-2)', () => {
  it('el audit lo toma del OUTCOME, nunca de la politica', () => {
    expect(MODULE_SOURCE).toMatch(/maxOutputTokens: outcome\.maxOutputTokens/)
    // La politica se consulta UNA sola vez, y es para invocar al adaptador.
    const consultas = MODULE_SOURCE.match(/maxOutputTokensFor\(/g) ?? []
    expect(consultas).toHaveLength(1)
  })

  it('el contrato del resultado declara el techo aplicado, anulable', () => {
    const contrato = readFileSync(join(__dirname, '..', 'provider-adapter.ts'), 'utf-8')
    const resultado = contrato.slice(
      contrato.indexOf('export interface ProviderExecutionOutcome'),
      contrato.indexOf('export interface ProviderExecutionRequest')
    )

    // Anulable a proposito: un adaptador puede no poder declararlo. Lo que
    // nunca puede es sustituirlo por cero.
    expect(resultado).toMatch(/readonly maxOutputTokens: number \| null/)
  })

  it('TODO adaptador declara el techo que aplico, y no lo inventa', () => {
    for (const file of ADAPTER_FILES) {
      const source = readFileSync(join(__dirname, '..', file), 'utf-8')

      expect(source, file).toMatch(/maxOutputTokens: request\.maxOutputTokens/)
      // Un literal seria una afirmacion del adaptador, no un hecho.
      expect(source, file).not.toMatch(/maxOutputTokens:\s*\d/)
    }
  })
})
