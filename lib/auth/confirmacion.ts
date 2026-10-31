import { NextResponse, type NextRequest } from 'next/server'
import type { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/welcome-email'
import { safeNextPath, NEXT_TRAS_REGISTRO_COOKIE } from '@/lib/auth/next-param'
import { COOKIE_REFERIDO, codigoValido, tokenValido } from '@/lib/embajadores/textos'

/**
 * Lo que ocurre al confirmar el correo del registro, sea por /auth/callback
 * (enlace antiguo, PKCE) o por /auth/confirm (enlace con token_hash, válido en
 * cualquier aparato). Todo es idempotente: puede repetirse sin efectos dobles.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Destinos a los que nunca se vuelve tras confirmar: darían otro salto por /auth. */
function destinoValido(v: string | null | undefined): string | null {
  const ruta = safeNextPath(v)
  return ruta !== null && !ruta.startsWith('/auth') ? ruta : null
}

/**
 * AEC-001: tras un intercambio de código/OTP exitoso, esta es la confirmación
 * efectiva del correo. Es el único punto que dispara el email de bienvenida --
 * nunca el momento del registro. `welcome_email_sent_at` garantiza el envío
 * como mucho una vez por cuenta, aunque se visite más de una vez.
 */
export async function notifyWelcomeIfFirstConfirmation(supabase: Supabase): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return

  const { data } = await supabase
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('welcome_email_sent_at', null)
    .select('nombre')
    .maybeSingle()

  if (data) {
    await sendWelcomeEmail({ email: user.email, nombre: data.nombre })
  }
}

/**
 * Embajadores de Escena, al confirmar el correo (en cualquier navegador):
 * - si se registró desde su invitación, se acepta (destino: su Centro
 *   Profesional con la bienvenida);
 * - si llegó con el enlace personal de un/a embajador/a, se canjea su mes de
 *   Premium (cookie o, si confirma en otro navegador, el dato de la cuenta).
 * Las reglas están en la base; un fallo nunca bloquea la confirmación.
 */
export async function aplicarEmbajadores(request: NextRequest, supabase: Supabase): Promise<string | undefined> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
    const token = tokenValido(meta.invitacion_embajador)
    if (token) {
      const { data } = await supabase.rpc('aceptar_invitacion_embajador', { p_token: token })
      if (data === 'ok' || data === 'ya_embajador') return '/perfil/centro?embajador=1'
      return `/invitacion/${token}`
    }
    const codigo = codigoValido(request.cookies.get(COOKIE_REFERIDO)?.value)
      ?? codigoValido(typeof meta.codigo_referido === 'string' ? meta.codigo_referido : null)
    if (codigo) await supabase.rpc('canjear_referido', { p_codigo: codigo })
  } catch { /* no bloquea la confirmación */ }
  return undefined
}

/**
 * Redirección final. Orden: lo que fije Embajadores; el `next` del enlace;
 * la cookie de vuelta del registro (mismo navegador); el `next` guardado en la
 * cuenta al registrarse (otro aparato); y, si no hay nada, `porDefecto`.
 * Las cookies de vuelta y de referido se borran: sirven una vez.
 */
export function redirigirTrasConfirmar(
  request: NextRequest,
  origin: string,
  opciones: { forzado?: string; next?: string | null; metaNext?: unknown; porDefecto: string },
): NextResponse {
  const destino = opciones.forzado
    ?? destinoValido(opciones.next)
    ?? safeNextPath(request.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)?.value)
    ?? destinoValido(typeof opciones.metaNext === 'string' ? opciones.metaNext : null)
    ?? opciones.porDefecto
  const respuesta = NextResponse.redirect(`${origin}${destino}`)
  respuesta.cookies.delete(NEXT_TRAS_REGISTRO_COOKIE)
  respuesta.cookies.delete(COOKIE_REFERIDO)
  return respuesta
}

/** Pantalla de resultado cuando no se puede entrar directamente. */
export type EstadoConfirmacion = 'confirmada' | 'enlace'
export function urlResultado(origin: string, estado: EstadoConfirmacion): string {
  return `${origin}/auth/confirmada?estado=${estado}`
}

/**
 * ¿El code verifier PKCE guardado en este navegador es de una recuperación de
 * contraseña? auth-js lo guarda como «<verifier>/recovery» en la cookie
 * sb-<ref>-auth-token-code-verifier (a veces en base64 con prefijo «base64-»
 * y en trozos .0, .1…). Se lee ANTES del intercambio, que la borra.
 */
export function verifierEsDeRecuperacion(request: NextRequest): boolean {
  const trozos = request.cookies.getAll()
    .filter(c => /-auth-token-code-verifier(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (trozos.length === 0) return false
  let valor = trozos.map(c => c.value).join('')
  if (valor.startsWith('base64-')) {
    try {
      valor = Buffer.from(valor.slice('base64-'.length), 'base64url').toString('utf8')
    } catch { return false }
  }
  try { valor = decodeURIComponent(valor) } catch { /* tal cual */ }
  return /\/recovery"?$/.test(valor.trim())
}
