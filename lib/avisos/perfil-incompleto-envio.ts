import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ASUNTO_AVISO_PERFIL, REMITENTE_AVISO_PERFIL, RESPONDER_A_AVISO_PERFIL,
  construirHtmlAvisoPerfil, construirTextoAvisoPerfil, faltasDelPerfil, type Falta,
} from './perfil-incompleto'

export type DestinatarioAviso = {
  id: string
  nombre: string
  email: string
  tipo_perfil: string
  faltas: Falta[]
}

export type ResumenAviso = {
  pendientes: DestinatarioAviso[]
  yaEnviados: number
  sinVerificar: number
}

/**
 * Quién debe recibir el aviso: cuentas activas y verificadas (correo
 * confirmado), sin baja ni extinción, que no son del equipo, a las que les
 * falta algo y que aún no lo han recibido. Usa el cliente de servicio: el
 * correo de profiles no lo puede leer ninguna sesión.
 */
export async function cargarDestinatariosAviso(servicio: SupabaseClient): Promise<ResumenAviso> {
  const [perfiles, profesiones, equipo, enviados] = await Promise.all([
    servicio.from('profiles')
      .select('id, nombre, nombre_artistico, email, tipo_perfil, avatar_url, bio, ciudad, verificado')
      .eq('activo', true).is('deleted_at', null).is('extincion_solicitada_at', null)
      .order('created_at', { ascending: true }).limit(5000),
    servicio.from('profile_specialties').select('profile_id').limit(20000),
    servicio.from('profile_roles').select('profile_id').eq('role', 'admin'),
    servicio.from('avisos_perfil_enviados').select('profile_id'),
  ])
  for (const r of [perfiles, profesiones, equipo, enviados]) {
    if (r.error) throw new Error(`avisos: no se pudieron leer los datos: ${r.error.message}`)
  }

  const numProf = new Map<string, number>()
  for (const f of (profesiones.data ?? []) as { profile_id: string }[]) {
    numProf.set(f.profile_id, (numProf.get(f.profile_id) ?? 0) + 1)
  }
  const esEquipo = new Set(((equipo.data ?? []) as { profile_id: string }[]).map(r => r.profile_id))
  const yaEnviado = new Set(((enviados.data ?? []) as { profile_id: string }[]).map(r => r.profile_id))

  type Fila = { id: string; nombre: string | null; nombre_artistico: string | null; email: string | null; tipo_perfil: string; avatar_url: string | null; bio: string | null; ciudad: string | null; verificado: boolean }
  const pendientes: DestinatarioAviso[] = []
  let yaEnviados = 0
  let sinVerificar = 0
  for (const p of (perfiles.data ?? []) as Fila[]) {
    if (esEquipo.has(p.id)) continue
    const faltas = faltasDelPerfil({ tipo_perfil: p.tipo_perfil, avatar_url: p.avatar_url, bio: p.bio, ciudad: p.ciudad, num_profesiones: numProf.get(p.id) ?? 0 })
    if (faltas.length === 0) continue
    if (!p.verificado) { sinVerificar++; continue }
    if (yaEnviado.has(p.id)) { yaEnviados++; continue }
    if (!p.email?.trim()) continue
    pendientes.push({
      id: p.id,
      nombre: p.nombre_artistico?.trim() || p.nombre?.trim() || '',
      email: p.email.trim(),
      tipo_perfil: p.tipo_perfil,
      faltas,
    })
  }
  return { pendientes, yaEnviados, sinVerificar }
}

export type CorreoAviso = { para: string; nombre: string; tipo: string; faltas: Falta[] }

function cuerpo(c: CorreoAviso) {
  return {
    from: REMITENTE_AVISO_PERFIL,
    reply_to: RESPONDER_A_AVISO_PERFIL,
    to: c.para,
    subject: ASUNTO_AVISO_PERFIL,
    html: construirHtmlAvisoPerfil(c.nombre, c.tipo, c.faltas),
    text: construirTextoAvisoPerfil(c.nombre, c.tipo, c.faltas),
  }
}

/** Hasta 100 correos por petición (API de lotes de Resend). Nunca lanza. */
export async function enviarLoteAviso(correos: CorreoAviso[], fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!correos.length) return true
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('avisos: falta RESEND_API_KEY'); return false }
  try {
    const res = await fetcher('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(correos.map(cuerpo)),
    })
    if (!res.ok) console.error('avisos: Resend respondió', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('avisos: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}
