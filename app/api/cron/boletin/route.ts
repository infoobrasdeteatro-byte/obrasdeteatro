import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { tocaEnvio } from '@/lib/boletin/boletin'
import { enviarBoletin } from '@/lib/boletin/envio'

/**
 * GET /api/cron/boletin: cron diario de Vercel (vercel.json). Solo envía el
 * día de la semana elegido en /admin/boletin, si el boletín está activo y si
 * no hubo un envío real en los últimos 6 días.
 */
export const maxDuration = 60

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto || !cabecera) return false
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${secreto}`, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!autorizado(req.headers.get('authorization'))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Falta RESEND_API_KEY' }, { status: 500 })

  const supabase = createServiceClient()
  const ahora = new Date()
  const [{ data: config }, { data: ultimo }] = await Promise.all([
    supabase.from('boletin_config').select('nombre, activo, acceso, dia_envio').maybeSingle(),
    supabase.from('boletin_envios').select('enviado_at').eq('es_prueba', false).gt('destinatarios', 0)
      .order('enviado_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!config) return NextResponse.json({ error: 'Sin configuración' }, { status: 500 })
  if (!tocaEnvio(config, ultimo?.enviado_at ?? null, ahora)) return NextResponse.json({ enviado: false, motivo: 'Hoy no toca' })

  try {
    return NextResponse.json(await enviarBoletin(supabase, config, ahora))
  } catch (e) {
    console.error('cron/boletin:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
