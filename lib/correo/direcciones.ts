/**
 * Correo entrante: de qué buzón viene una copia y a qué dirección escribió el
 * remitente. Funciones puras.
 *
 * Arsys (hola@, y las que redirigen a él) y Gmail (info.obrasdeteatro@gmail.com)
 * reenvían una copia a panel@buzon.obrasdeteatro.com. En la copia, el «To» de
 * Resend es esa dirección del panel; la original queda en las cabeceras:
 * To / Cc tal como las escribió el remitente, y además Delivered-To,
 * X-Original-To, X-Forwarded-To o X-Forwarded-For según quién reenvíe
 * (Gmail pone X-Forwarded-For con la cuenta de origen).
 */

export const DOMINIO_PROPIO = 'obrasdeteatro.com'
export const GMAIL_PROPIO = 'info.obrasdeteatro@gmail.com'
/** Remitente de los correos de verificación del reenvío de Gmail. */
export const GMAIL_VERIFICACION = 'forwarding-noreply@google.com'

export type Buzon = 'hola' | 'gmail' | 'otro'

/** Etiqueta de cada dirección propia, por su parte local. */
const ETIQUETAS: Record<string, string> = {
  hola: 'Hola',
  info: 'Info',
  legal: 'Legal',
  comercial: 'Comercial',
  facturacion: 'Facturación',
  protecciondatos: 'Protección de datos',
}

export type Direccion = { nombre: string | null; email: string }

/**
 * «Ana Ruiz <ana@x.com>, "Ruiz, Ana" <b@y.es>, c@z.org» → direcciones. Tolera
 * comillas, comas dentro del nombre y valores sin nombre.
 */
export function leerDirecciones(valor: string | string[] | null | undefined): Direccion[] {
  if (!valor) return []
  const texto = Array.isArray(valor) ? valor.join(', ') : valor
  const salida: Direccion[] = []
  const re = /(?:"((?:[^"\\]|\\.)*)"|([^<>",]*?))\s*<([^<>\s]+@[^<>\s]+)>|([^\s<>",;]+@[^\s<>",;]+)/g
  for (const m of texto.matchAll(re)) {
    const email = (m[3] ?? m[4] ?? '').trim().toLowerCase()
    if (!email) continue
    const nombre = (m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1').trim()
    salida.push({ nombre: nombre || null, email })
  }
  return salida
}

const dominio = (email: string) => email.slice(email.lastIndexOf('@') + 1)
const local = (email: string) => email.slice(0, email.lastIndexOf('@'))

/** Dirección del propio dominio (no la del subdominio del panel). */
export const esPropia = (email: string) => dominio(email) === DOMINIO_PROPIO
export const esGmailPropio = (email: string) => email === GMAIL_PROPIO

/** «Legal», «Comercial»…, «Gmail», o null si no es una dirección propia conocida. */
export function etiquetaDestino(email: string | null | undefined): string | null {
  if (!email) return null
  if (esGmailPropio(email)) return 'Gmail'
  if (esPropia(email)) return ETIQUETAS[local(email)] ?? null
  return null
}

export type Cabeceras = Record<string, string | string[] | null | undefined>

/** Cabeceras con los nombres en minúsculas (Resend las da así, pero por si acaso). */
const normalizar = (c: Cabeceras | null | undefined): Cabeceras =>
  Object.fromEntries(Object.entries(c ?? {}).map(([k, v]) => [k.toLowerCase(), v]))

export type Origen = { buzon: Buzon; destino: string | null }

/**
 * Buzón y dirección de destino de una copia reenviada.
 *
 * - destino: la primera dirección propia que escribió el remitente en To o
 *   Cc; si no hay (copia oculta), la de Delivered-To / X-Original-To; si
 *   tampoco, la primera del To.
 * - buzón: Gmail si su reenvío lo dice (X-Forwarded-For con la cuenta) o si
 *   es su correo de verificación; hola si hay cualquier dirección del dominio
 *   propio; Gmail si solo aparece la cuenta de Gmail; si no, otro.
 */
export function detectarOrigen(
  cabecerasCrudas: Cabeceras | null | undefined,
  extra: { to?: string[] | string | null; cc?: string[] | string | null; from?: string | null } = {},
): Origen {
  const c = normalizar(cabecerasCrudas)
  const visibles = [...leerDirecciones(c.to ?? extra.to), ...leerDirecciones(c.cc ?? extra.cc)].map(d => d.email)
  const entrega = ['x-original-to', 'delivered-to', 'x-forwarded-to', 'envelope-to', 'x-envelope-to']
    .flatMap(k => leerDirecciones(c[k])).map(d => d.email)
  const reenvioGmail = leerDirecciones(c['x-forwarded-for']).map(d => d.email)
  const remitente = leerDirecciones(c.from ?? extra.from)[0]?.email ?? null

  const todas = [...visibles, ...entrega, ...reenvioGmail]
  const propia = (e: string) => esPropia(e) || esGmailPropio(e)

  let buzon: Buzon = 'otro'
  if (reenvioGmail.some(esGmailPropio) || remitente === GMAIL_VERIFICACION) buzon = 'gmail'
  else if (todas.some(esPropia)) buzon = 'hola'
  else if (todas.some(esGmailPropio)) buzon = 'gmail'

  const preferida = buzon === 'gmail' ? visibles.find(esGmailPropio) : undefined
  const destino = preferida
    ?? visibles.find(propia)
    ?? entrega.find(propia)
    ?? reenvioGmail.find(propia)
    ?? visibles[0]
    ?? null
  return { buzon, destino }
}

export const ETIQUETA_BUZON: Record<Buzon, string> = { hola: 'hola@', gmail: 'Gmail', otro: 'Otro' }
