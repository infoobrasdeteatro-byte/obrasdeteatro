/**
 * Plantillas fijas y deterministas -- nunca texto compuesto a partir de
 * DecisionRationale/AuthorizationReason (esos son diagnosticos tecnicos,
 * preservados solo en ResponseMetadata, nunca mostrados directamente).
 * RESPONSE_DIRECT no tiene plantilla propia: su contenido, cuando existe,
 * llega ya producido desde fuera de Response Composer (IA-008, Plan
 * Tecnico aprobado 2026-07-22) -- este valor solo se usa como valor por
 * defecto cuando ese contenido no esta disponible.
 */
export const RESPONSE_TEMPLATES = {
  RESPONSE_DIRECT: null,
  RESPONSE_DENIED: 'No ha sido posible autorizar esta solicitud en este momento.',
  RESPONSE_ERROR: 'No ha sido posible procesar tu solicitud en este momento. Intentalo de nuevo mas tarde.',
} as const
