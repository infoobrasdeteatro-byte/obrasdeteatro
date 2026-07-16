/**
 * Plantillas fijas y deterministas -- nunca texto compuesto a partir de
 * DecisionRationale/AuthorizationReason (esos son diagnosticos tecnicos,
 * preservados solo en ResponseMetadata, nunca mostrados directamente).
 * RESPONSE_DIRECT no tiene plantilla: su contenido no existe (IA-008).
 */
export const RESPONSE_TEMPLATES = {
  RESPONSE_DIRECT: null,
  RESPONSE_DENIED: 'No ha sido posible autorizar esta solicitud en este momento.',
  RESPONSE_ERROR: 'No ha sido posible procesar tu solicitud en este momento. Intentalo de nuevo mas tarde.',
} as const
