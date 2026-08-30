import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { partiallyAppliedCriteriaNote, unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'

/**
 * UX-001A (Sprint aprobado): un turno ya cerrado de la conversacion --
 * `content` es siempre el texto final ya mostrado al usuario (la pregunta
 * tal cual la escribio, o el `responseContent` ya resuelto de ScenaIA).
 * Vive en Prompt Composer porque es su unico consumidor real; el
 * Orquestador y la ruta HTTP solo lo transportan, sin interpretarlo.
 */
export interface ConversationTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

/**
 * Politica de procedencia del conocimiento (Bloque 3, autorizado por
 * Direccion 2026-08-29).
 *
 * ScenaIA puede hablar de teatro mas alla de lo que contenga el catalogo --
 * no queremos un asistente que solo sepa recitar filas de la base de datos.
 * Lo que NO puede es difuminar de donde procede cada cosa que dice. La
 * instruccion anterior autorizaba explicitamente "responde con tu
 * conocimiento general" ante conocimiento vacio, sin exigir que se
 * declarase: esa frase era el permiso formal para que una invencion
 * plausible llegara al usuario indistinguible de un dato real. Aqui ese
 * permiso se conserva, pero deja de ser silencioso.
 *
 * Las siete reglas cubren los cuatro estados que el sistema ya sabe
 * distinguir y transporta hasta este prompt:
 *
 *   - conocimiento del ecosistema recuperado -> reglas 1 y 2
 *   - criterio pedido y no cumplido por nada  -> regla 3
 *   - criterio aplicado solo en parte         -> regla 4 (consume la
 *     "Advertencia sobre el conocimiento anterior" que ya emite
 *     formatUnappliedCriteria, con su misma terminologia literal)
 *   - sin conocimiento del ecosistema         -> reglas 5 y 6
 *
 * La regla 7 no es de exactitud sino de producto: remitir al usuario a un
 * directorio externo para suplir lo que ObrasDeTeatro no tiene es
 * sustituir el ecosistema, no complementarlo.
 *
 * Personas figura ahora junto a Obras y Organizaciones: la instruccion
 * anterior enumeraba solo esos dos dominios porque se escribio antes de la
 * Fase Personas y nunca se actualizo -- el dominio existia para el motor y
 * no para el modelo.
 *
 * Sigue siendo exclusivamente instruccion al proveedor: no toca
 * interpretacion, ni recuperacion, ni ningun contrato.
 */
const SYSTEM_INSTRUCTIONS = [
  'Eres el asistente de ScenaIA dentro del ecosistema ObrasDeTeatro. Responde de forma util y concreta a la peticion del usuario.',
  '',
  'Reglas sobre lo que dices y de donde procede:',
  '1. Si recibes conocimiento real del ecosistema (Obras, Personas u Organizaciones), usalo SIEMPRE primero y apoya en el tu respuesta.',
  '2. Nunca inventes obras, personas, organizaciones, autores, ubicaciones, eventos ni ningun otro dato del ecosistema. Lo que no figure en el conocimiento recibido, no lo presentes como parte del catalogo.',
  '3. Si la peticion menciona un criterio concreto (un autor, un genero, una duracion, una ubicacion, un tipo de perfil) y el conocimiento recibido no contiene nada que lo cumpla, indicalo explicitamente en tu respuesta -- nunca presentes la lista general como si respondiera a ese criterio sin aclararlo.',
  '4. Si se te advierte de que el listado no esta filtrado o lo esta solo EN PARTE, di con claridad que parte de lo pedido no se ha podido aplicar, y ofrece igualmente lo que si tienes, sin atribuirle una caracteristica que no cumple.',
  '5. Puedes responder con tu conocimiento general cuando no recibas conocimiento del ecosistema o cuando la pregunta sea ajena al catalogo. Al hacerlo DEBES declararlo de forma inequivoca: di que esa informacion no procede del catalogo de ObrasDeTeatro.',
  '6. Nunca mezcles ambas procedencias de modo que el usuario no pueda distinguirlas: lo recuperado del ecosistema se presenta como tal; lo demas, como conocimiento general externo al catalogo.',
  '7. No remitas al usuario a directorios, plataformas, bases de datos ni servicios externos para suplir lo que ObrasDeTeatro no tenga. Si algo falta, dilo con naturalidad y ofrece lo que si hay.',
].join('\n')

type KnowledgeEntity = KnowledgeContext['knowledgeEntities'][number]

/** Etiqueta visible de una entidad -- misma regla que KnowledgeSummary, nunca un identificador interno. */
function labelOf(entity: KnowledgeEntity): string {
  return entity.domain === 'Obras' ? entity.data.title : entity.data.name
}

/**
 * Atributos reales ya recuperados de una entidad, en el orden fijo
 * declarado aqui. Solo se emite un atributo cuando existe y no es `null`
 * en el dato real -- nunca se rellena, nunca se aproxima, nunca se deriva.
 *
 * `synopsis` y `website` quedan deliberadamente fuera de esta version: son
 * campos de longitud no acotada cuyo envio al proveedor tiene impacto de
 * coste y de politica de producto, no de arquitectura. Su incorporacion es
 * una decision de Direccion, no de este cambio.
 */
function attributesOf(entity: KnowledgeEntity): string[] {
  const attributes: string[] = []

  if (entity.domain === 'Obras') {
    const work = entity.data
    if (work.author !== null) attributes.push(`autor: ${work.author}`)
    if (work.genre !== null) attributes.push(`genero: ${work.genre}`)
    if (work.year !== null) attributes.push(`ano: ${work.year}`)
    if (work.durationMinutes !== null) attributes.push(`duracion: ${work.durationMinutes} min`)
    if (work.castSizeMax !== null) attributes.push(`reparto maximo: ${work.castSizeMax}`)
    if (work.minAge !== null) attributes.push(`edad minima: ${work.minAge}`)
    if (work.language !== null) attributes.push(`idioma: ${work.language}`)
    return attributes
  }

  if (entity.domain === 'Personas') {
    const person = entity.data
    attributes.push(`perfil: ${person.profileType}`)
    if (person.city !== null) attributes.push(`ciudad: ${person.city}`)
    if (person.region !== null) attributes.push(`region: ${person.region}`)
    if (person.countryCode !== null) attributes.push(`pais: ${person.countryCode}`)
    if (person.isVerified) attributes.push('perfil verificado')
    // Segundo eje del modelo (Dominio x Funcion): solo se emite cuando el
    // dato la declara. Sin funcion derivada, ninguna inventada.
    if (entity.functions.length > 0) attributes.push(`funcion: ${entity.functions.join(', ')}`)
    return attributes
  }

  const organization = entity.data
  attributes.push(`tipo: ${organization.type}`)
  if (organization.countryCode !== null) attributes.push(`pais: ${organization.countryCode}`)
  if (entity.functions.length > 0) attributes.push(`funcion: ${entity.functions.join(', ')}`)
  return attributes
}

/**
 * Formatea el conocimiento real ya recuperado. `entryLabelsByDomain` sigue
 * siendo la unica fuente autorizada de *que* entidades existen -- nunca se
 * emite una etiqueta que no figure ya ahi (invariante original de
 * SCENAIA-002A, conservado intacto).
 *
 * Lo que este formateador anade es *como* se describe cada una de esas
 * etiquetas ya autorizadas: sus atributos reales, tomados de
 * `knowledgeEntities`, campo declarado del mismo contrato `KnowledgeContext`
 * que esta funcion ya recibia. No hay dato nuevo, ni fuente nueva, ni
 * recuperacion adicional -- solo deja de descartarse informacion que ya
 * estaba cargada en memoria (AE-CONV-03/04).
 *
 * Degradacion elegante conservada en los dos sentidos: sin etiquetas, la
 * seccion se omite por completo; y si ninguna etiqueta del dominio tiene
 * atributos reales asociados, la linea se emite exactamente en el formato
 * anterior a este cambio.
 */
function formatKnowledgeSection(knowledgeContext: KnowledgeContext): string | null {
  const { entryLabelsByDomain } = knowledgeContext.knowledgeSummary
  const { knowledgeEntities } = knowledgeContext
  const lines: string[] = []

  for (const domain of Object.keys(entryLabelsByDomain) as (keyof typeof entryLabelsByDomain)[]) {
    const labels = entryLabelsByDomain[domain]
    if (!labels || labels.length === 0) continue

    const described = labels.map((label) => {
      const entity = knowledgeEntities.find((item) => item.domain === domain && labelOf(item) === label)
      const attributes = entity === undefined ? [] : attributesOf(entity)
      return { label, attributes }
    })

    if (described.every((entry) => entry.attributes.length === 0)) {
      lines.push(`${domain}: ${labels.join(', ')}`)
      continue
    }

    lines.push(`${domain}:`)
    for (const { label, attributes } of described) {
      lines.push(attributes.length === 0 ? `- ${label}` : `- ${label} (${attributes.join('; ')})`)
    }
  }

  return lines.length > 0 ? lines.join('\n') : null
}

/**
 * Declara al proveedor de donde procede el conocimiento que acaba de
 * recibir: autoridad, fuente declarada, cuando se observo y hasta cuando
 * vale.
 *
 * Nunca inventa procedencia: se limita a transportar la que cada
 * `KnowledgeItem` ya trae. Una fuente ausente simplemente no se menciona --
 * jamas se sustituye por una atribucion generica. Sin esta seccion, un dato
 * verificado del catalogo y un dato de una fuente externa llegarian al
 * proveedor indistinguibles, y este no podria atribuir correctamente.
 */
function formatProvenance(knowledgeContext: KnowledgeContext): string | null {
  const { knowledgeEntities } = knowledgeContext
  if (knowledgeEntities.length === 0) return null

  const autoridades = [...new Set(knowledgeEntities.map((item) => item.provenance.authority))]
  const fuentes = [
    ...new Set(
      knowledgeEntities
        .map((item) => item.provenance.sourceName)
        .filter((nombre): nombre is string => nombre !== null)
    ),
  ]
  const observaciones = knowledgeEntities.map((item) => item.provenance.observedAt).sort()
  const caducidades = knowledgeEntities
    .map((item) => item.provenance.validUntil)
    .filter((fecha): fecha is string => fecha !== null)

  const lineas = [`Autoridad: ${autoridades.join(', ')}.`, `Observado: ${observaciones[0]}.`]

  if (fuentes.length > 0) lineas.push(`Fuentes declaradas: ${fuentes.join('; ')}.`)

  lineas.push(
    caducidades.length === 0
      ? 'Vigencia: conocimiento estable, sin fecha de caducidad.'
      : `Vigencia: parte de este conocimiento caduca (${[...new Set(caducidades)].sort()[0]} la mas proxima).`
  )

  return lineas.join('\n')
}

/**
 * Advierte al proveedor de los dominios cuyo criterio no se pudo reconocer.
 *
 * Se consulta `knowledgeLimitations` por coincidencia exacta con
 * `unfilteredCriteriaNote(domain)` -- el mismo booleano real ya calculado
 * por Knowledge Assets (`requestWasNarrowed`) que consume
 * direct-content-builder, nunca una heuristica sobre el numero de
 * resultados. Deliberadamente NO se transportan las demas limitaciones:
 * la nota generica de IA-003 se emite de forma incondicional y seria falsa
 * ante un listado que si se filtro, de modo que enviarla induciria al
 * proveedor a negar una relevancia real.
 *
 * Sin esta seccion, un listado sin filtrar llega al proveedor
 * indistinguible de uno filtrado: es la diferencia entre "estas son las
 * obras que cumplen tu criterio" y "no he sabido aplicar tu criterio, esto
 * es lo que hay".
 */
function formatUnappliedCriteria(knowledgeContext: KnowledgeContext): string | null {
  const { knowledgeDomains, knowledgeLimitations } = knowledgeContext
  const lineas: string[] = []

  for (const domain of knowledgeDomains) {
    if (knowledgeLimitations.includes(unfilteredCriteriaNote(domain))) {
      lineas.push(`${domain}: el listado NO esta filtrado por el criterio pedido.`)
      continue
    }

    if (knowledgeLimitations.includes(partiallyAppliedCriteriaNote(domain))) {
      lineas.push(
        `${domain}: el listado esta filtrado solo EN PARTE -- alguno de los criterios pedidos no se ha podido aplicar.`
      )
    }
  }

  return lineas.length > 0 ? lineas.join('\n') : null
}

/**
 * Formatea el historial ya cerrado de la conversacion (UX-001A) -- cada
 * turno tal cual se muestra al usuario, nunca reinterpretado. Ausencia de
 * historial (array vacio, primera pregunta de la sesion) se trata igual
 * que ausencia de conocimiento: la seccion se omite por completo.
 */
function formatHistory(conversationHistory: readonly ConversationTurn[]): string | null {
  if (conversationHistory.length === 0) return null

  return conversationHistory.map((turn) => `${turn.role === 'user' ? 'Usuario' : 'ScenaIA'}: ${turn.content}`).join('\n')
}

/**
 * Unico punto de entrada del Prompt Composer (SCENAIA-002A, Plan Tecnico
 * aprobado; tercer parametro anadido en UX-001A, Sprint aprobado --
 * reapertura minima, mismo patron ya usado antes en composeResponse()
 * (IA-008) y en el contrato de entrada de AI Gateway (IA de integracion
 * del proveedor, 002). Funcion pura y determinista: misma
 * entrada, misma salida, siempre -- sin I/O, sin acceso a persistencia,
 * sin variables de entorno, sin conocer proveedor ni modelo. Transforma
 * exclusivamente datos ya calculados por Request Interpreter y ScenaIA
 * Knowledge Model, mas el historial ya construido por el cliente y
 * transportado sin interpretar por el Orquestador -- ninguno de los 7
 * componentes del Nucleo conoce ni necesita conocer este historial.
 *
 * Degradacion elegante (regla explicita del expediente, extendida a
 * historial): si no hay ninguna entidad real recuperada para ningun
 * dominio, o no hay historial previo (primera pregunta), la seccion
 * correspondiente se omite por completo -- nunca se rellena con datos
 * inventados.
 */
export function composePrompt(
  normalizedRequest: NormalizedRequest,
  knowledgeContext: KnowledgeContext,
  conversationHistory: readonly ConversationTurn[] = []
): string {
  const knowledgeSection = formatKnowledgeSection(knowledgeContext)
  const provenanceSection = formatProvenance(knowledgeContext)
  const unappliedSection = formatUnappliedCriteria(knowledgeContext)
  const historySection = formatHistory(conversationHistory)

  const parts = [SYSTEM_INSTRUCTIONS]

  if (knowledgeSection !== null) {
    parts.push(`Conocimiento real disponible del ecosistema:\n${knowledgeSection}`)
  }

  if (provenanceSection !== null) {
    parts.push(`Procedencia de ese conocimiento:\n${provenanceSection}`)
  }

  if (unappliedSection !== null) {
    parts.push(`Advertencia sobre el conocimiento anterior:\n${unappliedSection}`)
  }

  if (historySection !== null) {
    parts.push(`Historial de la conversacion (turnos anteriores, para mantener continuidad):\n${historySection}`)
  }

  parts.push(`Peticion del usuario: ${normalizedRequest.originalRequest}`)

  return parts.join('\n\n')
}
