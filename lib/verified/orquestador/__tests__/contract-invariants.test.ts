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
    //
    // REFORMULADA en la correccion de P1.2: la decision se toma ANTES de
    // intentar la operacion, para poder decir cual de las dos fallo. El
    // criterio no cambia -- sigue siendo si hubo ejecuciones.
    expect(COORDINATE_FLOW_SOURCE).toMatch(
      /const operacion: OperacionDeCierre = auditsDelTurno\.length > 0 \? 'settle' : 'release'/
    )
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


/**
 * P1.2 — NO EXISTE EL CAMINO «RESERVA CREADA → EXCEPCION → FIN».
 *
 * La proteccion no puede depender de que alguien recuerde liberar la
 * reserva en cada rama nueva. Estas invariantes fijan la propiedad
 * estructuralmente: un solo cierre, alcanzado por los dos caminos, y una
 * excepcion que sigue viva despues de cerrarlo.
 */
describe('Orquestador — cierre garantizado de la reserva (P1.2)', () => {
  it('el cierre existe UNA sola vez y es el unico que toca la reserva', () => {
    const declaraciones = COORDINATE_FLOW_SOURCE.match(/async function cerrarCircuitoEconomico\(/g) ?? []
    expect(declaraciones).toHaveLength(1)

    // settle y release viven exclusivamente dentro de ese cierre.
    expect(COORDINATE_FLOW_SOURCE.match(/await settleReservation\(/g) ?? []).toHaveLength(1)
    expect(COORDINATE_FLOW_SOURCE.match(/await releaseReservation\(/g) ?? []).toHaveLength(1)
  })

  it('TODO EL TRAMO posterior a la reserva esta protegido por un `finally`', () => {
    // Es lo que hace imposible el camino «reserva creada -> excepcion ->
    // fin del flujo»: no hay salida de la funcion que lo evite.
    const finallies = COORDINATE_FLOW_SOURCE.match(/^ {2}\} finally \{$/gm) ?? []
    expect(finallies).toHaveLength(1)

    const bloqueFinal = COORDINATE_FLOW_SOURCE.slice(COORDINATE_FLOW_SOURCE.lastIndexOf('} finally {'))
    expect(bloqueFinal).toMatch(/await cerrarCircuitoEconomico\(\)/)
  })

  it('NINGUN catch oculta la excepcion del turno: todos relanzan', () => {
    // REFORMULADA: ahora el turno SI tiene un catch, pero solo para
    // encadenar el fallo del cierre. Lo que se prohibe no es capturar --
    // es terminar sin relanzar, que convertiria un fallo real en una
    // respuesta aparentemente correcta.
    const cierre = COORDINATE_FLOW_SOURCE.slice(
      COORDINATE_FLOW_SOURCE.indexOf('async function cerrarCircuitoEconomico'),
      COORDINATE_FLOW_SOURCE.indexOf('async function ejecutarOperacion')
    )

    // El cierre captura su propio fallo y NO relanza: sustituiria al error
    // original. Lo registra y lo devuelve en su lugar.
    expect(cierre.match(/\} catch/g) ?? []).toHaveLength(1)
    expect(cierre).not.toMatch(/throw/)

    // El turno captura para encadenar, y siempre relanza.
    const turno = COORDINATE_FLOW_SOURCE.slice(COORDINATE_FLOW_SOURCE.indexOf('catch (errorDelTurno)'))
    expect(turno).toMatch(/throw new AggregateError/)
    expect(turno).toMatch(/throw errorDelTurno/)
  })

  it('EXACTAMENTE UNA VEZ: el resultado se memoriza y no se reintenta', () => {
    // El pestillo booleano pasa a ser el propio RESULTADO: ademas de
    // impedir el segundo intento, dice que ocurrio en el primero.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/let resultadoDelCierre: ResultadoDelCierre \| null = null/)
    expect(COORDINATE_FLOW_SOURCE).toMatch(/if \(resultadoDelCierre !== null\) return resultadoDelCierre/)
  })

  it('el cierre DEVUELVE lo ocurrido: distingue "se intento" de "quedo cerrada"', () => {
    // Sin esto, un fallo de la base de datos era indistinguible de una
    // liquidacion correcta -- el defecto de la primera version del bloque.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/async function cerrarCircuitoEconomico\(\): Promise<ResultadoDelCierre>/)
    for (const estado of ['sin_reserva', 'liquidada', 'liberada', 'fallo_al_cerrar']) {
      expect(COORDINATE_FLOW_SOURCE, estado).toContain(`'${estado}'`)
    }
  })

  it('el fallo del cierre NO queda silencioso: se registra alli mismo', () => {
    // En el camino de excepcion las metricas del turno no llegan a
    // ejecutarse, asi que el registro tiene que vivir dentro del cierre.
    const cierre = COORDINATE_FLOW_SOURCE.slice(
      COORDINATE_FLOW_SOURCE.indexOf('async function cerrarCircuitoEconomico'),
      COORDINATE_FLOW_SOURCE.indexOf('async function ejecutarOperacion')
    )

    expect(cierre).toMatch(/console\.error\('\[P1\.2\]/)
    expect(cierre).toMatch(/estado: 'fallo_al_cerrar'/)
    // Y distingue cual fallo: un settle fallido deja consumo sin registrar.
    expect(cierre).toMatch(/consumoRealSinRegistrar/)
  })

  it('NUNCA se libera como alternativa a un settle fallido', () => {
    // Liberar despues de un settle fallido convertiria una deuda no
    // registrada en una liberacion explicita: borraria la evidencia.
    const cierre = COORDINATE_FLOW_SOURCE.slice(
      COORDINATE_FLOW_SOURCE.indexOf('async function cerrarCircuitoEconomico'),
      COORDINATE_FLOW_SOURCE.indexOf('async function ejecutarOperacion')
    )
    const bloqueDeFallo = cierre.slice(cierre.indexOf('} catch (causa)'))

    expect(bloqueDeFallo).not.toMatch(/releaseReservation|settleReservation/)
  })

  it('LAS DOS CAUSAS se conservan cuando el turno y el cierre fallan a la vez', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/catch \(errorDelTurno\)/)
    expect(COORDINATE_FLOW_SOURCE).toMatch(/new AggregateError\(\s*\[errorDelTurno, cierre\.causa\]/)
    // Y si el cierre fue bien, se propaga la original sin envolverla.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/throw errorDelTurno/)
  })

  it('SIN RESERVA no se cierra nada: el turno determinista no cambia', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/if \(authorizationContext\.reservationId === null\) \{/)
    expect(COORDINATE_FLOW_SOURCE).toMatch(/estado: 'sin_reserva'/)
  })

  it('F5F-4 INTACTO: la politica de liquidacion no cambia, solo el lugar', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/auditsDelTurno\.length > 0/)
    expect(COORDINATE_FLOW_SOURCE).toMatch(/resolveSettlementCost\(auditsDelTurno, reservedCost\)/)
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/resolveSettlementCost\(audit,/)
  })

  it('NO se introduce reintento, ni estado global, ni segunda via de cierre', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/retry|reintent|setTimeout|while \(/i)
    // El pestillo y la anomalia viven DENTRO de la funcion del turno.
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/^(let|var) /m)
  })

  it('NINGUNA magnitud economica vive aqui', () => {
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/amountPerCredit|PricePerMillionTokens|calculateExecutionCost|creditsPerPeriod/)
    expect(COORDINATE_FLOW_SOURCE).not.toMatch(/\b(512|1024)\b/)
  })
})


/**
 * P1-C — EL TURNO FALLIDO NO PUEDE VOLVER A SER INVISIBLE.
 *
 * Lo que se protege aqui no es que exista una llamada, sino DONDE esta: un
 * registro colocado antes del cierre retrasaria el unico acto irreversible
 * del turno, y colocado despues del `throw` no se ejecutaria nunca.
 */
describe('Orquestador — rastro del turno fallido (P1-C)', () => {
  const CIERRE = 'const cierre = await cerrarCircuitoEconomico()'
  const REGISTRO = 'recordTurnFailure('
  const ENCADENADO = 'throw new AggregateError('

  it('el camino de excepcion registra el fallo', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/recordTurnFailure\(/)
    // Y por la via ya autorizada, sin importar Telemetria (comprobado arriba).
    expect(COORDINATE_FLOW_SOURCE).toMatch(/recordTurnFailure[\s\S]*?from '@\/lib\/verified\/observabilidad'/)
  })

  it('ORDEN: despues del cierre economico y antes de propagar el error', () => {
    const cierre = COORDINATE_FLOW_SOURCE.indexOf(CIERRE)
    const registro = COORDINATE_FLOW_SOURCE.indexOf(REGISTRO)
    const propagacion = COORDINATE_FLOW_SOURCE.indexOf(ENCADENADO)

    expect(cierre).toBeGreaterThan(-1)
    expect(registro).toBeGreaterThan(cierre)
    expect(propagacion).toBeGreaterThan(registro)
  })

  it('OBSERVAR NO PUEDE SUSTITUIR AL ERROR: el registro va protegido', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/try \{\s*\n\s*await recordTurnFailure\([\s\S]*?\} catch \{/)
  })

  it('el registro NO cierra, ni reabre, ni repite nada economico', () => {
    const desdeElRegistro = COORDINATE_FLOW_SOURCE.slice(
      COORDINATE_FLOW_SOURCE.indexOf(REGISTRO),
      COORDINATE_FLOW_SOURCE.indexOf(ENCADENADO)
    )

    expect(desdeElRegistro).not.toMatch(/settleReservation|releaseReservation|cerrarCircuitoEconomico/)
  })

  it('NO INVENTA UNA EJECUCION: el recuento sale del acumulador real', () => {
    expect(COORDINATE_FLOW_SOURCE).toMatch(/executionCount: auditsDelTurno\.length/)
    // La identidad es la del turno, no una nueva.
    expect(COORDINATE_FLOW_SOURCE).toMatch(/recordTurnFailure\([\s\S]{0,200}?turnId,/)
  })
})
