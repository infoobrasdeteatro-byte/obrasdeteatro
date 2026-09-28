import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import type { ListingPage } from './types'

/**
 * SCENAIA-004B §4.1 y §4.2 -- paginacion visible del listado puro.
 *
 * Constantes UNICAS: el tamano de pagina y el desplazamiento maximo se
 * definen aqui y en ningun otro sitio. El Orquestador pasa el tamano como
 * dato a Scenaia Knowledge Model y a Knowledge Assets, que no lo definen.
 * Ajustar cualquiera de las dos cifras es cambiar esta linea y nada mas.
 */
export const LISTADO_TAMANO_PAGINA = 10

/**
 * Por que 50.000: en un catalogo de 50.000 obras la ultima pagina empieza en
 * 49.990, de modo que un desplazamiento mayor no corresponde a ninguna pagina
 * real de esa escala. Acota ademas el coste de los desplazamientos profundos.
 * Se sube aqui cuando el catalogo se acerque a la cifra (SCENAIA-004B §4.2).
 * La ruta la usa para validar la continuacion (400 por encima de ella).
 */
export const LISTADO_DESPLAZAMIENTO_MAXIMO = 50_000

/**
 * Valores que encienden la paginacion. Lista CERRADA, mismo criterio que el
 * interruptor del streaming (`app/api/scenaia-verified/ndjson.ts`): cualquier
 * otra cosa -- vacia, ausente, 'si', '0', un error de escritura -- la deja
 * apagada. Ante la duda, el comportamiento de siempre.
 */
const VALORES_ENCENDIDO = ['1', 'true']

/**
 * Interruptor SCENAIA_PAGINACION_ENABLED, apagado por defecto. Se lee en
 * cada peticion, no al cargar el modulo, de modo que puede cambiarse
 * redesplegando la misma version, sin tocar codigo.
 */
export function paginacionActivada(): boolean {
  return VALORES_ENCENDIDO.includes((process.env.SCENAIA_PAGINACION_ENABLED ?? '').trim().toLowerCase())
}

/** Pagina entregada, tal como la transporta el conocimiento (SCENAIA-004B §4.4). */
type PaginaEntregada = NonNullable<KnowledgeContext['worksPage']>

/**
 * SCENAIA-004B §4.7 -- traduce la pagina entregada a lo que necesita la
 * interfaz. `from`/`to` son posiciones de 1 en adelante; en una pagina vacia
 * `to` queda por debajo de `from` (cero obras).
 *
 * `nextOffset` es `null` cuando no hay mas obras:
 *   - con total, si `to >= total`;
 *   - con total no determinado, si la pagina no vino llena;
 *   - y siempre que la pagina venga vacia, o que el desplazamiento siguiente
 *     supere `LISTADO_DESPLAZAMIENTO_MAXIMO`: la ruta lo rechazaria con un
 *     400, y ofrecer un "Ver mas" que va a fallar seria enganar.
 */
export function listingPageOf(pagina: PaginaEntregada): ListingPage {
  const from = pagina.offset + 1
  const to = pagina.offset + pagina.returned
  const hayMas =
    pagina.returned > 0 &&
    (pagina.total !== null ? to < pagina.total : pagina.returned >= pagina.pageSize) &&
    to <= LISTADO_DESPLAZAMIENTO_MAXIMO

  return { from, to, total: pagina.total, nextOffset: hayMas ? to : null }
}
