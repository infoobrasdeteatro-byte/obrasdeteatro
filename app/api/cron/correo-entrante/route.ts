import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { borrarCorreosAntiguos } from '@/lib/correo/conservacion'

/**
 * GET /api/cron/correo-entrante: conservación del correo entrante.
 *
 * Lo llama el cron de Vercel una vez al día (vercel.json) con
 * `Authorization: Bearer <CRON_SECRET>`. Borra de correos_entrantes los
 * correos con más de 12 meses. Los buzones originales (Arsys y Gmail) no se
 * tocan: allí sigue todo.
 */

export const maxDuration = 30

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto || !cabecera) return false
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${secreto}`, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!autorizado(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const r = await borrarCorreosAntiguos(createServiceClient() as unknown as SupabaseClient)
  if (r.error) {
    console.error('cron/correo-entrante:', r.error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
  return NextResponse.json({ borrados: r.borrados, antesDe: r.antesDe })
}
