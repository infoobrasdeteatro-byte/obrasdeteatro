import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveTurnNotice, resolveAccessDestination, TEXTO_ERROR_GENERICO } from '../turn-notice'

/**
 * UX-002 — los seis estados que el usuario debe poder distinguir.
 *
 * Antes de este bloque los cuatro primeros llegaban a la interfaz como la
 * misma frase generica: una cuota agotada era indistinguible de una
 * averia. El Nucleo ya los separaba; nadie leia la separacion.
 *
 * El entorno de pruebas es Node sin DOM, asi que no se prueba el pintado
 * -- se prueba LA DECISION, que es donde vive la propiedad. El componente
 * solo recibe un texto y una naturaleza ya resueltos.
 */
describe('resolveTurnNotice — UX-002', () => {
  it('A · CUOTA AGOTADA: aviso economico, distinto de una averia', () => {
    const aviso = resolveTurnNotice({
      responseType: 'RESPONSE_DENIED',
      responseMetadata: { denialCode: 'insufficient_ai_credits' },
    })

    expect(aviso).toEqual({ kind: 'cuota', text: 'Has alcanzado tu cuota de IA disponible.' })
    // Lo que este bloque corrige: deja de parecer un fallo del sistema.
    expect(aviso!.kind).not.toBe('error')
  })

  it('B · PLAN NO VERIFICABLE: se distingue de la cuota agotada', () => {
    const aviso = resolveTurnNotice({
      responseType: 'RESPONSE_DENIED',
      responseMetadata: { denialCode: 'plan_quota_unknown' },
    })

    expect(aviso!.text).toBe('No hemos podido determinar tu plan de IA en este momento. Inténtalo de nuevo.')
    // No ha consumido nada: decirle que agoto su cuota seria falso.
    expect(aviso!.text).not.toContain('cuota de IA disponible')
  })

  it('C · COSTE NO CALCULABLE: mensaje propio, distinto de los dos anteriores', () => {
    const aviso = resolveTurnNotice({
      responseType: 'RESPONSE_DENIED',
      responseMetadata: { denialCode: 'estimated_cost_unknown' },
    })

    expect(aviso!.text).toBe('No hemos podido calcular el coste de esta solicitud en este momento. Inténtalo de nuevo.')
  })

  it('D · RESPUESTA PARCIAL: se declara incompleta', () => {
    const aviso = resolveTurnNotice({ responseType: 'RESPONSE_PARTIAL', responseContent: 'una frase a medio ter' })

    expect(aviso).toEqual({ kind: 'incompleta', text: 'Esta respuesta ha quedado incompleta.' })
  })

  it('E · ERROR TECNICO: mensaje diferenciado', () => {
    const aviso = resolveTurnNotice({ responseType: 'RESPONSE_ERROR' })

    expect(aviso).toEqual({ kind: 'error', text: 'No ha sido posible completar esta solicitud. Inténtalo de nuevo.' })
  })

  it('F · RESPUESTA NORMAL: sin aviso, no se molesta al usuario', () => {
    expect(resolveTurnNotice({ responseType: 'RESPONSE_SUCCESS', responseContent: 'una respuesta entera' })).toBeNull()
    expect(resolveTurnNotice({ responseType: 'RESPONSE_DIRECT', responseContent: 'contenido determinista' })).toBeNull()
  })

  it('LOS CINCO ESTADOS son distinguibles entre si', () => {
    const textos = [
      resolveTurnNotice({ responseMetadata: { denialCode: 'insufficient_ai_credits' } })!.text,
      resolveTurnNotice({ responseMetadata: { denialCode: 'plan_quota_unknown' } })!.text,
      resolveTurnNotice({ responseMetadata: { denialCode: 'estimated_cost_unknown' } })!.text,
      resolveTurnNotice({ responseType: 'RESPONSE_PARTIAL' })!.text,
      resolveTurnNotice({ responseType: 'RESPONSE_ERROR' })!.text,
    ]

    expect(new Set(textos).size).toBe(5)
  })

  it('NINGUNA señal especifica degrada al mensaje generico', () => {
    // El riesgo concreto: que una causa reconocida acabe cayendo al texto
    // de error comun y el usuario pierda la unica informacion accionable.
    const GENERICO = 'No ha sido posible completar esta solicitud. Inténtalo de nuevo.'

    for (const denialCode of ['insufficient_ai_credits', 'plan_quota_unknown', 'estimated_cost_unknown']) {
      const aviso = resolveTurnNotice({ responseType: 'RESPONSE_DENIED', responseMetadata: { denialCode } })

      expect(aviso, denialCode).not.toBeNull()
      expect(aviso!.text, denialCode).not.toBe(GENERICO)
    }

    // Y la respuesta parcial tampoco: tiene mensaje propio.
    expect(resolveTurnNotice({ responseType: 'RESPONSE_PARTIAL' })!.text).not.toBe(GENERICO)
    // El generico queda reservado a lo que de verdad no se puede explicar.
    expect(resolveTurnNotice({ responseType: 'RESPONSE_ERROR' })!.text).toBe(GENERICO)
  })

  it('DEGRADACION: con cuota agotada PERO contenido util, el aviso acompaña al contenido', () => {
    // El Nucleo entrega el conocimiento ya recuperado aunque la IA no se
    // autorizara. El aviso explica por que no intervino; no anula la
    // respuesta.
    const aviso = resolveTurnNotice({
      responseType: 'RESPONSE_DIRECT',
      responseContent: 'contenido determinista real',
      responseMetadata: { denialCode: 'insufficient_ai_credits' },
      responseWarnings: ['respuesta compuesta sin IA: autorizacion no concedida'],
    })

    expect(aviso!.kind).toBe('cuota')
  })

  it('PRECEDENCIA derivada del contrato: denegacion y parcial no coexisten', () => {
    // `composeResponse` retorna en la rama de denegacion antes de llegar a
    // la de ejecucion. Si aun asi llegaran juntos, manda la causa
    // economica: es la unica sobre la que el usuario puede actuar.
    const aviso = resolveTurnNotice({
      responseType: 'RESPONSE_PARTIAL',
      responseMetadata: { denialCode: 'insufficient_ai_credits' },
    })

    expect(aviso!.kind).toBe('cuota')
  })

  it('NO INVENTA: sin señales no hay aviso, y un contrato vacio no rompe nada', () => {
    expect(resolveTurnNotice({})).toBeNull()
    expect(resolveTurnNotice({ responseMetadata: {} })).toBeNull()
    expect(resolveTurnNotice({ responseType: 'RESPONSE_SUCCESS', responseMetadata: { denialCode: '' } })).toBeNull()
  })

  it('CAUSA DESCONOCIDA: no se filtra vocabulario interno al usuario', () => {
    // Si el backend anadiera un codigo nuevo, el usuario vera un mensaje
    // impreciso, nunca el identificador tecnico.
    const aviso = resolveTurnNotice({ responseMetadata: { denialCode: 'codigo_que_no_existe_todavia' } })

    expect(aviso!.kind).toBe('error')
    expect(aviso!.text).not.toContain('codigo_que_no_existe_todavia')
  })

  it('NO DUPLICA LOGICA DE NEGOCIO: ningun calculo economico en el cliente', () => {
    // Se mira el CODIGO, no los textos: el mensaje que ve el usuario dice
    // "cuota" precisamente porque de eso trata. Lo que no puede haber aqui
    // es CALCULO -- ni magnitudes economicas, ni comparaciones, ni fuentes
    // de verdad del backend.
    const codigo = readFileSync(join(__dirname, '..', 'turn-notice.ts'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/'[^']*'/g, "''")

    expect(codigo).not.toMatch(/amountPerCredit|estimatedCost|reservedCost|creditsPerPeriod/)
    expect(codigo).not.toMatch(/PLAN_AI_QUOTAS|maxOutputTokens|calculateExecutionCost|toCredits|CREDIT_VALUE/)
    // No reintenta, no vuelve a pedir, no consume creditos adicionales.
    expect(codigo).not.toMatch(/fetch\(|retry|reintent/i)
    // Y no importa nada del backend economico.
    expect(codigo).not.toMatch(/@\/lib\/(accounting|credit-manager|decision-engine|provider-catalog)/)
  })
})


/**
 * P1-B — LA CAUSA DE UN 403 TIENE DESTINO.
 *
 * El endpoint ya enviaba `reason` y el cliente lo descartaba. Aqui se
 * prueba LA DECISION -- que motivo lleva a donde --, igual que UX-002
 * prueba la decision del aviso y no su pintado.
 */
describe('resolveAccessDestination — P1-B', () => {
  it('A · NO VERIFICADO: a la pantalla de verificacion de UX-003', () => {
    expect(resolveAccessDestination('no_verificado')).toBe('/verificacion')
  })

  it('B · NO AUTENTICADO: NO navega -- conserva el aviso, que es lo que hacia antes', () => {
    // Antes de P1-ERRORES el cliente mostraba el aviso y se quedaba quieto.
    // P1-B no venia a cambiar eso: venia a dejar de tirar la causa.
    expect(resolveAccessDestination('no_autenticado')).toBeNull()
  })

  it('C · PLAN NO RECONOCIDO: tampoco navega', () => {
    // Sacarlo de la conversacion le haria perder lo que estaba escribiendo,
    // y ninguna autorizacion lo pide.
    expect(resolveAccessDestination('plan_no_reconocido')).toBeNull()
  })

  it('D · MOTIVO DESCONOCIDO: a ninguna parte', () => {
    // Si algun dia el backend anadiera una causa, el cliente no la lleva a
    // un sitio inventado: se queda en el aviso generico.
    expect(resolveAccessDestination('causa_nueva')).toBeNull()
  })

  it('E · SIN MOTIVO -- un 500 o un 400 no navegan', () => {
    for (const valor of [undefined, null, '', 0, {}, ['no_verificado']]) {
      expect(resolveAccessDestination(valor), String(valor)).toBeNull()
    }
  })

  it('EXACTAMENTE UNA navegacion: `no_verificado` y nadie mas', () => {
    // Los tres motivos que el contrato P1.3 emite hoy. Solo uno mueve al
    // usuario, y es el unico para el que existe una pantalla autorizada.
    const motivosDelContrato = ['no_autenticado', 'no_verificado', 'plan_no_reconocido']
    const queNavegan = motivosDelContrato.filter((motivo) => resolveAccessDestination(motivo) !== null)

    expect(queNavegan).toEqual(['no_verificado'])
  })

  it('P1-A · el texto generico es UNO solo, compartido con la frontera HTTP', () => {
    expect(TEXTO_ERROR_GENERICO).toBe('No ha sido posible completar esta solicitud. Inténtalo de nuevo.')
    // Y es el mismo que UX-002 muestra dentro de un turno fallido.
    expect(resolveTurnNotice({ responseType: 'RESPONSE_ERROR' })).toEqual({
      kind: 'error',
      text: TEXTO_ERROR_GENERICO,
    })
  })
})
