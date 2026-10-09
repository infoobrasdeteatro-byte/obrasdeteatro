import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validarMensajeReclamacion } from '@/lib/espacios/espacios'
import { enviarAvisoReclamacion } from '@/lib/espacios/aviso-reclamacion'

/**
 * POST /api/espacios/reclamaciones — «¿Gestionas este espacio? Reclámalo».
 *
 * Cuerpo JSON: { espacio_id, mensaje }. Con la sesión del usuario, nunca con
 * la clave de servicio: la política «Usuario crea su reclamación» exige que
 * profile_id sea el suyo, que nazca pendiente y que el espacio esté
 * publicado. El índice único parcial impide una segunda pendiente para el
 * mismo espacio (23505 → 409).
 *
 * Después avisa por correo a moderación. Si el correo falla, la reclamación
 * ya está guardada y aparece en /admin/espacios: se registra el fallo y se
 * responde igualmente que se ha recibido.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para reclamar la ficha.' }, { status: 401 })

  let cuerpo: { espacio_id?: unknown; mensaje?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 })
  }

  const espacioId = typeof cuerpo.espacio_id === 'string' && UUID.test(cuerpo.espacio_id) ? cuerpo.espacio_id : null
  if (!espacioId) return NextResponse.json({ error: 'Espacio no válido.' }, { status: 400 })
  const problema = validarMensajeReclamacion(cuerpo.mensaje)
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })
  const mensaje = (cuerpo.mensaje as string).trim()

  const { data: espacio } = await supabase
    .from('espacios_escenicos')
    .select('id, nombre, slug, municipio')
    .eq('id', espacioId)
    .eq('estado', 'publicado')
    .maybeSingle()
  if (!espacio) return NextResponse.json({ error: 'Ese espacio no existe o no está publicado.' }, { status: 404 })

  const { error } = await supabase
    .from('espacios_reclamaciones')
    .insert({ espacio_id: espacio.id, profile_id: user.id, mensaje })
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya tienes una reclamación pendiente para este espacio. Te escribiremos al revisarla.' }, { status: 409 })
    }
    console.error('espacios/reclamaciones: no se pudo guardar:', error.message)
    return NextResponse.json({ error: 'No se pudo enviar la reclamación. Inténtalo de nuevo.' }, { status: 500 })
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellidos, nombre_artistico')
    .eq('id', user.id)
    .maybeSingle()
  const nombre = perfil
    ? perfil.nombre_artistico || [perfil.nombre, perfil.apellidos].filter(Boolean).join(' ')
    : ''
  const solicitante = [nombre, user.email].filter(Boolean).join(' · ') || user.id

  const envio = await enviarAvisoReclamacion({
    espacioNombre: espacio.nombre,
    espacioSlug: espacio.slug,
    municipio: espacio.municipio,
    solicitante,
    mensaje,
  })
  if (!envio.ok) console.error('espacios/reclamaciones: aviso no enviado:', envio.error)

  return NextResponse.json({ ok: true }, { status: 201 })
}
