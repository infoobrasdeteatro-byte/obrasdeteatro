/**
 * Correo entrante: lo que hace el webhook de Resend (evento email.received).
 *
 * 1. Verifica la firma con RESEND_INBOUND_WEBHOOK_SECRET. Sin firma válida,
 *    401 y no se guarda nada.
 * 2. El aviso solo trae metadatos (Resend no incluye cuerpo ni cabeceras), así
 *    que pide el correo completo a GET /emails/receiving/{id}. Necesita una
 *    clave de Resend con permiso «Full access»: RESEND_RECEIVING_API_KEY, o
 *    RESEND_API_KEY si esa ya lo tiene.
 * 3. Idempotente: si ya está guardado (mismo resend_email_id), 200 sin repetir.
 *
 * Si la clave no tiene permiso (401/403), se guarda igualmente con lo que trae
 * el aviso y una nota interna que lo explica: así el correo no se pierde. Si
 * Resend falla de otra forma, 502 para que Resend reintente.
 *
 * Funciones puras más la escritura con el cliente de servicio, que se pasa
 * desde la ruta: así se prueba sin red ni base.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { verificarFirma, type CabecerasFirma } from './firma'
import { detectarOrigen, leerDirecciones, type Cabeceras } from './direcciones'
import { clasificar } from './clasificacion'

export const RESEND_API = 'https://api.resend.com'
const TIEMPO_MAX_MS = 8_000
/** Límites de lo que se guarda (un HTML con imágenes incrustadas puede ser enorme). */
export const MAX_HTML = 1_500_000
export const MAX_TEXTO = 200_000

type AdjuntoResend = { id?: string; filename?: string | null; content_type?: string | null; size?: number | null }

/** Aviso email.received (solo metadatos). */
export type AvisoResend = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    created_at?: string
    from?: string
    to?: string[]
    cc?: string[]
    subject?: string | null
    attachments?: AdjuntoResend[]
  }
}

/** GET /emails/receiving/{id}. */
export type CorreoResend = {
  id: string
  created_at?: string
  from?: string
  to?: string[]
  cc?: string[]
  subject?: string | null
  html?: string | null
  text?: string | null
  headers?: Cabeceras | null
  attachments?: AdjuntoResend[]
}

export type FilaCorreo = {
  resend_email_id: string
  recibido_at: string
  buzon: 'hola' | 'gmail' | 'otro'
  direccion_destino: string | null
  remitente_nombre: string | null
  remitente_email: string | null
  asunto: string | null
  texto: string | null
  html: string | null
  adjuntos: { nombre: string; tipo: string | null; tamano: number | null }[]
  categoria: 'persona' | 'servicio'
  nota_interna: string | null
}

export type Respuesta = { status: number; cuerpo: Record<string, unknown> }

const recortar = (s: string | null | undefined, max: number) => (s ? (s.length > max ? s.slice(0, max) : s) : null)

/** Puro: la fila que se guarda, a partir del correo completo (o solo del aviso). */
export function construirFila(id: string, c: Omit<CorreoResend, 'id'>, nota: string | null = null): FilaCorreo {
  const remitente = leerDirecciones(c.from ?? null)[0] ?? null
  const { buzon, destino } = detectarOrigen(c.headers, { to: c.to, cc: c.cc, from: c.from })
  const html = c.html && c.html.length <= MAX_HTML ? c.html : null
  const notas = [nota, c.html && !html ? 'El HTML era demasiado grande y no se guardó: se ve en el buzón original.' : null].filter(Boolean)
  return {
    resend_email_id: id,
    recibido_at: c.created_at && !Number.isNaN(Date.parse(c.created_at)) ? new Date(c.created_at).toISOString() : new Date().toISOString(),
    buzon,
    direccion_destino: destino,
    // «"ana@x.com" <ana@x.com>»: un nombre que es una dirección no es un nombre.
    remitente_nombre: remitente?.nombre && !remitente.nombre.includes('@') ? remitente.nombre.slice(0, 200) : null,
    remitente_email: remitente?.email.slice(0, 320) ?? null,
    asunto: recortar(c.subject?.trim(), 500),
    texto: recortar(c.text, MAX_TEXTO),
    html,
    adjuntos: (c.attachments ?? []).slice(0, 50).map(a => ({
      nombre: (a.filename || 'sin nombre').slice(0, 300),
      tipo: a.content_type ?? null,
      tamano: typeof a.size === 'number' ? a.size : null,
    })),
    categoria: clasificar(remitente?.email),
    nota_interna: notas.length ? notas.join(' ') : null,
  }
}

class ErrorResend extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

export async function recuperarCorreo(id: string, clave: string, fetcher: typeof fetch = fetch): Promise<CorreoResend> {
  const r = await fetcher(`${RESEND_API}/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${clave}`, accept: 'application/json' },
    signal: AbortSignal.timeout(TIEMPO_MAX_MS),
    cache: 'no-store',
  })
  if (!r.ok) throw new ErrorResend(`Resend respondió ${r.status}`, r.status)
  return r.json() as Promise<CorreoResend>
}

export type Entorno = {
  secreto: string | null | undefined
  clave: string | null | undefined
  servicio: SupabaseClient
  fetcher?: typeof fetch
  ahoraS?: number
}

export async function procesarAviso(cuerpo: string, firma: CabecerasFirma, e: Entorno): Promise<Respuesta> {
  if (!verificarFirma(cuerpo, firma, e.secreto, e.ahoraS)) {
    return { status: 401, cuerpo: { error: 'Firma no válida' } }
  }

  let aviso: AvisoResend
  try { aviso = JSON.parse(cuerpo) } catch { return { status: 400, cuerpo: { error: 'Cuerpo no válido' } } }
  if (aviso.type !== 'email.received') return { status: 200, cuerpo: { ignorado: aviso.type ?? null } }
  const id = aviso.data?.email_id
  if (!id || typeof id !== 'string') return { status: 400, cuerpo: { error: 'Falta email_id' } }

  const { data: existe, error: errorLectura } = await e.servicio
    .from('correos_entrantes').select('id').eq('resend_email_id', id).maybeSingle()
  if (errorLectura) return { status: 500, cuerpo: { error: 'No se pudo comprobar el correo' } }
  if (existe) return { status: 200, cuerpo: { duplicado: true } }

  let fila: FilaCorreo
  const metadatos = { ...aviso.data, created_at: aviso.data?.created_at ?? aviso.created_at }
  if (!e.clave?.trim()) {
    fila = construirFila(id, metadatos, 'Sin clave de Resend para leer el contenido (RESEND_RECEIVING_API_KEY): solo se guardaron los datos del aviso.')
  } else {
    try {
      const completo = await recuperarCorreo(id, e.clave.trim(), e.fetcher)
      fila = construirFila(id, { ...metadatos, ...completo, created_at: completo.created_at ?? metadatos.created_at })
    } catch (err) {
      if (err instanceof ErrorResend && (err.status === 401 || err.status === 403)) {
        fila = construirFila(id, metadatos, `La clave de Resend no puede leer correos recibidos (${err.status}): usa una con permiso «Full access» en RESEND_RECEIVING_API_KEY. Solo se guardaron los datos del aviso.`)
      } else {
        return { status: 502, cuerpo: { error: 'No se pudo recuperar el correo de Resend' } }
      }
    }
  }

  const { error } = await e.servicio.from('correos_entrantes').insert(fila)
  if (error) {
    // Dos avisos del mismo correo a la vez: el segundo choca con el UNIQUE.
    if ((error as { code?: string }).code === '23505') return { status: 200, cuerpo: { duplicado: true } }
    return { status: 500, cuerpo: { error: 'No se pudo guardar el correo' } }
  }
  return { status: 200, cuerpo: { guardado: true } }
}
