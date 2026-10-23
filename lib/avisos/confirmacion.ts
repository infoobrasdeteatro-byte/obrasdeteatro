/**
 * Recordatorio a las cuentas que no han confirmado su correo (octubre 2026).
 * El botón lleva a /auth/confirmar, donde se pide un enlace nuevo: un enlace
 * de confirmación en el propio correo caducaría antes de que lo abrieran.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { RESPONDER_A_AVISO_PERFIL, REMITENTE_AVISO_PERFIL } from './perfil-incompleto'

export const ASUNTO_CONFIRMACION = 'Confirma tu correo para activar tu cuenta en ObrasDeTeatro®'
export const URL_CONFIRMAR = 'https://www.obrasdeteatro.com/auth/confirmar'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const PARRAFOS = [
  'Te registraste en ObrasDeTeatro®, pero tu cuenta todavía no está activa: falta confirmar tu dirección de correo.',
  'El enlace que te enviamos entonces ya ha caducado, pero puedes pedir uno nuevo en un momento:',
]
const DESPUES = [
  'Escribe tu correo y te llegará al instante un enlace nuevo. Al pulsarlo, tu cuenta quedará activa y podrás completar tu perfil.',
  'Si no fuiste tú quien se registró, puedes ignorar este mensaje.',
]

export function htmlConfirmacion(nombre: string, email: string): string {
  const saludo = nombre.trim() ? `Hola, ${esc(nombre.trim())}:` : 'Hola:'
  const href = `${URL_CONFIRMAR}?email=${encodeURIComponent(email)}`
  const p = (t: string) => `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">${t}</p>`
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(ASUNTO_CONFIRMACION)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:20px 28px;background:#0a0a0a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:20px;color:#ffffff;">ObrasDeTeatro®</p>
      </td></tr>
      <tr><td style="padding:28px;">
        ${p(saludo)}
        ${PARRAFOS.map(t => p(esc(t))).join('\n        ')}
        <p style="margin:0 0 18px;"><a href="${esc(href)}" style="display:inline-block;background:#b91c1c;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;padding:12px 22px;text-decoration:none;">Confirmar mi correo</a></p>
        ${DESPUES.map(t => p(esc(t))).join('\n        ')}
        <p style="margin:22px 0 0;font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">Un saludo cordial,<br><br><strong style="color:#111827;">Renee Bausson</strong><br>Fundador de ObrasDeTeatro®<br><a href="https://www.obrasdeteatro.com" style="color:#b91c1c;">www.obrasdeteatro.com</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export function textoConfirmacion(nombre: string, email: string): string {
  const saludo = nombre.trim() ? `Hola, ${nombre.trim()}:` : 'Hola:'
  return [saludo, ...PARRAFOS, `Confirmar mi correo: ${URL_CONFIRMAR}?email=${encodeURIComponent(email)}`, ...DESPUES,
    'Un saludo cordial,\n\nRenee Bausson\nFundador de ObrasDeTeatro®\nwww.obrasdeteatro.com'].join('\n\n')
}

export type PendienteConfirmar = { id: string; nombre: string; email: string; registro: string }

/**
 * Cuentas activas, sin confirmar, que no son internas (@obrasdeteatro.com) ni
 * están excluidas a mano y que aún no han recibido el recordatorio.
 */
export async function cargarPendientesConfirmar(servicio: SupabaseClient): Promise<{ pendientes: PendienteConfirmar[]; yaEnviados: number }> {
  const sinConfirmar: { id: string; email: string; created_at: string }[] = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await servicio.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`recordatorio: no se pudieron leer las cuentas: ${error.message}`)
    for (const u of data.users) {
      if (!u.email_confirmed_at && u.email) sinConfirmar.push({ id: u.id, email: u.email, created_at: u.created_at })
    }
    if (data.users.length < 1000) break
  }
  const ids = sinConfirmar.map(u => u.id)
  if (ids.length === 0) return { pendientes: [], yaEnviados: 0 }

  const [perfiles, excluidos, enviados] = await Promise.all([
    servicio.from('profiles').select('id, nombre, apellidos, nombre_artistico')
      .in('id', ids).eq('activo', true).is('deleted_at', null).is('extincion_solicitada_at', null),
    servicio.from('avisos_perfil_excluidos').select('profile_id'),
    servicio.from('avisos_confirmacion_enviados').select('profile_id'),
  ])
  for (const r of [perfiles, excluidos, enviados]) {
    if (r.error) throw new Error(`recordatorio: no se pudieron leer los datos: ${r.error.message}`)
  }
  const fuera = new Set(((excluidos.data ?? []) as { profile_id: string }[]).map(r => r.profile_id))
  const yaEnviado = new Set(((enviados.data ?? []) as { profile_id: string }[]).map(r => r.profile_id))
  type P = { id: string; nombre: string | null; apellidos: string | null; nombre_artistico: string | null }
  const porId = new Map(((perfiles.data ?? []) as P[]).map(p => [p.id, p]))

  const pendientes: PendienteConfirmar[] = []
  let yaEnviados = 0
  for (const u of sinConfirmar) {
    const p = porId.get(u.id)
    if (!p || fuera.has(u.id) || /@obrasdeteatro\.com$/i.test(u.email)) continue
    if (yaEnviado.has(u.id)) { yaEnviados++; continue }
    pendientes.push({
      id: u.id,
      nombre: p.nombre_artistico?.trim() || [p.nombre, p.apellidos].filter(Boolean).join(' ').trim(),
      email: u.email,
      registro: u.created_at,
    })
  }
  pendientes.sort((a, b) => a.registro.localeCompare(b.registro))
  return { pendientes, yaEnviados }
}

type Correo = { para: string; nombre: string }

/** Hasta 100 por petición (lotes de Resend). Nunca lanza. */
export async function enviarLoteConfirmacion(correos: Correo[], fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!correos.length) return true
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('recordatorio: falta RESEND_API_KEY'); return false }
  try {
    const res = await fetcher('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(correos.map(c => ({
        from: REMITENTE_AVISO_PERFIL,
        reply_to: RESPONDER_A_AVISO_PERFIL,
        to: c.para,
        subject: ASUNTO_CONFIRMACION,
        html: htmlConfirmacion(c.nombre, c.para),
        text: textoConfirmacion(c.nombre, c.para),
      }))),
    })
    if (!res.ok) console.error('recordatorio: Resend respondió', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('recordatorio: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}
