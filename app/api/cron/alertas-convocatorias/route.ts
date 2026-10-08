import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import {
  PLANES_CON_ALERTAS,
  REMITENTE,
  asunto,
  coincidencias,
  construirHtml,
  crearTokenBaja,
  desdeDe,
  enlaceBajaUnClic,
  tocaEnvio,
  type Alerta,
  type ConvocatoriaAlerta,
} from '@/lib/alertas/alertas'

/**
 * GET /api/cron/alertas-convocatorias — alertas de convocatorias por correo.
 *
 * Cron diario de Vercel a las 07:30 UTC (vercel.json; el plan Hobby solo
 * admite crons diarios). Protegido con CRON_SECRET como el resumen semanal.
 *
 * Para cada alerta activa de un usuario con plan de pago, si toca (diaria, o
 * semanal los lunes), busca las convocatorias publicadas desde su último
 * envío (o desde hace 7 días la primera vez), de sus países y categorías y
 * con plazo no vencido. Con al menos una, envía UN correo (máx. 20, por plazo
 * más próximo); sin ninguna, nada. ultimo_envio_at solo avanza tras un envío
 * correcto: si Resend falla, la próxima vez se vuelve a intentar con la misma
 * ventana.
 *
 * Todo con la clave de servicio: las alertas y los correos de los usuarios no
 * se leen con ninguna sesión.
 */

const PAUSA_ENTRE_ENVIOS_MS = 600 // Resend admite unas pocas peticiones por segundo.
const MAX_CONVOCATORIAS_LEIDAS = 1000
const VENTANA_MAXIMA_MS = 31 * 24 * 60 * 60 * 1000

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto || !cabecera) return false
  const a = createHash('sha256').update(cabecera, 'utf8').digest()
  const b = createHash('sha256').update(`Bearer ${secreto}`, 'utf8').digest()
  return timingSafeEqual(a, b)
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  if (!autorizado(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY || !process.env.ALERTAS_CONVOCATORIAS_SECRET) {
    console.error('cron/alertas-convocatorias: faltan RESEND_API_KEY o ALERTAS_CONVOCATORIAS_SECRET')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const ahora = new Date()

  // 1. Alertas activas a las que toca envío hoy.
  const { data: alertas, error: errAlertas } = await supabase
    .from('alertas_convocatorias')
    .select('profile_id, activa, paises, categorias, frecuencia, ultimo_envio_at')
    .eq('activa', true)
  if (errAlertas) {
    console.error('cron/alertas-convocatorias: no se pudieron leer las alertas:', errAlertas.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
  const tocan = (alertas ?? []).filter(a => tocaEnvio(a, ahora)) as Alerta[]
  const resumen = { alertas_activas: alertas?.length ?? 0, toca: tocan.length, sin_plan: 0, sin_resultados: 0, enviados: 0, errores: 0 }
  if (tocan.length === 0) return NextResponse.json(resumen)

  // 2. Solo usuarios con plan de pago, activos y con correo.
  const { data: perfiles, error: errPerfiles } = await supabase
    .from('profiles')
    .select('id, email, plan')
    .in('id', tocan.map(a => a.profile_id))
    .eq('activo', true)
    .is('deleted_at', null)
    .is('extincion_solicitada_at', null)
  if (errPerfiles) {
    console.error('cron/alertas-convocatorias: no se pudieron leer los perfiles:', errPerfiles.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
  const correoDe = new Map(
    (perfiles ?? [])
      .filter(p => PLANES_CON_ALERTAS.has(p.plan) && typeof p.email === 'string' && p.email.includes('@'))
      .map(p => [p.id, p.email as string]),
  )
  const conPlan = tocan.filter(a => correoDe.has(a.profile_id))
  resumen.sin_plan = tocan.length - conPlan.length
  if (conPlan.length === 0) return NextResponse.json(resumen)

  // 3. Las convocatorias candidatas, una sola vez para todas las alertas.
  // Desde la ventana más antigua de las alertas que tocan, con un tope de 31
  // días por si alguna lleva mucho sin enviarse.
  const desdeMasAntiguo = Math.max(
    Math.min(...conPlan.map(a => desdeDe(a, ahora).getTime())),
    ahora.getTime() - VENTANA_MAXIMA_MS,
  )
  const { data: convocatorias, error: errCalls } = await supabase
    .from('calls')
    .select('id, title, entidad_convocante, pais_code, location, category, deadline, fecha_publicacion')
    .eq('estado', 'publicado')
    .is('deleted_at', null)
    .gt('fecha_publicacion', new Date(desdeMasAntiguo).toISOString())
    .or(`deadline.is.null,deadline.gt.${ahora.toISOString()}`)
    .order('fecha_publicacion', { ascending: false })
    .limit(MAX_CONVOCATORIAS_LEIDAS)
  if (errCalls) {
    console.error('cron/alertas-convocatorias: no se pudieron leer las convocatorias:', errCalls.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
  const candidatas = (convocatorias ?? []) as ConvocatoriaAlerta[]

  // 4. Un correo por alerta con resultados.
  for (const alerta of conPlan) {
    const lista = coincidencias(alerta, candidatas, desdeDe(alerta, ahora), ahora)
    if (lista.length === 0) { resumen.sin_resultados++; continue }

    const token = crearTokenBaja(alerta.profile_id)!
    const ok = await enviar(correoDe.get(alerta.profile_id)!, lista.length, construirHtml(alerta, lista, token), token)
    if (!ok) { resumen.errores++; continue }

    const { error: errUpd } = await supabase
      .from('alertas_convocatorias')
      .update({ ultimo_envio_at: ahora.toISOString() })
      .eq('profile_id', alerta.profile_id)
    if (errUpd) console.error('cron/alertas-convocatorias: enviado, pero no se pudo guardar ultimo_envio_at:', errUpd.message)
    resumen.enviados++
    await esperar(PAUSA_ENTRE_ENVIOS_MS)
  }

  return NextResponse.json(resumen)
}

/**
 * Envía por Resend. Incluye List-Unsubscribe con POST de un clic (RFC 8058):
 * Gmail y Outlook muestran «Cancelar suscripción» y llaman a la ruta de baja
 * sin abrir ninguna página. Nunca lanza: devuelve si salió bien.
 */
async function enviar(para: string, total: number, html: string, token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: REMITENTE,
        to: para,
        subject: asunto(total),
        html,
        headers: {
          'List-Unsubscribe': `<${enlaceBajaUnClic(token)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })
    if (!res.ok) console.error('cron/alertas-convocatorias: Resend respondió', res.status)
    return res.ok
  } catch (e) {
    console.error('cron/alertas-convocatorias: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}

