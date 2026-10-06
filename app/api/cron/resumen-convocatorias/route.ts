import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { construirHtml, enviarResumen, type PendienteResumen } from '@/lib/convocatorias/resumen-semanal'

/**
 * GET /api/cron/resumen-convocatorias — resumen semanal de moderación.
 *
 * Lo llama el cron de Vercel los lunes a las 08:00 UTC (vercel.json). Vercel
 * envía `Authorization: Bearer <CRON_SECRET>`; sin la variable, o con otro
 * valor, 401 sin más detalle.
 *
 * Qué hace:
 *   - lee, con la clave de servicio, las convocatorias en pendiente_revision
 *     cuyo plazo no ha vencido (las vencidas las cierra el cron de la base);
 *   - cuenta las BDNS publicadas automáticamente en los últimos 7 días (las
 *     que nunca entraron en la cola: moderacion_entrada_at nulo);
 *   - si no hay ninguna pendiente, no envía nada;
 *   - si las hay, envía un correo con botones «Aprobar» y «Rechazar». Cada
 *     botón lleva un token firmado y abre una página de confirmación: el GET
 *     del enlace no cambia nada.
 */

const MAX_EN_CORREO = 50
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto || !cabecera) return false
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${secreto}`, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!autorizado(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const ahora = new Date()
  const ahoraIso = ahora.toISOString()

  const [pendientes, bdns] = await Promise.all([
    supabase
      .from('calls')
      .select('id, title, description, origen, lote, pais_code, ciudad, location, entidad_convocante, deadline, prize, url_bases, fuente_dominio')
      .eq('estado', 'pendiente_revision')
      .is('deleted_at', null)
      .or(`deadline.is.null,deadline.gt.${ahoraIso}`)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(MAX_EN_CORREO),
    supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('origen', 'redaccion')
      .like('lote', 'BDNS-%')
      .is('moderacion_entrada_at', null)
      .gte('fecha_publicacion', new Date(ahora.getTime() - SEMANA_MS).toISOString()),
  ])

  if (pendientes.error || bdns.error) {
    console.error('cron/resumen-convocatorias: no se pudo leer:', (pendientes.error ?? bdns.error)?.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const lista = (pendientes.data ?? []) as PendienteResumen[]
  const autopublicadas = bdns.count ?? 0

  if (lista.length === 0) {
    return NextResponse.json({ enviado: false, pendientes: 0, bdns_autopublicadas: autopublicadas })
  }

  let html: string
  try {
    html = construirHtml(lista, autopublicadas, ahora)
  } catch (e) {
    console.error('cron/resumen-convocatorias:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const envio = await enviarResumen(html, lista.length)
  if (!envio.ok) {
    console.error('cron/resumen-convocatorias: no se pudo enviar:', envio.error)
    return NextResponse.json({ error: 'No se pudo enviar el resumen' }, { status: 502 })
  }

  return NextResponse.json({ enviado: true, pendientes: lista.length, bdns_autopublicadas: autopublicadas })
}
