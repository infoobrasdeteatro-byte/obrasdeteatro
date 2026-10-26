import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_REFERIDO, REFERIDO_MAX_AGE_S, SITIO, VISTA_PREVIA_REFERIDO, codigoValido } from '@/lib/embajadores/textos'

/** Lectores de enlaces de apps de mensajería y redes: reciben la vista previa en vez de la redirección. */
const LECTOR_DE_ENLACES = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview|Applebot|Pinterest|redditbot|Googlebot/i

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function vistaPrevia(url: string): NextResponse {
  const { titulo, descripcion } = VISTA_PREVIA_REFERIDO
  const imagen = `${SITIO}/opengraph-image.png`
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}"><meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="ObrasDeTeatro®">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${imagen}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${SITIO}/auth/registro?invitado=1"></head><body></body></html>`
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

/**
 * Enlace personal de un/a Embajador/a de Escena: guarda el código en una
 * cookie y lleva al registro. El mes de Premium se concede al confirmar el
 * correo (app/auth/callback), con las reglas de canjear_referido.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const valido = codigoValido(codigo)
  if (valido && LECTOR_DE_ENLACES.test(request.headers.get('user-agent') ?? '')) {
    return vistaPrevia(`${SITIO}/r/${valido}`)
  }
  const respuesta = NextResponse.redirect(new URL(valido ? '/auth/registro?invitado=1' : '/auth/registro', request.url))
  if (valido) {
    respuesta.cookies.set(COOKIE_REFERIDO, valido, {
      maxAge: REFERIDO_MAX_AGE_S, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
    })
  }
  return respuesta
}
