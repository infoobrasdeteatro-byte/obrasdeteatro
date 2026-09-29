/**
 * "Nueva conversacion" en ScenaIA: empezar de cero sin recargar la pagina.
 *
 * Toda la logica vive aqui, en funciones puras, como en `listado.ts`: el
 * boton solo pinta lo que estas funciones deciden y ScenaiaClient solo aplica
 * el estado inicial.
 *
 * No hace falta decirle nada al servidor. La conversacion nueva nace en el
 * turno siguiente: el cliente envia `conversationState: null` y un historial
 * vacio, y el servidor abre un `conversationId` nuevo sin criterios
 * heredados, exactamente como en el primer turno de la pagina. No se guarda
 * nada en el navegador: el historial sigue viviendo solo en memoria
 * (UX-001A/B).
 */

/** Texto de la confirmacion cuando hay una conversacion que se borraria. */
export const CONFIRMACION_NUEVA_CONVERSACION = '¿Empezar una conversación nueva? Se borrará la actual.'

/** El boton solo tiene sentido si hay conversacion: con el chat vacio no se muestra. */
export function mostrarNuevaConversacion(mensajes: readonly unknown[]): boolean {
  return mensajes.length > 0
}

/**
 * Se puede empezar de nuevo si hay conversacion y ningun turno en curso. Con
 * un turno en curso, su respuesta llegaria despues y se anadiria a la
 * conversacion nueva, reemplazando ademas su estado.
 */
export function puedeEmpezarNueva(mensajes: readonly unknown[], pendiente: boolean): boolean {
  return mostrarNuevaConversacion(mensajes) && !pendiente
}

/** Borrar una conversacion no tiene vuelta atras: se confirma si hay algo que borrar. */
export function requiereConfirmacion(mensajes: readonly unknown[]): boolean {
  return mensajes.length > 0
}

/**
 * Estado de una conversacion recien empezada: sin mensajes (y por tanto sin
 * ninguna pagina de listado ni "Ver mas" anteriores), sin estado
 * conversacional y sin aviso de error. El texto que se esta escribiendo NO
 * forma parte de el: se conserva.
 */
export function estadoDeConversacionNueva(): { messages: []; conversationState: null; error: null } {
  return { messages: [], conversationState: null, error: null }
}
