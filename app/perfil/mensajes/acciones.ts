'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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

  revalidatePath('/perfil/mensajes')
  return { ok: true, conversacion: fila.conversacion }
}

/** Marca como leídos los mensajes recibidos de una conversación. */
export async function marcarLeida(conversacionId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('marcar_conversacion_leida', { p_conversacion: conversacionId })
}
