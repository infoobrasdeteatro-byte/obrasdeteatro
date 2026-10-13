'use server'

import { createServiceClient } from '@/lib/supabase/service'
import {
  ESPERA_REENVIO_MS, construirHtmlConfirmacion, crearTokenConfirmacion, emailValido, enviarCorreo,
  hashToken, normalizarEmail, verificarTokenBaja,
} from '@/lib/boletin/boletin'

export type EstadoSuscripcion = { ok: boolean; mensaje: string } | null

/** Mismo mensaje exista o no el correo: el formulario no revela quién está suscrito. */
const MENSAJE_OK = 'Te hemos enviado un correo para confirmar la suscripción. Revisa tu bandeja de entrada (y la carpeta de spam).'

/**
 * Alta en el boletín (primer paso del doble opt-in). Sin sesión. Guarda el
 * correo como «pendiente» y envía el enlace de confirmación; hasta que se
 * pulsa, no recibe nada.
 */
export async function suscribirse(_: EstadoSuscripcion, form: FormData): Promise<EstadoSuscripcion> {
  // Trampa para robots: un campo oculto que una persona deja vacío.
  if (String(form.get('web') ?? '').trim() !== '') return { ok: true, mensaje: MENSAJE_OK }

  const email = normalizarEmail(String(form.get('email') ?? ''))
  if (!emailValido(email)) return { ok: false, mensaje: 'Escribe un correo electrónico válido.' }
  if (form.get('consentimiento') !== 'on') return { ok: false, mensaje: 'Para suscribirte tienes que aceptar la política de privacidad.' }
  const origen = ['portada', 'pie'].includes(String(form.get('origen'))) ? String(form.get('origen')) : 'otro'

  const supabase = createServiceClient()
  const { data: config } = await supabase.from('boletin_config').select('nombre, acceso').maybeSingle()
  if (config?.acceso === 'pago') {
    return { ok: false, mensaje: 'Ahora mismo el boletín es exclusivo para los planes de pago. Puedes activarlo desde tu Centro Profesional.' }
  }
  const nombre = config?.nombre ?? 'La Semana Escénica'

  const { data: existente, error } = await supabase.from('boletin_suscriptores')
    .select('id, estado, confirmacion_enviada_at').eq('email', email).maybeSingle()
  if (error) return { ok: false, mensaje: 'No se pudo completar la suscripción. Inténtalo de nuevo en unos minutos.' }

  if (existente?.estado === 'confirmado') return { ok: true, mensaje: MENSAJE_OK }
  if (existente?.estado === 'pendiente' && existente.confirmacion_enviada_at &&
      Date.now() - new Date(existente.confirmacion_enviada_at).getTime() < ESPERA_REENVIO_MS) {
    return { ok: true, mensaje: MENSAJE_OK }
  }

  const { token, hash } = crearTokenConfirmacion()
  const ahora = new Date().toISOString()
  const fila = { estado: 'pendiente', token_confirmacion_hash: hash, confirmacion_enviada_at: ahora, consentimiento_at: ahora, baja_at: null, origen }
  const { error: e } = existente
    ? await supabase.from('boletin_suscriptores').update(fila).eq('id', existente.id)
    : await supabase.from('boletin_suscriptores').insert({ email, ...fila })
  if (e) return { ok: false, mensaje: 'No se pudo completar la suscripción. Inténtalo de nuevo en unos minutos.' }

  const ok = await enviarCorreo(email, `Confirma tu suscripción a ${nombre}`, construirHtmlConfirmacion(nombre, token), nombre)
  if (!ok) return { ok: false, mensaje: 'No pudimos enviarte el correo de confirmación. Inténtalo de nuevo en unos minutos.' }
  return { ok: true, mensaje: MENSAJE_OK }
}

const CADUCIDAD_CONFIRMACION_MS = 7 * 24 * 60 * 60 * 1000

/** Segundo paso: el botón de la página /boletin/confirmar (POST, no el GET del enlace). */
export async function confirmar(token: string): Promise<'hecha' | 'invalido' | 'error'> {
  if (!token || token.length > 100) return 'invalido'
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('boletin_suscriptores')
    .select('id, estado, confirmacion_enviada_at').eq('token_confirmacion_hash', hashToken(token)).maybeSingle()
  if (error) return 'error'
  if (!data || data.estado !== 'pendiente' || !data.confirmacion_enviada_at ||
      Date.now() - new Date(data.confirmacion_enviada_at).getTime() > CADUCIDAD_CONFIRMACION_MS) return 'invalido'
  const { error: e } = await supabase.from('boletin_suscriptores')
    .update({ estado: 'confirmado', confirmado_at: new Date().toISOString(), token_confirmacion_hash: null }).eq('id', data.id)
  return e ? 'error' : 'hecha'
}

/** Baja con el token firmado del correo. */
export async function darDeBaja(token: string | null): Promise<'hecha' | 'invalido' | 'error'> {
  const id = verificarTokenBaja(token)
  if (!id) return 'invalido'
  const { error } = await createServiceClient().from('boletin_suscriptores')
    .update({ estado: 'baja', baja_at: new Date().toISOString(), token_confirmacion_hash: null }).eq('id', id)
  return error ? 'error' : 'hecha'
}
