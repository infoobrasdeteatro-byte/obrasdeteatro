import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { leerNumero } from './textos'

/**
 * Enlaces antiguos del Elenco Fundador con número (/elenco/001, cookie «001»):
 * devuelve el código personal de esa plaza para redirigir o atribuir, o null
 * si el texto no es un número o la plaza no está aceptada. Se resuelve en el
 * servidor con la clave de servicio: el número no sale de la base.
 */
export async function codigoDeEnlaceAntiguo(v: string | null | undefined): Promise<string | null> {
  const numero = leerNumero(v)
  if (!numero) return null
  try {
    const { data } = await (createServiceClient() as unknown as SupabaseClient)
      .from('elenco_fundadores')
      .select('codigo')
      .eq('numero', numero)
      .eq('estado', 'aceptada')
      .maybeSingle()
    return (data as { codigo?: string } | null)?.codigo ?? null
  } catch {
    return null
  }
}
