import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { procesarAviso } from '@/lib/correo/recepcion'

/**
 * POST /api/webhooks/resend-inbound: Resend avisa de cada correo recibido en
 * panel@buzon.obrasdeteatro.com (copias de hola@ y del Gmail). La lógica está
 * en lib/correo/recepcion.ts: firma, recuperación del contenido, idempotencia.
 *
 * Variables:
 * - RESEND_INBOUND_WEBHOOK_SECRET: clave de firma del webhook (whsec_…).
 * - RESEND_RECEIVING_API_KEY: clave de Resend con permiso «Full access» para
 *   leer el correo completo. Si no existe, se prueba con RESEND_API_KEY.
 */

export const maxDuration = 30

export async function POST(req: NextRequest) {
  // El cuerpo exacto: la firma se calcula sobre él.
  const cuerpo = await req.text()
  const r = await procesarAviso(
    cuerpo,
    {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      firma: req.headers.get('svix-signature'),
    },
    {
      secreto: process.env.RESEND_INBOUND_WEBHOOK_SECRET,
      clave: process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY,
      servicio: createServiceClient() as unknown as SupabaseClient,
    },
  )
  if (r.status >= 400 && r.status !== 401) console.error('resend-inbound:', r.status, r.cuerpo.error)
  return NextResponse.json(r.cuerpo, { status: r.status })
}
