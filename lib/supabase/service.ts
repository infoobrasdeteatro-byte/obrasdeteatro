import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Cliente con la clave de servicio: se salta la RLS y puede ejecutar las
// funciones reservadas a service_role. Solo para código de servidor que ya ha
// resuelto por su cuenta quién es el usuario (con lib/supabase/server) y
// necesita una operación que ese usuario no debe poder invocar directamente,
// como las reservas y liquidaciones de créditos de IA.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
