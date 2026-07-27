import { AI_PROVIDER_CATALOG } from '@/lib/provider-catalog'
import type { ProviderCatalogEntry } from '@/lib/provider-catalog'

/**
 * Unico punto de seleccion de proveedor de IA (Decision de Direccion --
 * Cierre de IA-006): selecciona exclusivamente del catalogo oficial,
 * nunca de una fuente ajena a el. Catalogo vacio hoy -- ningun proveedor
 * aprobado todavia -- por lo que la seleccion es siempre null hasta que
 * Direccion incorpore entradas.
 */
export function selectRecommendedProvider(
  catalog: readonly ProviderCatalogEntry[] = AI_PROVIDER_CATALOG
): string | null {
  return catalog.length === 0 ? null : catalog[0].id
}
