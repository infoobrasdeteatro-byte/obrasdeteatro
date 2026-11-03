import type { SupabaseClient } from '@supabase/supabase-js'
import { SITIO, recompensaEmbajador, tituloEmbajador, tituloHonor, type Genero } from './textos'

/**
 * Aviso al embajador/a cada vez que sube de escalón. Las pendientes son las
 * filas de embajadores_recompensas con correo_enviado_at vacío; solo se
 * marcan tras un envío correcto (si Resend falla, se reintenta al día
 * siguiente). Mismo esquema que el aviso del Elenco Fundador.
 */
export const REMITENTE_EMBAJADORES = 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>'

export type AvisoEmbajador = {
  recompensaId: string; para: string; nombre: string; genero: Genero | null
  escalon: number; puntos: number; hasta: string | null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function asuntoEmbajador(a: Pick<AvisoEmbajador, 'escalon' | 'genero'>): string {
  return a.escalon === 25
    ? `Ya eres ${tituloHonor(a.genero)}`
    : `Has llegado a ${a.escalon} puntos como ${tituloEmbajador(a.genero)}`
}

export function textoEmbajador(a: AvisoEmbajador): string {
  const nombre = a.nombre.trim().split(/\s+/)[0] || a.nombre
  const finMembresia = a.escalon === 25 || !a.hasta || a.hasta.startsWith('infinity')
    ? 'Tu membresía Destacado ya no caduca: es para siempre.'
    : `Tu membresía Destacado llega ahora hasta el ${fecha(a.hasta)}.`
  return [
    `Hola ${nombre}:`,
    `Gracias a los colegas que se han unido con tu enlace, ya tienes ${a.puntos} puntos como ${tituloEmbajador(a.genero)}.`,
    `Tu recompensa por llegar a ${a.escalon} puntos: ${recompensaEmbajador(a.escalon, a.genero)}. ${finMembresia} Sin tarjeta y sin cobros.`,
    `Puedes ver tu progreso en ${SITIO}/perfil/centro`,
    'Gracias por construir con nosotros la casa del teatro en español.',
    'Renee Bausson\nObrasDeTeatro®',
  ].join('\n\n')
}

export function htmlEmbajador(a: AvisoEmbajador): string {
  const parrafos = textoEmbajador(a).split('\n\n').map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1a1a1a">${esc(p).replace(/\n/g, '<br>')}</p>`)
  const cabecera = a.escalon === 25 ? tituloHonor(a.genero) : tituloEmbajador(a.genero)
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f7f5f2;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888">${esc(cabecera)}</p>
${parrafos.join('\n')}
</div></body></html>`
}

/** Escalones otorgados que aún no se han avisado, con el correo del embajador. */
export async function avisosPendientesEmbajadores(servicio: SupabaseClient): Promise<AvisoEmbajador[]> {
  const { data: rec, error } = await servicio.from('embajadores_recompensas')
    .select('id, embajador_id, escalon, puntos').is('correo_enviado_at', null).order('otorgada_at').limit(200)
  if (error) throw new Error(`embajadores: no se pudieron leer las recompensas: ${error.message}`)
  const filas = (rec ?? []) as { id: string; embajador_id: string; escalon: number; puntos: number }[]
  if (!filas.length) return []

  const ids = [...new Set(filas.map(f => f.embajador_id))]
  const [{ data: mem }, { data: perf }] = await Promise.all([
    servicio.from('membresias_cortesia').select('profile_id, genero, hasta').in('profile_id', ids),
    servicio.from('profiles').select('id, email, nombre, nombre_artistico').in('id', ids),
  ])
  const membresias = new Map(((mem ?? []) as { profile_id: string; genero: Genero | null; hasta: string | null }[]).map(m => [m.profile_id, m]))
  const perfiles = new Map(((perf ?? []) as { id: string; email: string | null; nombre: string | null; nombre_artistico: string | null }[]).map(p => [p.id, p]))

  const avisos: AvisoEmbajador[] = []
  for (const r of filas) {
    const p = perfiles.get(r.embajador_id)
    if (!p?.email?.trim()) continue
    const m = membresias.get(r.embajador_id)
    avisos.push({
      recompensaId: r.id, para: p.email.trim(), nombre: p.nombre_artistico?.trim() || p.nombre?.trim() || '',
      genero: m?.genero ?? null, escalon: r.escalon, puntos: r.puntos, hasta: m?.hasta ?? null,
    })
  }
  return avisos
}

/** Envía un aviso por Resend. Nunca lanza. */
export async function enviarAvisoEmbajador(a: AvisoEmbajador, fetcher: typeof fetch = fetch): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('embajadores: falta RESEND_API_KEY'); return false }
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMITENTE_EMBAJADORES, to: a.para, subject: asuntoEmbajador(a), html: htmlEmbajador(a), text: textoEmbajador(a) }),
    })
    if (!res.ok) console.error('embajadores: Resend respondió', res.status)
    return res.ok
  } catch (e) {
    console.error('embajadores: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}
