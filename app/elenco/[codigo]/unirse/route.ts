import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { COOKIE_ELENCO, ELENCO_MAX_AGE_S, leerCodigoElenco, leerNumero } from '@/lib/elenco/textos'
import { COOKIE_REFERIDO } from '@/lib/embajadores/textos'
import { codigoDeEnlaceAntiguo } from '@/lib/elenco/enlace-antiguo'

/**
 * Elección en /elenco/<código>: guarda el código del fundador en una cookie
 * (30 días) y lleva al registro o a Espacios Escénicos (salas).
 * - Primer enlace: si ya hay una cookie de otro fundador, no se sustituye.
 * - Con la sesión abierta no se atribuye nada: vuelve a la página.
 * La atribución se hace al crear la cuenta (app/api/auth/registro).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const segmento = decodificar((await params).codigo)
  const codigo = (await codigoDeEnlaceAntiguo(segmento)) ?? leerCodigoElenco(segmento)
  if (!codigo) return NextResponse.redirect(new URL('/auth/registro', request.url))

  const supabase = await createClient()
  const [{ data: { user } }, { data: fundador }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('elenco_fundador_por_codigo', { p_codigo: codigo }),
  ])
  if (user || !fundador?.length) return NextResponse.redirect(new URL(`/elenco/${codigo}`, request.url))

  const como = request.nextUrl.searchParams.get('como')
  let destino: URL
  if (como === 'sala') {
    destino = new URL('/espacios', request.url)
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80)
    if (q) destino.searchParams.set('q', q)
  } else {
    destino = new URL('/auth/registro', request.url)
    destino.searchParams.set('elenco', codigo)
    destino.searchParams.set('tipo', como === 'organizacion' ? 'organizacion' : 'profesional')
  }

  const respuesta = NextResponse.redirect(destino)
  // Cada alta cuenta para un solo programa: manda el último enlace (si antes
  // pasó por el de un embajador, ese deja de contar).
  respuesta.cookies.delete(COOKIE_REFERIDO)
  const previa = request.cookies.get(COOKIE_ELENCO)?.value
  if (!leerCodigoElenco(previa) && !leerNumero(previa)) {
    respuesta.cookies.set(COOKIE_ELENCO, codigo, {
      maxAge: ELENCO_MAX_AGE_S, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
    })
  }
  return respuesta
}

/** Segmento de la URL tal cual o decodificado («Garc%C3%ADa» → «García»). */
function decodificar(v: string): string {
  try { return decodeURIComponent(v) } catch { return v }
}
