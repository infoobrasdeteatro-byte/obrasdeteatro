import { createClient as createBrowserlikeClient } from '@supabase/supabase-js'

/**
 * AEC-003B Fase 4 (DA-005): reautenticación real e inmediata -- extraída
 * aquí en la Fase 6 para que el orquestador la reutilice sin duplicar la
 * lógica que ya implementó la Fase 4. El comportamiento no cambia respecto
 * al que ya validó y cerró la Fase 4; solo cambia su ubicación.
 */
export async function verificarReautenticacion(email: string, password: unknown): Promise<boolean> {
  if (typeof password !== 'string' || password.length === 0) return false

  const client = createBrowserlikeClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await client.auth.signInWithPassword({ email, password })
  return !error
}
