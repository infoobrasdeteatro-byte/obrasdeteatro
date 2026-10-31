import type { SupabaseClient } from '@supabase/supabase-js'
import { SITIO, distintivo, recompensaEscalon, type TipoFundador } from './textos'

/**
 * Aviso al fundador cada vez que sube de escalón. Las recompensas pendientes
 * de aviso son las filas de elenco_recompensas con correo_enviado_at vacío;
 * solo se marcan tras un envío correcto (si Resend falla, se reintenta al día
 * siguiente).
 */
export const REMITENTE_ELENCO = 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>'

export type AvisoEscalon = { recompensaId: string; para: string; nombre: string; numero: number; tipo: TipoFundador; escalon: number; puntos: number }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function asuntoEscalon(a: Pick<AvisoEscalon, 'escalon'>): string {
  return a.escalon === 50 ? 'Eres Miembro de Honor del Elenco Fundador' : `Has llegado a ${a.escalon} puntos en el Elenco Fundador`
}

export function textoEscalon(a: AvisoEscalon): string {
  const nombre = a.nombre.trim().split(/\s+/)[0] || a.nombre
  return [
    `Hola ${nombre}:`,
    `Gracias a los colegas que se han unido con tu enlace, ya tienes ${a.puntos} puntos como ${distintivo(a.numero)}.`,
    `Tu recompensa por llegar a ${a.escalon} puntos: ${recompensaEscalon(a.escalon, a.tipo)}. Ya está aplicada en tu cuenta, sin tarjeta y sin cobros.`,
    `Puedes ver tu progreso en ${SITIO}/perfil/red`,
    'Gracias por construir con nosotros la casa del teatro en español.',
    'Renee Bausson\nObrasDeTeatro®',
  ].join('\n\n')
}

export function htmlEscalon(a: AvisoEscalon): string {
  const parrafos = textoEscalon(a).split('\n\n').map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1a1a1a">${esc(p).replace(/\n/g, '<br>')}</p>`)
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f7f5f2;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888">${esc(distintivo(a.numero))}</p>
${parrafos.join('\n')}
</div></body></html>`
}

/** Recompensas otorgadas que aún no se han avisado, con el correo del fundador. */
export async function avisosPendientes(servicio: SupabaseClient): Promise<AvisoEscalon[]> {
  const { data: rec, error } = await servicio.from('elenco_recompensas')
    .select('id, fundador_id, escalon, puntos').is('correo_enviado_at', null).order('otorgada_at').limit(200)
  if (error) throw new Error(`elenco: no se pudieron leer las recompensas: ${error.message}`)
  const filas = (rec ?? []) as { id: string; fundador_id: string; escalon: number; puntos: number }[]
  if (!filas.length) return []

  const { data: fund } = await servicio.from('elenco_fundadores').select('id, numero, tipo, aceptada_por')
    .in('id', [...new Set(filas.map(f => f.fundador_id))])
  const fundadores = new Map(((fund ?? []) as { id: string; numero: number; tipo: TipoFundador; aceptada_por: string | null }[]).map(f => [f.id, f]))
  const perfilesIds = [...fundadores.values()].map(f => f.aceptada_por).filter((x): x is string => !!x)
  const { data: perf } = perfilesIds.length
    ? await servicio.from('profiles').select('id, email, nombre, nombre_artistico').in('id', perfilesIds)
    : { data: [] }
  const perfiles = new Map(((perf ?? []) as { id: string; email: string | null; nombre: string | null; nombre_artistico: string | null }[]).map(p => [p.id, p]))

  const avisos: AvisoEscalon[] = []
  for (const r of filas) {
    const f = fundadores.get(r.fundador_id)
    const p = f?.aceptada_por ? perfiles.get(f.aceptada_por) : undefined
    if (!f || !p?.email?.trim()) continue
    avisos.push({
      recompensaId: r.id, para: p.email.trim(), nombre: p.nombre_artistico?.trim() || p.nombre?.trim() || '',
      numero: f.numero, tipo: f.tipo, escalon: r.escalon, puntos: r.puntos,
    })
  }
  return avisos
}

/** Envía un aviso por Resend. Nunca lanza. */
export async function enviarAviso(a: AvisoEscalon, fetcher: typeof fetch = fetch): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('elenco: falta RESEND_API_KEY'); return false }
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMITENTE_ELENCO, to: a.para, subject: asuntoEscalon(a), html: htmlEscalon(a), text: textoEscalon(a) }),
    })
    if (!res.ok) console.error('elenco: Resend respondió', res.status)
    return res.ok
  } catch (e) {
    console.error('elenco: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}
