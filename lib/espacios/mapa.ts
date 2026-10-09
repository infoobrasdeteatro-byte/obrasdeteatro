import { etiquetaTipo, rutaFicha, type EspacioTarjeta } from './espacios'

/**
 * Datos y configuración del mapa de espacios (components/espacios/MapaEspacios).
 *
 * Teselas: OpenFreeMap (https://openfreemap.org), instancia pública. Sin
 * registro, sin clave, sin cookies y sin límite de visitas; uso comercial
 * permitido. Sin garantía de servicio («as-is», pueden cerrarlo sin aviso).
 * Atribución obligatoria de OpenMapTiles y OpenStreetMap, que el estilo trae
 * en el control de atribución de MapLibre.
 */
export const ESTILO_OPENFREEMAP = 'https://tiles.openfreemap.org/styles/positron'

export function estiloMapa(): string {
  return ESTILO_OPENFREEMAP
}

/** Worker de MapLibre copiado por scripts/copiar-maplibre-worker.mjs. */
export function urlWorker(version: string): string {
  return `/vendor/maplibre-gl/${version}/maplibre-gl-worker.mjs`
}

export type PuntoMapa = { lat: number; lon: number; nombre: string; tipo: string; url: string }

/** Puntos del mapa: solo con coordenadas válidas y lo mínimo para la ventana. */
export function puntosDe(lista: Pick<EspacioTarjeta, 'lat' | 'lon' | 'nombre' | 'tipo' | 'slug'>[]): PuntoMapa[] {
  return lista
    .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lon) && Math.abs(e.lat) <= 90 && Math.abs(e.lon) <= 180)
    .map(e => ({ lat: e.lat, lon: e.lon, nombre: e.nombre, tipo: etiquetaTipo(e.tipo), url: rutaFicha(e.slug) }))
}
