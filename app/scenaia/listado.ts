/**
 * SCENAIA-004B §4.8 y §4.9 -- paginacion visible del listado en el chat.
 *
 * Toda la logica de la interfaz vive aqui, en funciones puras: el pie, si
 * hay "Ver mas", que historial se envia y con que cuerpo se pide la pagina
 * siguiente. Los componentes solo pintan lo que estas funciones deciden.
 *
 * El cliente NO decide nada de la paginacion: ni el tamano de pagina, ni el
 * interruptor, ni si hay mas obras. Lee `listingPage` tal como la envio el
 * servidor y reenvia `nextOffset` tal cual.
 */

/**
 * Pagina del listado tal como llega en la respuesta (`listingPage`,
 * SCENAIA-004B §4.7). Se declara aqui, como `ScenaiaResponse` en el
 * cliente, en vez de importar tipos del servidor.
 */
export interface PaginaDelListado {
  readonly from: number
  readonly to: number
  readonly total: number | null
  readonly nextOffset: number | null
}

/**
 * Turno del chat. `listingPage`, `listingRequest` y `esContinuacion` solo
 * existen en las respuestas de un listado: en cualquier otro turno el
 * objeto es exactamente el de siempre, sin claves nuevas.
 */
export interface TurnoDelChat<Aviso = unknown> {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly notice?: Aviso | null
  /** Pagina entregada en esta respuesta. */
  readonly listingPage?: PaginaDelListado
  /** Texto del listado que origino esta pagina: el que "Ver mas" reenvia. */
  readonly listingRequest?: string
  /** Pagina pedida con "Ver mas": se muestra, pero no entra en el historial. */
  readonly esContinuacion?: true
}

/** Separador de miles con punto, como en castellano: 5000 -> "5.000". */
export function conMiles(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Una pagina vacia (`to < from`) no tiene obras: el listado ya se mostro entero. */
export function esPaginaVacia(pagina: PaginaDelListado): boolean {
  return pagina.to < pagina.from
}

/**
 * Texto del pie (SCENAIA-004B §4.9):
 *   - con total: "Mostrando 1-10 de 11"; una sola obra, "Mostrando 11 de 11";
 *   - con total no determinado: "Mostrando 1-10", NUNCA "de N";
 *   - pagina vacia: "No hay más obras en este listado".
 */
export function textoDelPie(pagina: PaginaDelListado): string {
  if (esPaginaVacia(pagina)) return 'No hay más obras en este listado'

  const rango = pagina.from === pagina.to ? conMiles(pagina.from) : `${conMiles(pagina.from)}-${conMiles(pagina.to)}`

  return pagina.total === null ? `Mostrando ${rango}` : `Mostrando ${rango} de ${conMiles(pagina.total)}`
}

/** Hay pagina siguiente: el servidor la ofrece y esta pagina no esta vacia. */
export function hayMasObras(pagina: PaginaDelListado): boolean {
  return pagina.nextOffset !== null && !esPaginaVacia(pagina)
}

/**
 * "Ver mas" solo existe en la ULTIMA respuesta del chat: en una anterior
 * reenviaria un listado sobre un estado conversacional posterior, y
 * mezclaria criterios (SCENAIA-004B §6.2).
 */
export function esUltimaRespuesta(indice: number, turnos: readonly TurnoDelChat[]): boolean {
  return indice === turnos.length - 1 && turnos[indice]?.role === 'assistant'
}

/**
 * Historial que se envia al servidor (SCENAIA-004B §4.9): las paginas de
 * continuacion se muestran pero no se envian, y a cada turno se le quitan
 * los campos que solo usa la interfaz. Un turno que no es de un listado
 * sale exactamente como estaba, con las mismas claves y el mismo orden.
 */
export function historialEnviable<T extends TurnoDelChat>(turnos: readonly T[]): Omit<T, 'listingPage' | 'listingRequest' | 'esContinuacion'>[] {
  return turnos
    .filter((turno) => turno.esContinuacion !== true)
    .map((turno) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { listingPage, listingRequest, esContinuacion, ...resto } = turno
      return resto
    })
}

/**
 * Cuerpo de la peticion de un turno. Sin continuacion es exactamente el de
 * siempre, con las mismas claves en el mismo orden. Con continuacion, el
 * mensaje es el del listado original y `continuation` lleva el
 * `nextOffset` que envio el servidor, sin recalcularlo.
 */
export function cuerpoDelTurno(
  mensaje: string,
  historial: readonly unknown[],
  conversationState: unknown,
  continuation: { readonly offset: number } | null = null
) {
  return {
    message: mensaje,
    history: historial,
    conversationState,
    route: '/scenaia',
    module: 'centro-profesional',
    ...(continuation !== null ? { continuation: { offset: continuation.offset } } : {}),
  }
}
