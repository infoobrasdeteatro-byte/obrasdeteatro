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
export const AI_PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    /**
     * Tarifas oficiales publicadas por el proveedor, consultadas en
     * developers.openai.com el 2026-08-31. No son una estimacion ni una
     * media: son el precio publicado, copiado sin interpretar.
     *
     * Este es el UNICO punto del repositorio donde vive un precio de
     * proveedor. Que el catalogo sea la unica fuente no es una comodidad:
     * es lo que permite que cambiar de proveedor sea anadir una entrada, y
     * que una subida de tarifas no obligue a tocar la contabilidad.
     *
     * El precio de entrada CACHEADA que el proveedor tambien publica
     * (0,075 por millon) no figura aqui deliberadamente: no existe todavia
     * ningun mecanismo de cache de prompt en el sistema, y declarar una
     * tarifa que nada puede consumir representaria un estado que ningun
     * dominio respalda.
     */
    rates: [
      {
        model: 'gpt-4o-mini',
        inputPricePerMillionTokens: 0.15,
        outputPricePerMillionTokens: 0.6,
        currency: 'USD',
        pricingUnit: 'PER_MILLION_TOKENS',
        effectiveFrom: '2026-08-31',
      },
    ],
  },
]
