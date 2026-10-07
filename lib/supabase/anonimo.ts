import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Cliente con la clave anónima y SIN cookies, para páginas públicas cacheadas
 * (revalidate). La RLS evalúa exactamente lo que ve un visitante sin cuenta,
 * y la página no se vuelve dinámica por leer cookies. Decisión aprobada por
 * Dirección para la portada (PR #59); la usan también /colaboradores.
 */
export function clienteAnonimo() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
