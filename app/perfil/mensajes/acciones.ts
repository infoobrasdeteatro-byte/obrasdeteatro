'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarAviso } from '@/lib/perfiles/verificacion-servidor'
import { MAX_MENSAJE, textoErrorEnvio } from '@/lib/mensajes/mensajes'

type Envio = { ok: true; conversacion: string } | { ok: false; error: string }

/** Envía un mensaje a un perfil (las reglas las aplica enviar_mensaje en la base). */
export async function enviarMensaje(perfilId: string, texto: string): Promise<Envio> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión para enviar mensajes.' }

  const limpio = texto.trim().slice(0, MAX_MENSAJE)
  if (!limpio) return { ok: false, error: textoErrorEnvio('vacio') }

  const { data, error } = await supabase.rpc('enviar_mensaje', { p_perfil: perfilId, p_texto: limpio })
  const fila = data?.[0]
  if (error || !fila) return { ok: false, error: textoErrorEnvio('error') }
  if (!fila.conversacion || (fila.resultado !== 'ok' && fila.resultado !== 'nueva')) {
    return { ok: false, error: textoErrorEnvio(fila.resultado) }
  }

  // Aviso por correo: como mucho uno cada 6 h por conversación (lo decide la base).
  const { data: destino } = await supabase.rpc('reclamar_aviso_mensaje', { p_conversacion: fila.conversacion })
  if (destino) await avisarMensaje(user.id, destino, fila.conversacion, limpio)

  revalidatePath('/perfil/mensajes')
  return { ok: true, conversacion: fila.conversacion }
}

const SITIO = 'https://www.obrasdeteatro.com'

async function avisarMensaje(autorId: string, destinoId: string, conversacion: string, texto: string) {
  const { data } = await createServiceClient()
    .from('profiles').select('id, nombre, apellidos, nombre_artistico, email').in('id', [autorId, destinoId])
  const nombre = (p?: { nombre: string | null; apellidos: string | null; nombre_artistico: string | null }) =>
    p?.nombre_artistico?.trim() || [p?.nombre, p?.apellidos].filter(Boolean).join(' ').trim() || 'Un usuario'
  const autor = data?.find(p => p.id === autorId)
  const destino = data?.find(p => p.id === destinoId)
  if (!destino?.email) return
  const extracto = texto.length > 280 ? `${texto.slice(0, 280).trimEnd()}…` : texto
  await enviarAviso(
    destino.email,
    `${nombre(autor)} te ha escrito en ObrasDeTeatro®`,
    [
      `Hola, ${nombre(destino)}:`,
      `${nombre(autor)} te ha enviado un mensaje en ObrasDeTeatro®:`,
      `«${extracto}»`,
      `Léelo y responde aquí: ${SITIO}/perfil/mensajes?c=${conversacion}`,
      `Si no quieres recibir estos avisos, puedes desactivarlos en tu perfil: ${SITIO}/perfil/bloque/6`,
    ].join('\n\n'),
  )
}

/** Bloquea o desbloquea a un perfil en la mensajería. */
export async function cambiarBloqueo(perfilId: string, bloquear: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc(bloquear ? 'bloquear' : 'desbloquear', { p_perfil: perfilId })
  revalidatePath('/perfil/mensajes')
  return { ok: !error }
}

/** Marca como leídos los mensajes recibidos de una conversación. */
export async function marcarLeida(conversacionId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('marcar_conversacion_leida', { p_conversacion: conversacionId })
}
