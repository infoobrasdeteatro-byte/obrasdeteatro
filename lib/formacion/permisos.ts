/**
 * Espejo en la interfaz de public.puede_publicar_formaciones(): solo sirve
 * para avisar ANTES de que el usuario rellene el formulario. Quien decide es
 * la base (política de inserción y trigger al publicar).
 */
export const TIPOS_ORGANIZACION = ['compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion'] as const
export const TIPOS_PROFESIONAL = ['actor', 'director', 'dramaturgo', 'profesional'] as const
export const PLANES_DE_PAGO = ['premium', 'destacado', 'empresas'] as const

export type Permiso = 'puede' | 'necesita_plan' | 'no_puede'

export function permisoFormacion(tipoPerfil: string | null | undefined, plan: string | null | undefined): Permiso {
  if (tipoPerfil && (TIPOS_ORGANIZACION as readonly string[]).includes(tipoPerfil)) return 'puede'
  if (tipoPerfil && (TIPOS_PROFESIONAL as readonly string[]).includes(tipoPerfil)) {
    return plan && (PLANES_DE_PAGO as readonly string[]).includes(plan) ? 'puede' : 'necesita_plan'
  }
  return 'no_puede'
}
