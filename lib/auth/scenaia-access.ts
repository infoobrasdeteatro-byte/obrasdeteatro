import { getProfessionalProfilePublic, getProfilePlan, getUsageLimit } from '@/lib/repository-layer'

/**
 * ACCESO A SCENAIA — PUNTO UNICO DE DECISION (P1.3).
 *
 * Hasta ahora la unica comprobacion era "hay sesion", repetida por separado
 * en la pagina y en el endpoint. Eso dejaba dos agujeros: un usuario sin
 * verificar entraba igual, y el endpoint era invocable directamente sin
 * pasar por la pagina -- una peticion con la cookie de sesion ejecutaba un
 * turno completo.
 *
 * La regla vive AQUI y solo aqui. La pagina y el endpoint la consultan y
 * traducen el veredicto a su propio lenguaje -- redireccion o codigo HTTP
 * --, pero ninguno la interpreta ni la reimplementa. Es el mismo patron ya
 * aplicado en UX-002: una decision, dos presentaciones.
 *
 * NO CONSULTA `subscriptions`, y es deliberado. El entitlement efectivo es
 * `profiles.plan`, que el webhook de Stripe ya mantiene: al contratar lo
 * sube, al cancelar lo devuelve a `gratuito`. Preguntar ademas por la fila
 * de suscripcion crearia una segunda fuente de verdad que puede discrepar
 * -- y de hecho discrepa: la cuenta `empresas` no tiene fila alguna, y un
 * impago conserva su plan mientras su `status` dice `past_due`.
 */

/** Por que se deniega. Cada valor corresponde a una condicion real, ninguno es preventivo. */
export type ScenaiaAccessDenialReason =
  /** No hay sesion. */
  | 'no_autenticado'
  /** Hay sesion, pero el correo no esta confirmado (`profiles.verificado`). */
  | 'no_verificado'
  /**
   * No se pudo determinar un plan con cuota declarada. Ocurre si el perfil
   * no existe, si la consulta falla, o si `profiles.plan` contiene un valor
   * que el catalogo de cuotas no reconoce. No es "plan gratuito": es
   * ausencia de dato.
   */
  | 'plan_no_reconocido'

/**
 * El veredicto identifica AL USUARIO cuando concede. No es un detalle de
 * comodidad: quien recibe un permiso necesita saber a quien se le concedio,
 * y devolverlo evita que el llamador tenga que afirmar por su cuenta -- con
 * una asercion de tipo -- algo que esta funcion ya sabe.
 */
export type ScenaiaAccess =
  | { readonly allowed: true; readonly userId: string; readonly plan: string }
  | { readonly allowed: false; readonly reason: ScenaiaAccessDenialReason }

/**
 * Resuelve si este usuario puede usar ScenaIA.
 *
 * TRES condiciones, en orden de coste creciente -- la primera evita las
 * consultas siguientes:
 *
 *   1. AUTENTICADO. `userId` nulo significa sin sesion. Quien llama ya la
 *      ha resuelto contra Supabase; aqui no se vuelve a resolver, porque la
 *      identidad es de la frontera, no de la politica.
 *
 *   2. VERIFICADO. `profiles.verificado`, que un disparador de base de
 *      datos pone a `true` al confirmarse el correo. Se lee por el
 *      repositorio existente, sin consulta propia.
 *
 *   3. PLAN EFECTIVO RECONOCIDO. Se pregunta al catalogo de cuotas ya
 *      congelado (`getUsageLimit`) en vez de mantener aqui una lista de
 *      planes: si manana Direccion anade uno, el acceso lo reconoce sin
 *      tocar este archivo, y si un plan no tiene cuota declarada tampoco
 *      concede acceso. Una sola fuente para "que planes existen".
 *
 * GRATUITO ENTRA. Tiene 5 creditos de IA por periodo desde el Bloque 5, y
 * toda la cadena de denegacion por cuota se construyo para el. Cerrarle el
 * acceso contradiria esa arquitectura.
 *
 * EMPRESAS ENTRA sin necesitar fila en `subscriptions`: su entitlement es
 * el plan, no el registro de pago.
 */
export async function resolveScenaiaAccess(userId: string | null): Promise<ScenaiaAccess> {
  if (userId === null) return { allowed: false, reason: 'no_autenticado' }

  const perfil = await getProfessionalProfilePublic(userId)
  if (perfil === null || !perfil.isVerified) return { allowed: false, reason: 'no_verificado' }

  const plan = await getProfilePlan(userId)
  if (plan === null || getUsageLimit(plan) === null) return { allowed: false, reason: 'plan_no_reconocido' }

  return { allowed: true, userId, plan }
}

/**
 * Codigo HTTP que corresponde a cada denegacion.
 *
 * Vive junto a la regla para que el endpoint no tenga que decidirlo: si
 * manana apareciera una causa nueva, el mapeo se completa en un solo sitio
 * y no en cada llamador.
 */
export function accessDenialStatus(reason: ScenaiaAccessDenialReason): 401 | 403 {
  return reason === 'no_autenticado' ? 401 : 403
}
