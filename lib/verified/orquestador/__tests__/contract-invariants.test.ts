import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODULE_FILES = ['types.ts', 'coordinate-flow.ts', 'index.ts']
const MODULE_SOURCE = MODULE_FILES.map((file) => readFileSync(join(__dirname, '..', file), 'utf-8')).join('\n')

const COORDINATE_FLOW_SOURCE = readFileSync(join(__dirname, '..', 'coordinate-flow.ts'), 'utf-8')

const AUTHORIZED_IMPORTS = [
  "from '@/lib/request-interpreter'",
  "from '@/lib/professional-context-engine'",
  "from '@/lib/scenaia-knowledge-model'",
  "from '@/lib/decision-engine'",
  "from '@/lib/credit-manager'",
  "from '@/lib/ai-gateway'",
  "from '@/lib/response-composer'",
  "from '@/lib/procesos-asincronos'",
  "from '@/lib/execution-audit-router'",
  "from '@/lib/direct-content-builder'",
  "from '@/lib/prompt-composer'",
  "from '@/lib/intent-resolver'",
  // Fase 0 (Plan Maestro): punto de integracion de observabilidad
  // autorizado expresamente por Direccion. El Orquestador es el unico
  // componente con visibilidad completa del turno; sigue SIN importar
  // Telemetria directamente (invariante comprobada mas abajo).
  "from '@/lib/verified/observabilidad'",
  // Cierre del circuito economico: liquidar o liberar la reserva exige
  // conocer AuthorizationContext y ExecutionAudit a la vez, y el
  // Orquestador es el unico punto que dispone de ambos. Sigue SIN acceder
  // a Supabase ni a Repository Layer (invariante comprobada mas arriba).
  "from '@/lib/accounting-engine'",
  // Contexto conversacional (Fase 3, autorizado expresamente por Direccion).
  // El Orquestador es el unico componente que puede componer el estado:
  // ninguno del Nucleo debe conocerlo entero, y el estado se descompone
  // aqui en las dos piezas que el interprete y el conocimiento si tienen
  // derecho a recibir. Sigue SIN acceder a Supabase ni a Repository Layer.
  "from '@/lib/conversation-state'",
]

describe('Orquestador (lib/verified) — invariantes de integración (Plan Técnico aprobado, Acta de Autorización 2026-07-19)', () => {
  it('nunca accede a Supabase ni a Repository Layer directamente', () => {
    expect(MODULE_SOURCE).not.toMatch(/supabase|createClient/i)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/repository-layer'/)
  })

  it('depende exclusivamente de los 14 contratos autorizados (10 del Plan Técnico + Prompt Composer, SCENAIA-002A + Intent Resolver + Observabilidad + Accounting Engine), ningún otro', () => {
    const importLines = MODULE_SOURCE.match(/from '@\/lib\/[^']+'/g) ?? []
    for (const importLine of importLines) {
      expect(AUTHORIZED_IMPORTS.some((authorized) => importLine === authorized)).toBe(true)
    }
  })

  it('no depende de Mi Trayectoria®, Telemetría, Analítica, Sistemas de Caché ni de ningún artefacto del Conjunto B (lib/spo)', () => {
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/mi-trayectoria'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/telemetria'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/analitica'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/sistemas-cache'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/spo'/)
    expect(MODULE_SOURCE).not.toMatch(/from '@\/lib\/observabilidad'/)
  })

  it('no invoca recordMetric() directamente (ya delega en recordExecutionTrace, Vacío 2 del Plan Técnico)', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/recordMetric/)
  })

  it('sin estado propio a nivel de módulo (PAO-04): sin variables mutables fuera de la función', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/^(let|var)\s/m)
  })
})


/**
 * F5F-1 — UN TURNO = UN UNICO IDENTIFICADOR.
 *
 * El Orquestador es el unico componente que ve el turno completo, y por
 * eso es el unico que puede nombrarlo. Estas invariantes impiden que la
 * identidad vuelva a fragmentarse.
 */
describe('Orquestador — identidad del turno (F5F-1)', () => {
  it('acuña la identidad del turno EXACTAMENTE una vez', () => {
    const acuñaciones = COORDINATE_FLOW_SOURCE.match(/const turnId = crypto\.randomUUID\(\)/g) ?? []

    expect(acuñaciones).toHaveLength(1)
  })

  it('TODA interpretacion del turno recibe esa identidad, sin excepcion', () => {
    const interpretaciones = COORDINATE_FLOW_SOURCE.match(/normalizeRequest\(/g) ?? []
    const conIdentidad = COORDINATE_FLOW_SOURCE.match(/normalizeRequest\([\s\S]{0,120}?turnId/g) ?? []

    // Hoy son dos; lo que se protege no es el numero, sino que ninguna
    // quede fuera si manana se añade una tercera.
    expect(interpretaciones.length).toBeGreaterThan(1)
    expect(conIdentidad).toHaveLength(interpretaciones.length)
  })

  it('la identidad del turno NO se sustituye por la de la reserva ni por la de la conversacion', () => {
    // Un turno determinista no crea reserva y tambien necesita identidad;
    // `conversationId` nombra la conversacion, no el turno.
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/turnId\s*=\s*[^\n]*reservationId/)
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/turnId\s*=\s*[^\n]*conversationId/)
  })
})


/**
 * F5F-3 — INTEGRIDAD DEL ACUMULADOR DE EJECUCIONES.
 *
 * P4 advertia que un acumulador alimentado a mano vuelve a perder audits
 * en silencio: basta con que alguien anada una ejecucion y olvide la linea
 * siguiente. Estas invariantes sustituyen esa disciplina por una propiedad
 * estructural -- solo existe UNA puerta hacia el proveedor, y esa puerta
 * acumula siempre.
 */
describe('Orquestador — acumulador de ejecuciones (F5F-3)', () => {
  it('A/C · PUERTA UNICA: el Gateway se invoca en un solo punto de todo el turno', () => {
    // Mientras esto se cumpla, "ejecutar" y "quedar registrado" son el
    // mismo acto. Si aparece una segunda invocacion directa, esta
    // invariante falla ANTES de que la ejecucion pueda perderse.
    const invocaciones = COORDINATE_FLOW_SOURCE.match(/await executeAIRequest\(/g) ?? []

    expect(invocaciones).toHaveLength(1)
  })

  it('A · esa puerta acumula SIEMPRE: no hay camino que la evite', () => {
    const puerta = COORDINATE_FLOW_SOURCE.slice(
      COORDINATE_FLOW_SOURCE.indexOf('async function ejecutarOperacion'),
      COORDINATE_FLOW_SOURCE.indexOf('return salida')
    )

    expect(puerta).toMatch(/await executeAIRequest\(input\)/)
    expect(puerta).toMatch(/acumularEjecucion\(auditsDelTurno, salida\)/)
    // Sin condicion propia: quien decide que entra es la regla, no la puerta.
    expect(puerta).not.toMatch(/\bif\s*\(/)
  })

  it('B · la regla exige estado EJECUTADO: ningun audit vacio entra', () => {
    const regla = COORDINATE_FLOW_SOURCE.slice(
      COORDINATE_FLOW_SOURCE.indexOf('export function acumularEjecucion'),
      COORDINATE_FLOW_SOURCE.indexOf('export async function coordinateFlow')
    )

    expect(regla).toMatch(/executionStatus !== 'EJECUTADO'/)
    expect(regla).toMatch(/auditsDelTurno\.push\(salida\.audit\)/)
  })

  it('D · conserva el orden de ejecucion: anade al final, nunca reordena', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/auditsDelTurno\.push\(/)
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/auditsDelTurno\.(sort|unshift|splice|reverse)\(/)
  })

  it('E/F · una coleccion POR TURNO: sin estado global ni compartido', () => {
    // Se declara dentro de la funcion del turno, no en el modulo: dos
    // usuarios simultaneos no pueden verse las ejecuciones.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/^ {2}const auditsDelTurno: ExecutionAudit\[\] = \[\]$/m)
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/^(const|let|var) auditsDelTurno/m)
    // Un turno determinista no ejecuta proveedor, luego no acumula nada:
    // lo garantiza la misma regla, sin rama especial.
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/auditsDelTurno\s*=\s*\[/)
  })

  /**
   * G · SUSTITUIDA en F5F-4.
   *
   * En F5F-3 esta invariante exigia lo contrario -- que el acumulador NO
   * estuviera conectado -- porque custodiaba un estado deliberadamente
   * transitorio. F5F-4 lo conecta por autorizacion expresa, de modo que lo
   * que hay que proteger ahora es la propiedad definitiva: la liquidacion
   * se calcula sobre TODAS las ejecuciones del turno, y ocurre UNA sola vez.
   */
  it('G · la liquidacion se calcula sobre las ejecuciones del turno (F5F-4)', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/resolveSettlementCost\(auditsDelTurno, reservedCost\)/)
    // Nunca sobre una sola ejecucion: seria el defecto de 5E reintroducido.
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/resolveSettlementCost\(audit,/)
  })

  it('G · UNA RESERVA -> UN SETTLEMENT: no se liquida por operacion', () => {
    const liquidaciones = COORDINATE_FLOW_SOURCE.match(/await settleReservation\(/g) ?? []
    const liberaciones = COORDINATE_FLOW_SOURCE.match(/await releaseReservation\(/g) ?? []

    expect(liquidaciones).toHaveLength(1)
    expect(liberaciones).toHaveLength(1)
    // Y la coleccion no se recorre: es la FUENTE de un importe agregado,
    // nunca una lista de liquidaciones.
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/of auditsDelTurno|auditsDelTurno\.(map|forEach|reduce)\(/)
  })

  it('G · liquidar o liberar lo decide si HUBO ejecuciones, no como termino la ultima', () => {
    // Un turno cuyo resolutor ejecuto y cuya respuesta fallo tiene coste
    // real: antes se liberaba entero y ese coste se perdia.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/if \(auditsDelTurno\.length > 0\)/)
  })

  it('G · el Orquestador NO tarifa: ninguna formula de coste vive aqui', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/PricePerMillionTokens|amountPerCredit|calculateExecutionCost/)
  })

  it('F5F-2 INTACTO: el audit se acumula entero, sin proyeccion reducida', () => {
    // Guardar `ExecutionAuditForSettlement` descartaria `maxOutputTokens`,
    // `truncated` y la latencia -- justo lo que F5F-2 acaba de anadir.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/const auditsDelTurno: ExecutionAudit\[\]/)
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/auditsDelTurno: ExecutionAuditForSettlement/)
  })
})
