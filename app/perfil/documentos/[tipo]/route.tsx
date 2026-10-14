import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { esPlanDePago } from '@/lib/perfil-multimedia/multimedia'
import { cargarDatosDocumento } from '@/lib/documentacion/datos'
import { imagenParaPdf } from '@/lib/documentacion/imagenes'
import { CvPdf, DossierPdf, type Opciones } from '@/lib/documentacion/pdf'
import { nombreArchivo } from '@/lib/documentacion/formato'

/**
 * GET /perfil/documentos/cv  y  /perfil/documentos/dossier — el CV y el
 * dossier artístico del usuario con sesión, en PDF (Bloque 8, planes de pago).
 *
 * Solo el documento propio: se lee con la sesión del usuario y nunca se
 * acepta un id de otro perfil. ?email=1 y ?telefono=1 deciden si el contacto
 * personal sale impreso (por defecto, no).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params
  if (tipo !== 'cv' && tipo !== 'dossier') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/auth/login?next=/perfil/bloque/8`, req.url))

  const d = await cargarDatosDocumento(supabase, user.id)
  if (!d) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  if (!esPlanDePago(d.plan)) return NextResponse.redirect(new URL('/precios', req.url))

  const q = req.nextUrl.searchParams
  const o: Opciones = { email: q.get('email') === '1', telefono: q.get('telefono') === '1' }

  try {
    let pdf: Buffer
    if (tipo === 'cv') {
      const avatar = await imagenParaPdf(d.avatarUrl, 400)
      pdf = await renderToBuffer(<CvPdf d={d} img={{ avatar }} o={o} />)
    } else {
      const [avatar, portada, fotos, proyectos] = await Promise.all([
        imagenParaPdf(d.avatarUrl, 600),
        imagenParaPdf(d.portadaUrl, 1600),
        Promise.all(d.fotos.map(f => imagenParaPdf(f.url, 900))),
        Promise.all(d.proyectos.map(p => imagenParaPdf(p.imagenUrl, 600))),
      ])
      pdf = await renderToBuffer(<DossierPdf d={d} img={{ avatar, portada, fotos, proyectos }} o={o} />)
    }
    const nombre = nombreArchivo(tipo, d.nombre)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${q.get('ver') === '1' ? 'inline' : 'attachment'}; filename="${nombre}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (e) {
    console.error('perfil/documentos: no se pudo generar el PDF:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'No se pudo generar el documento. Inténtalo de nuevo.' }, { status: 500 })
  }
}
