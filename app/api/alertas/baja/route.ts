import { NextRequest, NextResponse } from 'next/server'
import { darDeBajaPorToken } from '@/lib/alertas/baja'

/**
 * POST /api/alertas/baja?t=<token> — baja de un clic desde el cliente de
 * correo (RFC 8058). Gmail y Outlook la llaman al pulsar «Cancelar
 * suscripción», gracias a las cabeceras List-Unsubscribe y
 * List-Unsubscribe-Post del correo. Sin sesión: decide el token firmado.
 *
 * Solo POST: un GET (lo que hacen los antivirus al abrir enlaces) no da de
 * baja a nadie. El enlace del cuerpo del correo va a /alertas/baja, una
 * página con un botón.
 */
export async function POST(req: NextRequest) {
  const resultado = await darDeBajaPorToken(new URL(req.url).searchParams.get('t'))
  if (resultado === 'token_invalido') return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 })
  if (resultado === 'error') return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  return NextResponse.json({ baja: true })
}
