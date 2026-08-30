import { buildResolverPrompt, mayNeedResolution, parseResolvedTerms } from './vocabulary'

/**
 * Ejecutor de proveedor inyectado por el llamador. El resolutor NUNCA
 * importa AI Gateway: recibe la capacidad de ejecutar ya resuelta y
 * autorizada por quien lo invoca (el Orquestador), de modo que toda
 * ejecucion real sigue pasando por AI Gateway y produciendo su
 * `ExecutionAudit`, sin una segunda via de acceso al proveedor.
 */
export type VocabularyExecutor = (prompt: string) => Promise<string | null>

/**
 * Resuelve la peticion del usuario sobre el vocabulario que el sistema ya
 * conoce (responsabilidad Domain Vocabulary del ADR SCENAIA-002C.1:
 * "normaliza vocabulario, resuelve sinonimos, unifica conceptos"; nunca
 * "construir criterios" ni "consultar datos").
 *
 * Lo que devuelve son terminos de superficie, no criterios: los umbrales
 * numericos (60 min, 4 interpretes, 8 anos, 1950) los sigue aplicando
 * `interpretRules` con los valores ya ratificados en SCENAIA-002C. El
 * proveedor no produce ni ve un solo numero.
 *
 * Degradacion segura en todos los fallos posibles: si el proveedor no
 * responde, responde vacio, se equivoca de formato o inventa terminos, el
 * resultado es una lista vacia y el flujo continua exactamente como antes
 * de esta capa. Nunca lanza.
 */
export async function resolveVocabulary(originalRequest: string, execute: VocabularyExecutor): Promise<string[]> {
  if (originalRequest.trim().length === 0) return []

  // Guarda de coste: si la peticion no contiene nada que los motores no
  // consuman ya, no hay nada que traducir y no se consulta al proveedor.
  if (!mayNeedResolution(originalRequest)) return []

  try {
    const contenido = await execute(buildResolverPrompt(originalRequest))
    return parseResolvedTerms(contenido, originalRequest)
  } catch {
    return []
  }
}
