import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coordinateFlow } from '@/lib/verified/orquestador'
import type { ConversationTurn } from '@/lib/verified/orquestador'
import { parseConversationState } from '@/lib/conversation-state'
import { resolveScenaiaAccess, accessDenialStatus } from '@/lib/auth/scenaia-access'
import { TEXTO_ERROR_GENERICO } from '@/app/scenaia/turn-notice'
import {
  MAX_USER_PROMPT_CHARACTERS,
  MAX_HISTORY_TURNS,
  MAX_HISTORY_CHARACTERS,
  MENSAJE_DEMASIADO_LARGO,
  HISTORIAL_DEMASIADOS_TURNOS,
  HISTORIAL_DEMASIADO_LARGO,
} from './input-limits'

/**
 * Unico punto de entrada HTTP hacia el Orquestador del Flujo Completo
 * (Plan Tecnico aprobado, Acta de Cierre 2026-07-19). Adaptador de entrada
 * exclusivamente: resuelve la sesion ya autenticada (misma frontera que
 * PCE ya tenia -- coordinateFlow() recibe userId/session ya resueltos,
 * nunca deriva identidad por si mismo) y construye SessionInput a partir
 * de la peticion HTTP -- ninguna logica de negocio propia.
 *
 * Ruta separada de `app/api/scenaia/` (Conjunto B, incidente de
 * trazabilidad todavia abierto, sin modificar) -- mismo criterio de
 * ubicacion ya aplicado a `lib/verified/`.
 */

/**
 * UX-001A (Sprint aprobado): valida `body.history` de forma defensiva --
 * nunca se confia en la forma del cuerpo recibido. Cualquier entrada que
 * no sea exactamente `{ role: 'user' | 'assistant', content: string }` se
 * descarta en silencio (degradacion segura, mismo criterio ya aplicado en
 * el resto de este adaptador), nunca lanza excepcion. Sin persistencia:
 * el historial vive solo en el cuerpo de esta peticion.
 *
 * H1 NO CAMBIA ESE CRITERIO. Los elementos individualmente invalidos se
 * siguen descartando en silencio, uno a uno, exactamente como antes; las
 * cotas se miden DESPUES, sobre lo que queda. Medirlas sobre el array
 * crudo convertiria una entrada parcialmente invalida en un rechazo
 * global, que es una politica distinta y nadie la ha pedido.
 */
function parseHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is ConversationTurn => {
    if (typeof item !== 'object' || item === null) return false
    const turn = item as Record<string, unknown>
    return (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string'
  })
}

/**
 * H1 — frontera de admision del historial.
 *
 * Devuelve el motivo del rechazo, o `null` si el historial es admisible.
 * Va junto a `parseHistory` -- son las dos mitades de la misma politica --
 * pero separada de el porque responden a preguntas distintas: aquel dice
 * QUE elementos son historial, y este dice si el historial resultante cabe.
 * Fundirlas obligaria a `parseHistory` a dejar de devolver un array.
 *
 * AMBAS COTAS SE MIDEN SOBRE EL HISTORIAL ADMITIDO, no sobre el array
 * crudo. Es la lectura coherente con el objetivo de admision: lo que
 * `parseHistory` descarta no llega a `composePrompt`, ni a la estimacion,
 * ni al proveedor, de modo que no puede contribuir a la desproporcion que
 * estas cotas existen para impedir. Medir sobre el array crudo, ademas,
 * convertiria una entrada parcialmente invalida en un rechazo global --
 * una politica distinta, que nadie ha pedido y que romperia el criterio
 * que `parseHistory` ya tenia.
 *
 * El orden de comprobacion es fijo -- turnos y luego caracteres --, de modo
 * que un historial que supere las dos cotas produce siempre la misma
 * respuesta.
 */
function historialInadmisible(conversationHistory: readonly ConversationTurn[]): string | null {
  if (conversationHistory.length > MAX_HISTORY_TURNS) return HISTORIAL_DEMASIADOS_TURNOS

  // Suma del `content` admitido. Una sola entrada gigante basta para
  // superarla: la cota es del historial entero, no de cada entrada.
  const caracteres = conversationHistory.reduce((total, turn) => total + turn.content.length, 0)

  if (caracteres > MAX_HISTORY_CHARACTERS) return HISTORIAL_DEMASIADO_LARGO

  return null
}

/**
 * P1-A — EL CUERPO SE LEE SIN QUE PUEDA LANZAR.
 *
 * `req.json()` lanza ante un cuerpo malformado, y un cuerpo nulo hacia
 * estallar el primer acceso a `body.message`. Las dos cosas producian un
 * 500 sin forma por una peticion que simplemente venia mal escrita.
 *
 * ESTO NO REPARA NADA. Un cuerpo ilegible se convierte en un cuerpo VACIO,
 * no en uno inventado: sin `message`, la peticion cae en el mismo 400 que
 * ya existia para una peticion sin mensaje, que es exactamente lo que es.
 * Se conserva la semantica del contrato en vez de anadir un codigo publico
 * nuevo, y no se filtra ningun detalle del analizador.
 *
 * Mismo criterio defensivo que ya aplican `parseHistory` y
 * `parseConversationState` sobre el resto del cuerpo.
 */
async function leerCuerpo(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const cuerpo: unknown = await req.json()

    return typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

async function atenderPeticion(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  /*
   * FRONTERA DE SEGURIDAD (P1.3). No es la pagina: es esto. La pagina puede
   * saltarse -- basta una peticion con la cookie de sesion --, de modo que
   * la unica proteccion real del turno esta aqui.
   *
   * La decision NO se toma en este archivo: se delega en el punto unico. Si
   * la politica cambia, cambia alli, y este endpoint no se entera.
   */
  const acceso = await resolveScenaiaAccess(user?.id ?? null)

  if (!acceso.allowed) {
    // La causa viaja como dato, no como frase: `no_autenticado`,
    // `no_verificado` y `plan_no_reconocido` son estados distintos y quien
    // los reciba debe poder distinguirlos sin leer un texto.
    return NextResponse.json(
      { error: 'Acceso no autorizado a ScenaIA', reason: acceso.reason },
      { status: accessDenialStatus(acceso.reason) }
    )
  }

  const body = await leerCuerpo(req)
  const originalRequest = typeof body.message === 'string' ? body.message : ''

  if (originalRequest.trim().length === 0) {
    return NextResponse.json({ error: 'Falta el campo "message"' }, { status: 400 })
  }

  /*
   * H2 -- COTA DEL MENSAJE.
   *
   * Se mide el texto TAL CUAL llegara al flujo: `originalRequest` viaja sin
   * recortar hasta `composePrompt` y hasta el prompt del resolutor, asi que
   * medir la version recortada mediria algo que nadie envia.
   *
   * Ocurre aqui y no mas adentro porque este es el ultimo punto anterior a
   * todo lo demas: no se construye contexto profesional, no se consulta
   * conocimiento, no se estima, no se reserva y no se llama al proveedor
   * por una peticion que ya sabemos que no vamos a atender.
   */
  if (originalRequest.length > MAX_USER_PROMPT_CHARACTERS) {
    return NextResponse.json({ error: MENSAJE_DEMASIADO_LARGO }, { status: 400 })
  }

  const session = {
    route: typeof body.route === 'string' ? body.route : null,
    module: typeof body.module === 'string' ? body.module : null,
    locale: typeof body.locale === 'string' ? body.locale : 'es',
  }
  const conversationHistory = parseHistory(body.history)

  /*
   * H1 -- COTA DEL HISTORIAL. Mismo lugar y mismo momento que la del
   * mensaje: antes del flujo, de la estimacion, de la reserva y del
   * proveedor. Se rechaza la peticion entera; jamas se recorta.
   */
  const historialRechazado = historialInadmisible(conversationHistory)

  if (historialRechazado !== null) {
    return NextResponse.json({ error: historialRechazado }, { status: 400 })
  }

  /**
   * FASE 3 -- contexto conversacional aportado por el cliente.
   *
   * VALIDACION TOTAL O DESCARTE TOTAL: `parseConversationState` devuelve
   * `null` en cuanto cualquier parte del estado no cumple el contrato, y
   * entonces el turno se resuelve exactamente como se resolvia antes de
   * esta fase. Nunca se repara un estado ni se acepta a medias -- un
   * criterio fantasma, vigente sin que el usuario pueda saberlo, es peor
   * que ningun criterio. Mismo criterio defensivo que ya aplica
   * `parseHistory` sobre el historial.
   *
   * El estado NO es confiable por proceder del cliente. Su validez es
   * sintactica y semantica -- dominios y conceptos de vocabulario cerrado
   * --, nunca autenticidad: no autoriza nada, no identifica a nadie y
   * ningun componente lo consulta para decidir un acceso. Un estado
   * manipulado solo puede expresar criterios que quien lo envia ya podria
   * haber pedido escribiendolos.
   */
  const conversationState = parseConversationState(body.conversationState)

  const { responseContext, conversationState: nextState } = await coordinateFlow(
    acceso.userId,
    session,
    originalRequest,
    conversationHistory,
    conversationState
  )

  // El estado viaja junto a la respuesta, no dentro de ella: `ResponseContext`
  // no gana ningun campo (PRD-001, ver TurnOutcome en el Orquestador).
  return NextResponse.json({ ...responseContext, conversationState: nextState })
}

/**
 * P1-A — NINGUNA EXCEPCION SALE DE AQUI SIN FORMA.
 *
 * Este archivo no tenia un solo `try`. Cualquier excepcion que llegase
 * hasta aqui -- el RPC de contabilidad caido, el conocimiento caido, un
 * fallo del Orquestador -- se convertia en un 500 del entorno de ejecucion:
 * sin el contrato de respuesta de ScenaIA y sin el mensaje autorizado. Toda
 * la diferenciacion que UX-002 habia construido se perdia justo en el
 * momento en que mas falta hacia.
 *
 * UN ERROR NO ES UNA DENEGACION. La respuesta lleva `error` y nada mas: sin
 * `reason` y sin `denialCode`. Convertir una averia en "has agotado tu
 * cuota" seria mentir sobre la causa y, ademas, corromper el vocabulario
 * economico, que solo puede representar sus causas reales.
 *
 * NO SALE NADA HACIA EL CLIENTE. Ni traza, ni mensaje del proveedor, ni
 * detalle de SQL, Supabase o contabilidad: el usuario recibe exclusivamente
 * el texto generico ya autorizado. Lo tecnico se queda en el registro.
 *
 * NO TOCA LA ECONOMIA. El cierre de la reserva ya ocurrio dentro de
 * `coordinateFlow` (P1.2, `finally`) antes de que la excepcion llegase
 * aqui. Esta frontera no liquida, no libera y no vuelve a intentar nada:
 * solo traduce.
 */
export async function POST(req: NextRequest) {
  try {
    return await atenderPeticion(req)
  } catch (error) {
    console.error('[P1-A] excepcion no controlada en la frontera HTTP de ScenaIA', {
      route: '/api/scenaia-verified',
      error,
    })

    return NextResponse.json({ error: TEXTO_ERROR_GENERICO }, { status: 500 })
  }
}
