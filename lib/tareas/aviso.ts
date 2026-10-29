/**
 * Aviso por correo al asignar una tarea a otra persona del equipo. Sale de
 * no-reply@obrasdeteatro.com con el título, la prioridad y el enlace a la
 * tarea; nunca el contenido del origen (por ejemplo, un correo recibido).
 * Nunca lanza: si falla, la tarea ya está creada y se avisa en pantalla.
 */

import { ETIQUETA_PRIORIDAD, type Prioridad } from './tareas'

export const REMITENTE_TAREAS = 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>'
export const SITIO = 'https://www.obrasdeteatro.com'

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export type AvisoAsignacion = { para: string; nombre: string; tareaId: string; titulo: string; prioridad: Prioridad; fechaLimite: string | null }

export function correoAsignacion(a: AvisoAsignacion) {
  const enlace = `${SITIO}/admin/tareas/${a.tareaId}`
  const prioridad = ETIQUETA_PRIORIDAD[a.prioridad]
  const fecha = a.fechaLimite
    ? new Date(`${a.fechaLimite}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null
  const subject = `${a.prioridad === 'urgente' ? '[Urgente] ' : ''}Tarea asignada: ${a.titulo}`.slice(0, 250)
  const text = [
    `Hola${a.nombre ? `, ${a.nombre}` : ''}:`,
    '',
    'Te han asignado una tarea en el Master Control de ObrasDeTeatro.',
    '',
    `Tarea: ${a.titulo}`,
    `Prioridad: ${prioridad}`,
    ...(fecha ? [`Fecha límite: ${fecha}`] : []),
    '',
    `Ver la tarea: ${enlace}`,
  ].join('\n')
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;max-width:560px">
<p>Hola${a.nombre ? `, ${esc(a.nombre)}` : ''}:</p>
<p>Te han asignado una tarea en el Master Control de ObrasDeTeatro.</p>
<p style="margin:16px 0;padding:12px 16px;background:#f4f4f4;border-radius:8px"><strong>${esc(a.titulo)}</strong><br>Prioridad: ${esc(prioridad)}${fecha ? `<br>Fecha límite: ${esc(fecha)}` : ''}</p>
<p><a href="${enlace}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Ver la tarea</a></p>
<p style="font-size:12px;color:#6b6b6b">Correo automático: no respondas a este mensaje.</p>
</div>`
  return { from: REMITENTE_TAREAS, to: a.para, subject, text, html }
}

export async function enviarAvisoAsignacion(a: AvisoAsignacion, fetcher: typeof fetch = fetch): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('tareas: falta RESEND_API_KEY'); return false }
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(correoAsignacion(a)),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) console.error('tareas: Resend respondió', res.status)
    return res.ok
  } catch (e) {
    console.error('tareas: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}
