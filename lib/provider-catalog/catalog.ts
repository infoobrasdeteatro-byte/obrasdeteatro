import type { ProviderCatalogEntry } from './types'

/**
 * Catalogo oficial de proveedores de IA (Decision de Direccion -- Cierre
 * de IA-006). Propiedad exclusiva de Direccion: su contenido se
 * incorpora, retira o modifica mediante actualizacion aprobada por
 * Direccion, sin alterar la arquitectura del Nucleo (Decision de
 * Direccion, Punto 6). Primer proveedor incorporado por Autorizacion
 * Oficial de Implementacion, expediente IA-OPENAI-001 (2026-07-23) -- el
 * `id` debe coincidir exactamente con `providerId` del adaptador
 * registrado en `lib/ai-gateway/provider-registry.ts`.
 */
export const AI_PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [{ id: 'openai', name: 'OpenAI' }]
