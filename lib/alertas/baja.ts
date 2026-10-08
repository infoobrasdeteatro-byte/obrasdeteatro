import { createServiceClient } from '@/lib/supabase/service'
import { verificarTokenBaja } from './alertas'

export type ResultadoBaja = 'hecha' | 'token_invalido' | 'error'

/**
 * Desactiva la alerta del usuario del token. Sin sesión: el token firmado es
 * la prueba de que el enlace salió de un correo suyo, y solo sirve para esto.
 * Con la clave de servicio porque quien se da de baja puede no tener sesión
 * (o ya no tener plan de pago, y la RLS no le dejaría escribir).
 *
 * Idempotente: si ya estaba desactivada, o no había alerta, también es 'hecha'.
 */
export async function darDeBajaPorToken(token: string | null | undefined): Promise<ResultadoBaja> {
  const profileId = verificarTokenBaja(token)
  if (!profileId) return 'token_invalido'

  const { error } = await createServiceClient()
    .from('alertas_convocatorias')
    .update({ activa: false })
    .eq('profile_id', profileId)

  if (error) {
    console.error('alertas/baja: no se pudo desactivar la alerta:', error.message)
    return 'error'
  }
  return 'hecha'
}
