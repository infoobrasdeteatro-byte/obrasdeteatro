import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CAMPO_TRAMPA, validarSugerencia } from '@/lib/espacios/espacios'
import { enviarAvisoSugerencia } from '@/lib/espacios/aviso-reclamacion'
import { hashIp, ipDeLaPeticion } from '@/lib/espacios/ip'

/**
 * POST /api/espacios/sugerencias — «Sugerir una corrección» de una ficha.
 *
 * Abierto a cualquiera, con o sin sesión. Cuerpo JSON:
 * { espacio_id, texto, email?, sitio_web } (sitio_web es el campo trampa).
 *
 * Inserta con la clave de servicio: es el único camino para escribir en
 * espacios_sugerencias, porque aquí se calcula el hash de la IP y nadie
 * puede falsearlo desde el navegador. Si hay sesión, se guarda el perfil.
 *
 * Antispam:
 *   - campo trampa relleno → se responde como si se hubiera guardado y no se
 *     guarda nada (el robot no aprende a esquivarlo);
 *   - 3 por hora por hash de IP → el trigger lanza «limite_sugerencias» → 429;
 *   - si una regla de moderacion_reglas casa con el texto, el trigger la deja
 *     descartada; se responde igual y no se avisa a moderación.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RECIBIDA = { ok: true }

export async function POST(req: NextRequest) {
  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 })
  }
  if (!cuerpo || typeof cuerpo !== 'object') return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 })

  const trampa = cuerpo[CAMPO_TRAMPA]
  if (typeof trampa === 'string' && trampa.trim() !== '') return NextResponse.json(RECIBIDA, { status: 201 })

  const espacioId = typeof cuerpo.espacio_id === 'string' && UUID.test(cuerpo.espacio_id) ? cuerpo.espacio_id : null
  if (!espacioId) return NextResponse.json({ error: 'Espacio no válido.' }, { status: 400 })
  const problema = validarSugerencia(cuerpo.texto, cuerpo.email)
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })
  const texto = (cuerpo.texto as string).trim()
  const email = typeof cuerpo.email === 'string' && cuerpo.email.trim() !== '' ? cuerpo.email.trim() : null

  const { data: { user } } = await (await createClient()).auth.getUser()

  let ipHash: string
  try {
    ipHash = hashIp(ipDeLaPeticion(req.headers))
  } catch (e) {
    console.error('espacios/sugerencias:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'No se pudo enviar la sugerencia.' }, { status: 500 })
  }

  const servicio = createServiceClient()
  const { data: espacio } = await servicio
    .from('espacios_escenicos')
    .select('id, nombre, slug, municipio')
    .eq('id', espacioId)
    .eq('estado', 'publicado')
    .maybeSingle()
  if (!espacio) return NextResponse.json({ error: 'Ese espacio no existe o no está publicado.' }, { status: 404 })

  const { data: guardada, error } = await servicio
    .from('espacios_sugerencias')
    .insert({ espacio_id: espacio.id, texto, email, profile_id: user?.id ?? null, ip_hash: ipHash })
    .select('estado')
    .single()

  if (error) {
    if (error.message.includes('limite_sugerencias')) {
      return NextResponse.json({ error: 'Has enviado varias sugerencias seguidas. Inténtalo de nuevo dentro de una hora.' }, { status: 429 })
    }
    console.error('espacios/sugerencias: no se pudo guardar:', error.message)
    return NextResponse.json({ error: 'No se pudo enviar la sugerencia. Inténtalo de nuevo.' }, { status: 500 })
  }

  if (guardada?.estado === 'pendiente') {
    const envio = await enviarAvisoSugerencia({
      espacioNombre: espacio.nombre,
      espacioSlug: espacio.slug,
      municipio: espacio.municipio,
      remitente: [user?.email ? `Usuario ${user.email}` : 'Visitante sin sesión', email ? `responder a ${email}` : null].filter(Boolean).join(' · '),
      mensaje: texto,
    })
    if (!envio.ok) console.error('espacios/sugerencias: aviso no enviado:', envio.error)
  }

  return NextResponse.json(RECIBIDA, { status: 201 })
}
