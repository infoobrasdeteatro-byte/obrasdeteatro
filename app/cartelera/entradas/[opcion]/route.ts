import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enlaceAfiliado, leerConfigAfiliados } from '@/lib/cartelera/afiliados'
import { detectarProveedor } from '@/lib/cartelera/cartelera'

/**
 * «Comprar entradas»: anota el clic (rpc registrar_clic_compra, también sin
 * sesión, solo de espectáculos publicados) y redirige a la ticketera, con el
 * enlace de afiliado si ese proveedor está configurado en CARTELERA_AFILIADOS.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ opcion: string }> }) {
  const { opcion } = await params
  const volver = new URL('/cartelera', req.url)
  if (!/^[0-9a-f-]{36}$/i.test(opcion)) return NextResponse.redirect(volver)

  // Los robots (vista previa de enlaces, buscadores) no cuentan como clic.
  const ua = req.headers.get('user-agent') ?? ''
  const robot = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram/i.test(ua)

  const supabase = await createClient()
  let url: string | null = null
  if (robot) {
    const { data } = await supabase.from('opciones_compra').select('url').eq('id', opcion).maybeSingle()
    url = data?.url ?? null
  } else {
    const { data } = await supabase.rpc('registrar_clic_compra', { p_opcion: opcion })
    url = data ?? null
  }
  if (!url || !/^https?:\/\//i.test(url)) return NextResponse.redirect(volver)

  const destino = enlaceAfiliado(url, detectarProveedor(url), leerConfigAfiliados(process.env.CARTELERA_AFILIADOS))
  const res = NextResponse.redirect(destino, 302)
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}
