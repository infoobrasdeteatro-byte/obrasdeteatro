import { LADO_LARGO_MAX, dimensionesReducidas } from './multimedia'

/**
 * Redimensiona una imagen en el navegador antes de subirla (lado largo ≤
 * 2000 px) y la convierte a WebP (o a JPEG si el navegador no sabe WebP).
 * Solo navegador: usa createImageBitmap y canvas.
 */
export async function redimensionarImagen(archivo: File, maximo: number = LADO_LARGO_MAX): Promise<{ blob: Blob; tipo: string; ext: string }> {
  const bitmap = await createImageBitmap(archivo)
  const { ancho, alto } = dimensionesReducidas(bitmap.width, bitmap.height, maximo)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no puede procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const aBlob = (tipo: string) => new Promise<Blob | null>(r => canvas.toBlob(r, tipo, 0.85))
  const webp = await aBlob('image/webp')
  if (webp && webp.type === 'image/webp') return { blob: webp, tipo: 'image/webp', ext: 'webp' }
  const jpeg = await aBlob('image/jpeg')
  if (!jpeg) throw new Error('No se pudo preparar la imagen.')
  return { blob: jpeg, tipo: 'image/jpeg', ext: 'jpg' }
}
