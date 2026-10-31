'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarAviso } from '@/lib/perfiles/verificacion-servidor'
import { MAX_MENSAJE_SOLICITUD } from '@/lib/red/contacto'

const SITIO = 'https://www.obrasdeteatro.com'

type Resultado = { ok: boolean; estado?: string; error?: string }

/** Nombre visible y correo de cuenta de un perfil (el correo solo lo lee el servidor). */
async function datosAviso(id: string): Promise<{ nombre: string; email: string | null; slug: string | null }> {
  const { data } = await createServiceClient()
    .from('profiles').select('nombre, apellidos, nombre_artistico, email, slug').eq('id', id).maybeSingle()
  const nombre = data?.nombre_artistico?.trim() || [data?.nombre, data?.apellidos].filter(Boolean).join(' ').trim() || 'Un usuario'
  return { nombre, email: data?.email ?? null, slug: data?.slug ?? null }
}

export async function solicitarContacto(perfilId: string, mensaje: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión para solicitar el contacto.' }

  const texto = mensaje.trim().slice(0, MAX_MENSAJE_SOLICITUD)
  const { data: estado, error } = await supabase.rpc('solicitar_contacto', { p_perfil: perfilId, p_mensaje: texto || null })
  if (error) return { ok: false, error: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' }
  if (estado === 'limite') return { ok: false, error: 'Has enviado muchas solicitudes hoy. Vuelve a intentarlo mañana.' }
  if (estado === 'no_disponible') return { ok: false, error: 'Este perfil no admite solicitudes ahora mismo.' }

  if (estado === 'nueva') {
    const [yo, destino] = await Promise.all([datosAviso(user.id), datosAviso(perfilId)])
    if (destino.email) {
      await enviarAviso(
        destino.email,
        `${yo.nombre} quiere tu contacto en ObrasDeTeatro®`,
        [
          `Hola, ${destino.nombre}:`,
          `${yo.nombre} te ha pedido tu teléfono y tu WhatsApp a través de tu perfil en ObrasDeTeatro®.`,
          ...(texto ? [`Su mensaje:\n«${texto}»`] : []),
          ...(yo.slug ? [`Puedes ver su perfil aquí: ${SITIO}/perfil/${yo.slug}`] : []),
          `Tú decides: acepta o rechaza la solicitud en Mi red: ${SITIO}/perfil/red\nSi la rechazas, no se le avisa.`,
        ].join('\n\n'),
      )
    }
  }

  revalidatePath('/perfil/red')
  return { ok: true, estado: 'pendiente' }
}

export async function cancelarSolicitudContacto(perfilId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancelar_solicitud_contacto', { p_perfil: perfilId })
  if (error) return { ok: false, error: 'No se pudo retirar la solicitud.' }
  revalidatePath('/perfil/red')
  return { ok: true, estado: 'ninguna' }
}

export async function responderSolicitudContacto(id: string, aceptar: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión.' }

  // Estado previo, para avisar solo cuando se acepta por primera vez.
  const { data: previa } = await supabase.from('solicitudes_contacto').select('estado, solicitante').eq('id', id).maybeSingle()
  const { data: hecho, error } = await supabase.rpc('responder_solicitud_contacto', { p_id: id, p_aceptar: aceptar })
  if (error || !hecho) return { ok: false, error: 'No se pudo guardar tu respuesta.' }

  if (aceptar && previa && previa.estado !== 'aceptada') {
    const [yo, quien] = await Promise.all([datosAviso(user.id), datosAviso(previa.solicitante)])
    if (quien.email) {
      await enviarAviso(
        quien.email,
        `${yo.nombre} ha compartido su contacto contigo`,
        [
          `Hola, ${quien.nombre}:`,
          `${yo.nombre} ha aceptado tu solicitud en ObrasDeTeatro®. Ya puedes ver su teléfono y su WhatsApp en su perfil${yo.slug ? `: ${SITIO}/perfil/${yo.slug}` : '.'}`,
          `También los tienes en Mi red: ${SITIO}/perfil/red`,
        ].join('\n\n'),
      )
    }
  }

  revalidatePath('/perfil/red')
  return { ok: true, estado: aceptar ? 'aceptada' : 'rechazada' }
}

// ── Fase 2: conexiones ──────────────────────────────────────────────────────

async function avisarConexionAceptada(quienAcepta: string, quienPidio: string) {
  const [yo, otro] = await Promise.all([datosAviso(quienAcepta), datosAviso(quienPidio)])
  if (!otro.email) return
  await enviarAviso(
    otro.email,
    `${yo.nombre} y tú ya están conectados en ObrasDeTeatro®`,
    [
      `Hola, ${otro.nombre}:`,
      `${yo.nombre} ha aceptado tu conexión en ObrasDeTeatro®.${yo.slug ? ` Su perfil: ${SITIO}/perfil/${yo.slug}` : ''}`,
      `Tus conexiones están en Mi red: ${SITIO}/perfil/red`,
    ].join('\n\n'),
  )
}

export async function solicitarConexion(perfilId: string, mensaje: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión para conectar.' }

  const texto = mensaje.trim().slice(0, MAX_MENSAJE_SOLICITUD)
  const { data: estado, error } = await supabase.rpc('solicitar_conexion', { p_perfil: perfilId, p_mensaje: texto || null })
  if (error) return { ok: false, error: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' }
  if (estado === 'limite') return { ok: false, error: 'Has enviado muchas solicitudes hoy. Vuelve a intentarlo mañana.' }
  if (estado === 'no_disponible') return { ok: false, error: 'Este perfil no admite conexiones ahora mismo.' }

  if (estado === 'nueva') {
    const [yo, destino] = await Promise.all([datosAviso(user.id), datosAviso(perfilId)])
    if (destino.email) {
      await enviarAviso(
        destino.email,
        `${yo.nombre} quiere conectar contigo en ObrasDeTeatro®`,
        [
          `Hola, ${destino.nombre}:`,
          `${yo.nombre} quiere añadirte a su red profesional en ObrasDeTeatro®.`,
          ...(texto ? [`Su mensaje:\n«${texto}»`] : []),
          ...(yo.slug ? [`Puedes ver su perfil aquí: ${SITIO}/perfil/${yo.slug}`] : []),
          `Acepta o rechaza la solicitud en Mi red: ${SITIO}/perfil/red\nSi la rechazas, no se le avisa. Conectar no comparte tu teléfono ni tu WhatsApp.`,
        ].join('\n\n'),
      )
    }
  }
  if (estado === 'aceptada') await avisarConexionAceptada(user.id, perfilId)

  revalidatePath('/perfil/red')
  return { ok: true, estado: estado === 'aceptada' ? 'conectados' : 'enviada' }
}

export async function responderConexion(id: string, aceptar: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión.' }

  const { data: previa } = await supabase.from('conexiones').select('solicitante').eq('id', id).maybeSingle()
  const { data: hecho, error } = await supabase.rpc('responder_conexion', { p_id: id, p_aceptar: aceptar })
  if (error || !hecho) return { ok: false, error: 'No se pudo guardar tu respuesta.' }
  if (aceptar && previa) await avisarConexionAceptada(user.id, previa.solicitante)

  revalidatePath('/perfil/red')
  return { ok: true, estado: aceptar ? 'conectados' : 'ninguna' }
}

export async function cancelarConexion(perfilId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancelar_conexion', { p_perfil: perfilId })
  if (error) return { ok: false, error: 'No se pudo retirar la solicitud.' }
  revalidatePath('/perfil/red')
  return { ok: true, estado: 'ninguna' }
}

export async function eliminarConexion(perfilId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('eliminar_conexion', { p_perfil: perfilId })
  if (error) return { ok: false, error: 'No se pudo eliminar la conexión.' }
  revalidatePath('/perfil/red')
  return { ok: true, estado: 'ninguna' }
}
