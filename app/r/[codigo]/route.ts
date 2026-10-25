import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_REFERIDO, REFERIDO_MAX_AGE_S, codigoValido } from '@/lib/embajadores/textos'

/**
 * Enlace personal de un/a Embajador/a de Escena: guarda el código en una
 * cookie y lleva al registro. El mes de Premium se concede al confirmar el
 * correo (app/auth/callback), con las reglas de canjear_referido.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const valido = codigoValido(codigo)
  const respuesta = NextResponse.redirect(new URL(valido ? '/auth/registro?invitado=1' : '/auth/registro', request.url))
  if (valido) {
    respuesta.cookies.set(COOKIE_REFERIDO, valido, {
      maxAge: REFERIDO_MAX_AGE_S, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
    })
  }
  return respuesta
}
