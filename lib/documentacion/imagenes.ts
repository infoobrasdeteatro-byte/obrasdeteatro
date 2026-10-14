import sharp from 'sharp'

/**
 * Imágenes para el PDF. @react-pdf solo pinta JPEG y PNG, y las fotos del
 * perfil pueden ser WebP: se descargan y se pasan a JPEG con sharp, ya
 * reducidas al tamaño en que se imprimen (el PDF pesa mucho menos).
 *
 * Solo se descargan URLs de nuestro almacenamiento de Supabase y de las
 * fotos de Google (avatar del inicio de sesión con Google): nunca una URL
 * arbitraria escrita en el perfil. Cualquier fallo devuelve null y el
 * documento sale sin esa imagen.
 */

const TIEMPO_MAX_MS = 8000
const BYTES_MAX = 8 * 1024 * 1024

export type ImagenPdf = { data: Buffer; format: 'jpg' }

export function urlPermitida(url: string | null | undefined, supabaseUrl: string): boolean {
  if (!url) return false
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (u.protocol !== 'https:') return false
  const propio = new URL(supabaseUrl)
  if (u.host === propio.host) return u.pathname.startsWith('/storage/v1/object/public/')
  return u.host.endsWith('.googleusercontent.com')
}

export async function imagenParaPdf(url: string | null | undefined, ladoMax: number): Promise<ImagenPdf | null> {
  if (!urlPermitida(url, process.env.NEXT_PUBLIC_SUPABASE_URL!)) return null
  try {
    const res = await fetch(url!, { signal: AbortSignal.timeout(TIEMPO_MAX_MS) })
    if (!res.ok) return null
    const largo = Number(res.headers.get('content-length') ?? 0)
    if (largo > BYTES_MAX) return null
    const bruto = Buffer.from(await res.arrayBuffer())
    if (bruto.length > BYTES_MAX) return null
    const data = await sharp(bruto, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: ladoMax, height: ladoMax, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
    return { data, format: 'jpg' }
  } catch {
    return null
  }
}
