import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { actualizarTareaAgente, autorizarAgente } from '@/lib/tareas/agente'

/**
 * PATCH /api/admin/agente/tareas/{id}: el agente pasa una de sus tareas a
 * en_curso, resuelta o descartada y/o añade una nota.
 * Cuerpo: { "estado"?: "en_curso" | "resuelta" | "descartada", "nota"?: "…" }.
 * Desactivada (404) mientras no exista ADMIN_AGENT_TOKEN.
 */
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = autorizarAgente(req.headers.get('authorization'), process.env.ADMIN_AGENT_TOKEN)
  const { id } = await params
  let cuerpo: unknown = null
  if (auth === 'ok') {
    try { cuerpo = await req.json() } catch { return NextResponse.json({ error: 'Cuerpo no válido' }, { status: 400 }) }
  }
  const r = await actualizarTareaAgente(auth, () => createServiceClient() as unknown as SupabaseClient, id, cuerpo)
  return NextResponse.json(r.cuerpo, { status: r.status, headers: { 'cache-control': 'no-store' } })
}
