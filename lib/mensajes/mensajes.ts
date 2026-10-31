/**
 * Red profesional · Fase 3: mensajería. Las reglas viven en la base
 * (puede_escribir / enviar_mensaje); aquí solo los textos y formatos.
 */
export const MAX_MENSAJE = 2000

export type MotivoEscribir = 'si' | 'anonimo' | 'propio' | 'bloqueado' | 'plan' | 'solo_contactos' | 'no_disponible'

export function motivoEscribir(v: string | null | undefined): MotivoEscribir {
  return v === 'si' || v === 'anonimo' || v === 'propio' || v === 'bloqueado' || v === 'plan' || v === 'solo_contactos' ? v : 'no_disponible'
}

/** Texto para quien no puede escribir (o null si puede o no aplica). */
export function textoNoPuede(motivo: MotivoEscribir, nombre: string): string | null {
  switch (motivo) {
    case 'bloqueado': return `Has bloqueado a ${nombre}: no puede escribirte y tú tampoco a ${nombre}. Desbloquea para volver a escribirse.`
    case 'plan': return `Para escribir a ${nombre} sin estar conectados necesitas un plan de pago. Con una conexión aceptada, los mensajes son gratis.`
    case 'solo_contactos': return `${nombre} solo recibe mensajes de sus contactos. Conecta primero para poder escribirle.`
    case 'no_disponible': return `Ahora mismo no se pueden enviar mensajes a ${nombre}.`
    default: return null
  }
}

/** Error de enviar_mensaje en texto para la persona. */
export function textoErrorEnvio(resultado: string): string {
  switch (resultado) {
    case 'limite': return 'Has enviado muchos mensajes en poco tiempo. Espera un rato y vuelve a intentarlo.'
    case 'vacio': return 'Escribe un mensaje antes de enviarlo.'
    case 'plan': return 'Para escribir a quien no es contacto necesitas un plan de pago.'
    case 'solo_contactos': return 'Esta persona solo recibe mensajes de sus contactos.'
    default: return 'No se pudo enviar el mensaje. Inténtalo de nuevo.'
  }
}

/** Hora corta para la bandeja y el hilo, en la zona de quien lee. */
export function fechaMensaje(iso: string, ahora = new Date()): string {
  const d = new Date(iso)
  const mismoDia = d.toDateString() === ahora.toDateString()
  return mismoDia
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
