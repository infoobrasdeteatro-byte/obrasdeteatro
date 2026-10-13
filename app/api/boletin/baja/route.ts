import { NextRequest, NextResponse } from 'next/server'
import { darDeBaja } from '@/app/boletin/acciones'

/**
 * POST /api/boletin/baja?t=<token>: baja de un clic desde el cliente de correo
 * (RFC 8058, cabeceras List-Unsubscribe). Solo POST: un GET no da de baja a nadie.
 */
export async function POST(req: NextRequest) {
  const r = await darDeBaja(new URL(req.url).searchParams.get('t'))
  if (r === 'invalido') return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 })
  if (r === 'error') return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  return NextResponse.json({ baja: true })
}
