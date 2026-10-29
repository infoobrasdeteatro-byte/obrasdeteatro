/**
 * Firma de los webhooks de Resend (esquema de Svix, que es lo que usa Resend).
 *
 * Cabeceras: svix-id, svix-timestamp (segundos) y svix-signature, con una o
 * varias firmas separadas por espacios, cada una «v1,<base64>». Se firma
 * «<id>.<timestamp>.<cuerpo exacto>» con HMAC-SHA256 y la clave del webhook
 * («whsec_<base64>», se usan los bytes tras el prefijo). Se rechaza un aviso
 * con más de 5 minutos de diferencia para impedir que se reenvíe uno viejo.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export const TOLERANCIA_S = 5 * 60

export type CabecerasFirma = { id: string | null; timestamp: string | null; firma: string | null }

export function firmar(secreto: string, id: string, timestamp: string, cuerpo: string): string {
  const clave = Buffer.from(secreto.startsWith('whsec_') ? secreto.slice(6) : secreto, 'base64')
  return createHmac('sha256', clave).update(`${id}.${timestamp}.${cuerpo}`).digest('base64')
}

export function verificarFirma(
  cuerpo: string,
  c: CabecerasFirma,
  secreto: string | null | undefined,
  ahoraS: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!secreto?.trim() || !c.id || !c.timestamp || !c.firma) return false
  const ts = Number(c.timestamp)
  if (!Number.isInteger(ts) || Math.abs(ahoraS - ts) > TOLERANCIA_S) return false

  const esperada = Buffer.from(firmar(secreto.trim(), c.id, c.timestamp, cuerpo))
  return c.firma.split(' ').some(parte => {
    const [version, valor] = parte.split(',', 2)
    if (version !== 'v1' || !valor) return false
    const recibida = Buffer.from(valor)
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada)
  })
}
