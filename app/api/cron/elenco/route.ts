import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { avisosPendientes, enviarAviso } from '@/lib/elenco/correo'

/**
 * GET /api/cron/elenco — correo al fundador por cada escalón nuevo.
 *
 * Cron diario de Vercel a las 06:00 UTC (vercel.json), después de la revisión
 * de pg_cron (elenco-revisar, 03:20 UTC). Los escalones que se otorgan al
 * momento (trigger) se avisan aquí también. Protegido con CRON_SECRET.
 */

const PAUSA_ENTRE_ENVIOS_MS = 600

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto || !cabecera) return false
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${secreto}`, 'utf8').digest()
  return timingSafeEqual(a, b)
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  if (!autorizado(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const servicio = createServiceClient() as unknown as SupabaseClient
  const avisos = await avisosPendientes(servicio)
  let enviados = 0
  for (const a of avisos) {
    if (await enviarAviso(a)) {
      await servicio.from('elenco_recompensas').update({ correo_enviado_at: new Date().toISOString() }).eq('id', a.recompensaId)
      enviados++
    }
    await esperar(PAUSA_ENTRE_ENVIOS_MS)
  }
  return NextResponse.json({ pendientes: avisos.length, enviados })
}
