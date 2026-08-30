import { listPublishedWorkAuthors, listOrganizationLocations, listPersonLocations } from '@/lib/repository-layer'
import { listWorkKnowledge } from './works-knowledge'
import { resolveWorkOccupancy } from './interpret-work-query'
import type { WorkSlotOccupancy } from './interpret-work-query'
import { listOrganizationKnowledge } from './organizations-knowledge'
import { listPersonKnowledge } from './persons-knowledge'
import { interpretPersonQuery, hasUnresolvedPersonLocation } from './interpret-person-query'
import { interpretWorkQuery, hasUnresolvedAuthor } from './interpret-work-query'
import { interpretOrganizationQuery, hasUnresolvedLocation } from './interpret-organization-query'
import type { KnowledgeDomain, StructuredKnowledgeItem } from './types'

/**
 * Resultado de recuperar un dominio (SCENAIA-002, correccion definitiva de
 * Caso 1). `requestWasNarrowed` es el mismo booleano real ya calculado en el
 * momento de interpretar la peticion -- true solo cuando el motor de
 * interpretacion del dominio reconocio al menos un criterio explicito en el
 * texto y acoto la recuperacion en funcion de el (hoy interpretan Obras,
 * Organizaciones y Personas; cualquier dominio sin motor propio devuelve
 * siempre false, porque nunca deriva ningun criterio del texto). Nombrado
 * de forma neutra respecto al mecanismo concreto (reglas declarativas sobre
 * WorkSearchCriteria hoy; cualquier otro mecanismo futuro manana) --
 * representa el hecho de dominio "la peticion acoto el resultado", no la
 * tecnica que lo logro. Nunca se reconstruye a partir del numero de
 * resultados en ninguna capa posterior -- Decision de Direccion, SCENAIA-002
 * Caso 1: la informacion real debe preservarse, no reinferirse.
 */
export interface KnowledgeRetrievalResult {
  readonly items: readonly StructuredKnowledgeItem[]
  /** Se aplico AL MENOS un criterio real sobre la consulta del usuario. */
  readonly requestWasNarrowed: boolean
  /**
   * Criterios que el usuario SI pidio y que NO se han podido aplicar --
   * porque el modelo no los representa o porque su valor no existe en el
   * catalogo. Vacio significa "no quedo nada pendiente", nunca "no se pidio
   * nada": esa distincion la aporta `requestWasNarrowed` (PRD-001, cada
   * estado del dominio representado explicitamente).
   *
   * Los cuatro estados posibles quedan asi separados sin ambiguedad:
   *   narrowed=true,  unapplied=[]   -> criterio COMPLETO
   *   narrowed=true,  unapplied=[..] -> criterio PARCIAL
   *   narrowed=false, unapplied=[..] -> criterio pedido, NINGUNO aplicable
   *   narrowed=false, unapplied=[]   -> SIN criterio: no hay nada que advertir
   */
  readonly unappliedCriteria: readonly string[]
  /**
   * Ranuras del dominio Obras que quedan VIGENTES tras este turno (Fase 3).
   *
   * Es el contexto que sobrevive al turno, y se emite aqui porque este es
   * el unico punto que lo conoce: quien lo almacena no sabe interpretar
   * lenguaje, y quien lo interpreta no debe saber que existe una
   * conversacion. Un objeto vacio significa "ninguna dimension acotada",
   * estado real y explicito, nunca un marcador de ausencia.
   *
   * Los dominios sin modelo de ranuras devuelven siempre vacio: declarar
   * ranuras que no existen representaria un estado que ningun dominio
   * respalda todavia (Principio de Madurez de la Abstraccion).
   */
  readonly workOccupancy: WorkSlotOccupancy
}

/**
 * Contrato interno de recuperacion semantica (IA-003, Plan Tecnico
 * aprobado 2026-07-22). Nunca se exporta fuera de este modulo -- Knowledge
 * Assets es el unico responsable de proporcionar conocimiento al resto del
 * sistema (Decision de Direccion, Punto 4). La interfaz garantiza
 * estabilidad de contrato, no la existencia de relevancia: la ordenacion
 * por relevancia depende de las capacidades de la implementacion concreta.
 */
export interface SemanticRetriever {
  retrieve(
    domain: KnowledgeDomain,
    query: string,
    limit?: number,
    previousOccupancy?: WorkSlotOccupancy
  ): Promise<KnowledgeRetrievalResult>
}

/**
 * Implementacion base (v1): sin tecnologia de recuperacion semantica real
 * (embeddings/vectores/RAG). Obras, Organizaciones y Personas interpretan ya
 * `query` mediante reglas declarativas sobre el modelo relacional existente
 * (ADR SCENAIA-002C.1), nunca mediante IA; cada uno con su propio motor,
 * sobre sus propias columnas y su propio vocabulario, sin traducir criterios
 * de un dominio a otro. Nunca lanza excepcion.
 * Sustituible en el futuro por una implementacion tecnologica real sin
 * cambiar esta interfaz (independencia tecnologica, Decision de Direccion,
 * Puntos 2 y 3).
 */
async function baseRetrieve(
  domain: KnowledgeDomain,
  query: string,
  limit?: number,
  previousOccupancy: WorkSlotOccupancy = {}
): Promise<KnowledgeRetrievalResult> {
  switch (domain) {
    case 'Obras': {
      const knownAuthors = await listPublishedWorkAuthors()
      // Las ranuras vigentes del turno anterior son el punto de partida; el
      // turno actual solo sobrescribe las dimensiones que menciona.
      const workOccupancy = resolveWorkOccupancy(query, previousOccupancy)
      const criteria = interpretWorkQuery(query, knownAuthors, previousOccupancy)
      const items = await listWorkKnowledge(criteria, limit)
      // Obras distingue ya los cuatro estados, igual que Organizaciones: sabe
      // cuando el usuario atribuyo una obra a alguien que no esta en el
      // catalogo, y lo separa de "no se pidio ningun criterio".
      const unappliedCriteria = hasUnresolvedAuthor(query, criteria) ? ['autor'] : []

      return { items, requestWasNarrowed: Object.keys(criteria).length > 0, unappliedCriteria, workOccupancy }
    }
    case 'Organizaciones': {
      const knownLocations = await listOrganizationLocations()
      const criteria = interpretOrganizationQuery(query, knownLocations)
      const items = await listOrganizationKnowledge(criteria, limit)

      // Organizaciones si distingue los cuatro estados: sabe cuando el
      // usuario pidio una ubicacion que no ha podido resolver.
      const unappliedCriteria = hasUnresolvedLocation(query, criteria) ? ['ubicacion'] : []

      return { items, requestWasNarrowed: Object.keys(criteria).length > 0, unappliedCriteria, workOccupancy: {} }
    }
    case 'Personas': {
      const knownLocations = await listPersonLocations()
      const criteria = interpretPersonQuery(query, knownLocations)
      const items = await listPersonKnowledge(criteria, limit)

      // Mismo contrato de cuatro estados que Obras y Organizaciones: la
      // ubicacion pedida y no resuelta queda declarada, nunca silenciada.
      const unappliedCriteria = hasUnresolvedPersonLocation(query, criteria) ? ['ubicacion'] : []

      return { items, requestWasNarrowed: Object.keys(criteria).length > 0, unappliedCriteria, workOccupancy: {} }
    }
    default:
      return { items: [], requestWasNarrowed: false, unappliedCriteria: [], workOccupancy: {} }
  }
}

const baseSemanticRetriever: SemanticRetriever = { retrieve: baseRetrieve }

/**
 * Unico punto de acceso publico a la capacidad de recuperacion semantica.
 * Delega en la implementacion activa (base, v1) sin exponerla.
 */
export async function retrieveRelevantKnowledge(
  domain: KnowledgeDomain,
  query: string,
  limit?: number,
  previousOccupancy?: WorkSlotOccupancy
): Promise<KnowledgeRetrievalResult> {
  return baseSemanticRetriever.retrieve(domain, query, limit, previousOccupancy)
}
