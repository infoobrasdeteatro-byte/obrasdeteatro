import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveAccessDestination } from '@/app/scenaia/turn-notice'

const RAIZ = join(__dirname, '..', '..', '..', '..')
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8')
const sinComentarios = (ruta: string) =>
  leer(ruta)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')

const ENDPOINT = sinComentarios('app/api/scenaia-verified/route.ts')
const CLIENTE = sinComentarios('app/scenaia/ScenaiaClient.tsx')
const TURN_NOTICE = sinComentarios('app/scenaia/turn-notice.ts')
const PAGINA = leer('app/scenaia/page.tsx')
const MIDDLEWARE = leer('middleware.ts')

/** Lo que la ruta hace cuando algo estalla: de `} catch` hasta el final. */
const MANEJO_DEL_ERROR = ENDPOINT.slice(ENDPOINT.lastIndexOf('} catch (error) {'))

/**
 * P1-A — UNA EXCEPCION NUNCA PUEDE SALIR SIN FORMA.
 *
 * El defecto no era que faltara un `try`: era que la frontera HTTP no
 * participaba del sistema de señales que el resto del flujo ya tenia. Estas
 * invariantes impiden que vuelva a quedarse fuera, y que al entrar filtre
 * lo que no debe.
 */
describe('Frontera HTTP de ScenaIA — errores con forma (P1-A)', () => {
  it('1 · TODO el manejo de la peticion esta protegido', () => {
    expect(ENDPOINT).toMatch(/export async function POST\([\s\S]*?\{\s*try \{[\s\S]*?\} catch \(error\) \{/)
    // Y el `catch` responde: no relanza, que era exactamente el estado anterior.
    expect(MANEJO_DEL_ERROR).toMatch(/return NextResponse\.json\(/)
    expect(MANEJO_DEL_ERROR).not.toMatch(/\bthrow\b/)
  })

  it('2 · LA LECTURA DEL CUERPO no puede lanzar: `req.json()` vive protegido y en un solo sitio', () => {
    expect(ENDPOINT.match(/req\.json\(\)/g) ?? []).toHaveLength(1)
    expect(ENDPOINT).toMatch(/async function leerCuerpo\([\s\S]*?try \{[\s\S]*?req\.json\(\)[\s\S]*?\} catch \{/)
  })

  it('3 · el 500 usa el texto YA AUTORIZADO, por referencia y no por copia', () => {
    expect(MANEJO_DEL_ERROR).toMatch(/TEXTO_ERROR_GENERICO/)
    expect(ENDPOINT).toMatch(/from '@\/app\/scenaia\/turn-notice'/)
    // Una segunda copia del literal acabaria divergiendo de UX-002.
    expect(ENDPOINT).not.toMatch(/No ha sido posible completar esta solicitud/)
  })

  it('4 · UNA AVERIA NO SE DISFRAZA DE DENEGACION', () => {
    expect(MANEJO_DEL_ERROR).not.toMatch(/denialCode|insufficient_ai_credits|plan_quota_unknown|estimated_cost_unknown/)
    expect(MANEJO_DEL_ERROR).not.toMatch(/reason|no_verificado|no_autenticado|plan_no_reconocido/)
    expect(MANEJO_DEL_ERROR).not.toMatch(/responseType|RESPONSE_/)
  })

  it('5 · NADA TECNICO CRUZA LA FRONTERA: lo que se registra no es lo que se responde', () => {
    const respuesta = MANEJO_DEL_ERROR.slice(MANEJO_DEL_ERROR.indexOf('return NextResponse.json('))

    // `error` es la CLAVE publica del contrato de esta ruta. Lo que no
    // puede aparecer es la excepcion capturada como VALOR, ni nada
    // derivado de ella.
    expect(respuesta).not.toMatch(/stack|cause|error\.|String\(error\)|: *error\b|\.\.\.error/)
  })

  it('6 · LA FRONTERA NO TOCA LA ECONOMIA: no liquida, no libera, no reserva', () => {
    expect(ENDPOINT).not.toMatch(/settleReservation|releaseReservation|reservationId|estimatedCost|resolveSettlementCost/)
    expect(ENDPOINT).not.toMatch(/@\/lib\/(accounting-engine|credit-manager|decision-engine|telemetria)/)
  })

  it('7 · NI SUPABASE NI MIDDLEWARE cambian por esto', () => {
    // La ruta sigue resolviendo la sesion como siempre y nada mas.
    expect(ENDPOINT).not.toMatch(/from '@\/lib\/repository-layer'|rpc\(|\.from\(/)
    expect(MIDDLEWARE).not.toMatch(/scenaia-verified/)
  })

  it('8 · LA DENEGACION DE ACCESO conserva su respuesta: causa como dato y codigo por politica', () => {
    expect(ENDPOINT).toMatch(/reason: acceso\.reason/)
    expect(ENDPOINT).toMatch(/status: accessDenialStatus\(acceso\.reason\)/)
  })
})


/**
 * P1-B — EL CLIENTE DEJA DE TIRAR LA CAUSA.
 *
 * El servidor ya enviaba `reason` y el cliente leia solo `error`: una
 * denegacion de acceso se veia igual que una averia. Lo que estas
 * invariantes protegen no es que la lea, sino que al leerla NO se convierta
 * en una segunda politica de acceso.
 */
describe('Cliente de ScenaIA — la causa del 403 no se pierde (P1-B)', () => {
  it('1 · el cliente USA el `reason` que el servidor ya envia', () => {
    expect(CLIENTE).toMatch(/resolveAccessDestination\(body\.reason\)/)
  })

  it('2 · y NO reimplementa la politica: no comprueba nada por su cuenta', () => {
    expect(CLIENTE).not.toMatch(/isVerified|\.verificado|verificado:/)
    expect(CLIENTE).not.toMatch(/getProfilePlan|getUsageLimit|getSubscription|subscriptions/)
    expect(CLIENTE).not.toMatch(/'gratuito'|'premium'|'destacado'|'empresas'/)
    // Sigue sin conocer el helper de acceso: no es una frontera.
    expect(CLIENTE).not.toMatch(/scenaia-access|resolveScenaiaAccess/)
  })

  it('3 · `no_verificado` conduce a UX-003, y al MISMO destino que decide el servidor', () => {
    expect(resolveAccessDestination('no_verificado')).toBe('/verificacion')
    expect(PAGINA).toMatch(/if \(acceso\.reason === 'no_verificado'\) redirect\('\/verificacion'\)/)
  })

  it('4 · UNA SOLA NAVEGACION, y no una tabla que invite a rellenarse', () => {
    // Antes de P1-ERRORES el cliente no navegaba por NINGUN motivo: mostraba
    // el aviso. P1-B solo podia anadir el caso que UX-003 autorizo, y esta
    // invariante impide que se cuele un destino mas por interpretacion.
    const motivosDelContrato = ['no_autenticado', 'no_verificado', 'plan_no_reconocido']
    const queNavegan = motivosDelContrato.filter((motivo) => resolveAccessDestination(motivo) !== null)

    expect(queNavegan).toEqual(['no_verificado'])
    // Y el unico destino que el cliente conoce es el que el servidor asigna
    // a esa misma causa: si alguien cambia uno de los dos, esto lo detecta.
    expect(PAGINA).toContain(`redirect('${resolveAccessDestination('no_verificado')}')`)
    // Ninguna otra ruta aparece como destino de navegacion en el cliente.
    expect(TURN_NOTICE).not.toMatch(/'\/auth\/login'|'\/dashboard'|'\/scenaia'/)
  })

  it('5 · UN MOTIVO DESCONOCIDO no mueve a nadie', () => {
    // Navegar a ciegas por una causa que el contrato no declara seria peor
    // que quedarse quieto con el aviso de siempre.
    expect(resolveAccessDestination('motivo_que_no_existe')).toBeNull()
    expect(resolveAccessDestination(undefined)).toBeNull()
    expect(resolveAccessDestination(null)).toBeNull()
    expect(resolveAccessDestination(42)).toBeNull()
  })

  it('6 · el aviso de siempre sigue ahi para lo que no es acceso', () => {
    // Un 500 no trae `reason`: no navega y se muestra su texto.
    expect(CLIENTE).toMatch(/setError\(body\.error \?\? `Error \$\{res\.status\}`\)/)
  })

  it('7 · la tabla de destinos NO decide el acceso: solo traduce un veredicto ya emitido', () => {
    expect(TURN_NOTICE).not.toMatch(/isVerified|getProfilePlan|getUsageLimit|resolveScenaiaAccess/)
    expect(TURN_NOTICE).not.toMatch(/fetch\(|await /)
  })
})


/**
 * H1/H2 — LAS COTAS DE ENTRADA NO PUEDEN EVAPORARSE.
 *
 * Lo que estas invariantes protegen no es que existan tres numeros, sino
 * las cuatro propiedades por las que existen: que se apliquen ANTES del
 * circuito economico, que rechacen en vez de recortar, que vivan en un solo
 * sitio, y que no se conviertan en una politica economica encubierta.
 */
describe('Cotas de entrada de ScenaIA — H1/H2', () => {
  const LIMITES = sinComentarios('app/api/scenaia-verified/input-limits.ts')
  const INTERPRETE = leer('lib/request-interpreter/interpreter.ts')
  /** Todo lo que la ruta hace antes de entrar al flujo. */
  const ANTES_DEL_FLUJO = ENDPOINT.slice(0, ENDPOINT.indexOf('coordinateFlow('))

  it('1 · NINGUN MENSAJE excesivo llega al flujo: la cota se aplica antes', () => {
    expect(ANTES_DEL_FLUJO).toMatch(/originalRequest\.length > MAX_USER_PROMPT_CHARACTERS/)
    expect(ANTES_DEL_FLUJO).toMatch(/status: 400/)
  })

  it('2/3 · NINGUN HISTORIAL excesivo llega al flujo: ambas cotas se aplican antes', () => {
    expect(ANTES_DEL_FLUJO).toMatch(/historialInadmisible\(conversationHistory\)/)
    expect(ANTES_DEL_FLUJO).toMatch(/if \(historialRechazado !== null\)/)
    expect(ENDPOINT).toMatch(/conversationHistory\.length > MAX_HISTORY_TURNS/)
    expect(ENDPOINT).toMatch(/caracteres > MAX_HISTORY_CHARACTERS/)
  })

  it('4/5 · UN RECHAZO POR TAMANO no reserva ni ejecuta: sale por `return`, no por un camino paralelo', () => {
    // `coordinateFlow` es la unica puerta de este endpoint hacia la
    // estimacion, la reserva y el proveedor -- comprobado arriba: la ruta no
    // importa accounting, credit-manager, decision-engine ni ai-gateway.
    // Cada cota devuelve una respuesta antes de esa puerta.
    const rechazos = ANTES_DEL_FLUJO.match(/return NextResponse\.json\([^)]*\{ status: 400 \}\)/g) ?? []

    expect(rechazos.length).toBeGreaterThanOrEqual(3)
    expect(ENDPOINT).not.toMatch(/@\/lib\/(accounting-engine|credit-manager|decision-engine|ai-gateway)/)
  })

  it('6 · NO EXISTE TRUNCAMIENTO SILENCIOSO en ninguna de las dos capas', () => {
    // Ni recortar caracteres, ni quedarse con los ultimos turnos, ni
    // reescribir lo recibido para que quepa.
    for (const [nombre, fuente] of [['ruta', ENDPOINT], ['limites', LIMITES]] as const) {
      expect(fuente, nombre).not.toMatch(/\.slice\(|\.splice\(|\.substring\(|\.substr\(|\.trim\(\)\.slice/)
    }
    // El mensaje llega al flujo tal cual se recibio, sin transformar.
    expect(ENDPOINT).toMatch(/coordinateFlow\(\s*acceso\.userId,\s*session,\s*originalRequest,\s*conversationHistory/)
  })

  it('7 · FUENTE UNICA: la ruta no declara ninguna cota, la importa', () => {
    expect(ENDPOINT).toMatch(/from '\.\/input-limits'/)
    expect(ENDPOINT).not.toMatch(/const MAX_/)
    // Y ni una cifra suelta que pueda divergir de la fuente.
    expect(ENDPOINT).not.toMatch(/3_?000|16_?000/)
  })

  it('las tres cotas valen lo que Direccion fijo', () => {
    expect(LIMITES).toMatch(/MAX_USER_PROMPT_CHARACTERS = 3_000/)
    expect(LIMITES).toMatch(/MAX_HISTORY_TURNS = 20/)
    expect(LIMITES).toMatch(/MAX_HISTORY_CHARACTERS = 16_000/)
  })

  it('UN LIMITE DE ENTRADA NO ES UN PROBLEMA ECONOMICO', () => {
    // Ni reutiliza vocabulario de denegacion, ni consulta cuotas, ni toca
    // tarifas: si algun dia una de estas cotas emitiera un `denialCode`, el
    // usuario veria "has agotado tu cuota" por haber escrito de mas.
    expect(LIMITES).not.toMatch(/denialCode|insufficient_ai_credits|plan_quota_unknown|estimated_cost_unknown/)
    expect(LIMITES).not.toMatch(/PLAN_AI_QUOTAS|amountPerCredit|creditsPerPeriod|estimateCost|MAX_OUTPUT_TOKENS/)
    expect(LIMITES).not.toMatch(/import .* from/)
  })

  it('CONTEXT_WINDOW_TURNS es de recuperacion, sigue valiendo 3 y NO se reutiliza como cota', () => {
    expect(INTERPRETE).toMatch(/const CONTEXT_WINDOW_TURNS = 3\b/)
    expect(ENDPOINT).not.toMatch(/CONTEXT_WINDOW_TURNS/)
    expect(LIMITES).not.toMatch(/CONTEXT_WINDOW_TURNS/)
  })

  it('LA ECONOMIA CONGELADA sigue intacta', () => {
    const economia: Array<[string, RegExp]> = [
      ['lib/accounting-engine/economic-unit.ts', /amountPerCredit: 0\.0003/],
      ['lib/provider-catalog/catalog.ts', /inputPricePerMillionTokens: 0\.15/],
      ['lib/provider-catalog/catalog.ts', /outputPricePerMillionTokens: 0\.6/],
      ['lib/ai-gateway/types.ts', /TEXT_STANDARD: 512/],
      ['lib/ai-gateway/types.ts', /RESOLVER: 1024/],
      ['lib/decision-engine/operation.ts', /CARACTERES_POR_TOKEN = 3\b/],
      ['lib/repository-layer/subscription.ts', /creditsPerPeriod: 5\b/],
      ['lib/repository-layer/subscription.ts', /creditsPerPeriod: 100\b/],
      ['lib/repository-layer/subscription.ts', /creditsPerPeriod: 500\b/],
    ]

    for (const [ruta, patron] of economia) {
      expect(leer(ruta), ruta).toMatch(patron)
    }
  })
})
