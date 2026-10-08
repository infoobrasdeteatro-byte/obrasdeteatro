import { BUCKET_GALERIA } from './multimedia'

export type ElementoRetirable =
  | { tipo: 'foto'; id: string; ruta: string }
  | { tipo: 'video'; id: string }
  | { tipo: 'proyecto'; id: string; imagen_ruta: string | null }

const TABLA = { foto: 'perfil_galeria_fotos', video: 'perfil_galeria_videos', proyecto: 'perfil_portfolio' } as const

/** Qué archivos del bucket «galeria» hay que borrar con el elemento. */
export function archivosDe(e: ElementoRetirable): string[] {
  if (e.tipo === 'foto') return [e.ruta]
  if (e.tipo === 'proyecto' && e.imagen_ruta) return [e.imagen_ruta]
  return []
}

type ClienteMinimo = {
  storage: { from: (bucket: string) => { remove: (rutas: string[]) => Promise<{ error: { message: string } | null }> } }
  from: (tabla: string) => { delete: () => { eq: (col: string, v: string) => Promise<{ error: { message: string } | null }> } }
}

/**
 * Retira un elemento desde /admin/galeria: borra primero el archivo y después
 * la fila. En ese orden porque el bucket es público: si se borrara la fila y
 * fallara el archivo, la imagen seguiría accesible por su URL sin que nada lo
 * indicara. Si falla el archivo, la fila no se toca y se avisa.
 *
 * Con la sesión del moderador: deciden las políticas «Moderación: retirada»
 * de las tablas y «Galería: moderación retira» del bucket.
 */
export async function retirarElemento(supabase: ClienteMinimo, e: ElementoRetirable): Promise<string | null> {
  const archivos = archivosDe(e)
  if (archivos.length > 0) {
    const { error } = await supabase.storage.from(BUCKET_GALERIA).remove(archivos)
    if (error) return `No se pudo borrar el archivo: ${error.message}`
  }
  const { error } = await supabase.from(TABLA[e.tipo]).delete().eq('id', e.id)
  if (error) return `No se pudo borrar la fila: ${error.message}`
  return null
}
