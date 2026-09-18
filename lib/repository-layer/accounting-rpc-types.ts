import type { Database } from '@/types/supabase'

/**
 * Correccion de los tipos GENERADOS para la RPC `accounting_verify_and_reserve`.
 *
 * No arregles esto editando `types/supabase.ts`: ese archivo es descartable y
 * se reescribe entero cada vez que cambia el esquema. Esta misma correccion
 * ya vivio alli y se perdio en la primera regeneracion. Vive aqui justamente
 * para sobrevivir a la siguiente.
 *
 * Que corrige y por que. El generador de Supabase deriva los tipos de la
 * firma SQL, y una firma SQL no distingue `numeric` de `numeric que admite
 * NULL` en las columnas de un RETURNS TABLE. Para esta funcion esa
 * distincion es el contrato entero: un plan sin techo (limite NULL) se mide
 * igual pero no puede denegarse por cuota, y la funcion devuelve NULL a
 * proposito en los siete campos de `NullableOnPurpose`. El generador los
 * declara no-nulos; creerle significaria dejar de comprobar nulos que llegan
 * de verdad.
 *
 * Desde 20260918152046_accounting_solo_servidor_y_limite_interno la funcion ya no
 * recibe `p_authorized_limit`: calcula el limite a partir de profiles.plan.
 * Los argumentos generados son, por tanto, correctos tal cual.
 *
 * Todo se deriva del tipo generado mediante Omit + interseccion: si el
 * esquema gana o pierde campos, este override los hereda sin tocarse. Lo
 * unico que sostiene a mano es la nulabilidad.
 */

type Generated = Database['public']['Functions']['accounting_verify_and_reserve']

/** Shape de argumentos generado: unico sitio del repo donde se nombra. */
type GeneratedArgs = Generated['Args']

/** Fila del retorno generado, ya desenvuelta del array. */
type GeneratedRow = Generated['Returns'] extends readonly (infer Row)[] ? Row : never

/**
 * Campos que la funcion SQL devuelve NULL deliberadamente: los cinco de la
 * reserva no existen cuando se deniega, `available_capacity` no existe
 * cuando el plan no tiene techo, y `denial_reason` no existe cuando autoriza.
 * En los tres casos el NULL es la ausencia real del dato, no un hueco por
 * rellenar (PRD-001).
 */
type NullableOnPurpose =
  | 'authorized_limit_snapshot'
  | 'available_capacity'
  | 'created_at'
  | 'denial_reason'
  | 'expires_at'
  | 'reservation_id'
  | 'status'

export type AccountingVerifyAndReserveArgs = GeneratedArgs

export type AccountingVerifyAndReserveRow = Omit<GeneratedRow, NullableOnPurpose> & {
  [K in NullableOnPurpose]: GeneratedRow[K] | null
}

