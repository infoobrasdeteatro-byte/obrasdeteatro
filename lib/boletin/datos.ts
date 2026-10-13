import { unstable_cache } from 'next/cache'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import type { ConfigBoletin } from './boletin'

const POR_DEFECTO: ConfigBoletin = { nombre: 'Proscenio', activo: false, acceso: 'todos', dia_envio: 4 }

/**
 * Configuración pública del boletín (nombre, si es para todos o solo de
 * pago). La lee el pie de página en todas las páginas: cacheada 10 minutos.
 * Si falla, el valor por defecto: el recuadro se pinta igual.
 */
const leer = unstable_cache(async (): Promise<ConfigBoletin> => {
  const { data, error } = await clienteAnonimo().from('boletin_config').select('nombre, activo, acceso, dia_envio').maybeSingle()
  if (error || !data) throw new Error(error?.message ?? 'sin configuración')
  return data
}, ['boletin-config'], { revalidate: 600, tags: ['boletin-config'] })

export async function configBoletin(): Promise<ConfigBoletin> {
  try { return await leer() } catch { return POR_DEFECTO }
}
