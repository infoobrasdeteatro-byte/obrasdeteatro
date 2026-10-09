import { createHmac } from 'node:crypto'

/**
 * Hash de la IP para el límite de sugerencias (3 por hora por conexión).
 *
 * Nunca se guarda la IP: solo HMAC-SHA256 con un secreto del servidor, así el
 * hash no se puede invertir probando las 4.300 millones de IPv4. El secreto es
 * SUGERENCIAS_IP_SECRET; si no existe, la clave de servicio de Supabase, que
 * ya está en el servidor (cambiarla solo reinicia los contadores). La base
 * borra el hash a las 24 horas.
 */
export function ipDeLaPeticion(cabeceras: Headers): string {
  // En Vercel, x-real-ip es la IP del cliente; x-forwarded-for, su respaldo.
  const real = cabeceras.get('x-real-ip')?.trim()
  if (real) return real
  const reenviada = cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim()
  return reenviada || 'desconocida'
}

export function hashIp(ip: string, secreto: string | undefined = process.env.SUGERENCIAS_IP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY): string {
  if (!secreto) throw new Error('Falta SUGERENCIAS_IP_SECRET (o SUPABASE_SERVICE_ROLE_KEY) para el hash de la IP')
  return createHmac('sha256', secreto).update(`espacios-sugerencias:${ip}`).digest('hex')
}
