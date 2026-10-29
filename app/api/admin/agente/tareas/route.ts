import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { autorizarAgente, listarTareasAgente } from '@/lib/tareas/agente'

/**
 * GET /api/admin/agente/tareas: tareas del agente automático, pendientes o en
 * curso. Desactivada (404) mientras no exista ADMIN_AGENT_TOKEN. Ver
 * lib/tareas/agente.ts.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = autorizarAgente(req.headers.get('authorization'), process.env.ADMIN_AGENT_TOKEN)
  // La clave de servicio solo se crea después de validar el token.
  const r = await listarTareasAgente(auth, () => createServiceClient() as unknown as SupabaseClient)
  return NextResponse.json(r.cuerpo, { status: r.status, headers: { 'cache-control': 'no-store' } })
}
